# Background Workers Agent - Strands

Deploy an AI agent that uses Node.js Worker Threads to handle CPU-blocking tasks without freezing the main thread. This demonstrates how to keep your agent responsive and able to accept new requests while performing blocking operations like loops, dataset processing, cryptographic operations, or complex calculations.

## What This Sample Demonstrates

- **Worker Threads for Blocking Tasks**: Offload CPU-blocking operations (loops, data processing, calculations) to separate threads
- **Non-Blocking Architecture**: Main thread stays responsive and accepts new requests while workers process
- **Concurrent Request Handling**: Agent can handle multiple requests simultaneously without blocking
- **Message Passing**: Communication between main thread and worker threads via events
- **Health Status Tracking**: Agent status changes from `Healthy` to `HealthyBusy` during processing which is used by AgentCore to keep session alive.
- **Real-World Use Cases**: Image processing, log analysis, data transformation, encryption, etc.

## Why Use Background Workers?

### The Problem: Blocking Operations Freeze Your Agent

Without worker threads, blocking operations completely freeze the main thread, preventing your agent from accepting ANY new incoming requests:

```typescript
// ❌ BAD: Blocks the main thread
callback: async (): Promise<string> => {
  // Tight loop blocks for 10 seconds
  for (let i = 0; i < 10000000000; i++) {
    // CPU-intensive calculation
  }

  // OR processing large datasets
  const data = readFileSync('large-file.json')
  for (const record of millionsOfRecords) {
    // Process each record - blocks for minutes
  }

  return 'Done'
}

// Result:
// - Main thread is frozen during processing
// - Agent cannot accept new requests
// - All incoming requests wait or timeout
// - Other users cannot be served
```

**Impact on concurrent users:**

- User A: "Process this dataset" → Blocks agent for 10 seconds
- User B: "What's 2+2?" → Request blocked, must wait 10 seconds for User A to complete
- User C: Attempts to connect → Connection refused or times out while agent is blocked

### The Solution: Worker Threads Keep Agent Responsive

Worker threads run blocking operations in separate OS threads, keeping the main thread free to accept requests:

```typescript
// ✅ GOOD: Offloads blocking work to worker thread
callback: async (): Promise<string> => {
  const worker = new Worker('./worker.js')

  return new Promise((resolve) => {
    // Main thread sends work to worker (non-blocking)
    worker.postMessage({ task: 'process' })

    // Main thread waits for response (async, non-blocking)
    worker.on('message', (result) => {
      resolve(result)
    })
  })
}

// Result:
// - Main thread stays free
// - Agent accepts new requests immediately
// - Worker thread does blocking work in parallel
// - All users can be served concurrently
```

**Impact on concurrent users:**

- User A: "Process this dataset" → Worker spawned, processes for 10 seconds in background
- User B: "What's 2+2?" → Responds immediately (main thread remains available)
- User C: "Tell me a joke" → Responds immediately (main thread remains available)

### Common Blocking Operations That Need Workers

Use worker threads for these CPU-blocking tasks:

1. **Tight loops**: `while`, `for` loops that run millions of iterations
2. **Large dataset processing**: Parsing/transforming megabytes of data
3. **Complex calculations**: Mathematical computations, simulations
4. **File processing**: Reading/parsing large files (logs, CSVs, JSON)
5. **Cryptographic operations**: Hashing, encryption, key generation
6. **Image/video processing**: Resizing, compression, format conversion
7. **Data aggregation**: Sorting, filtering, grouping large datasets

### Benefits

1. **Agent stays responsive** - Main thread free to accept new requests
2. **No request blocking** - Incoming requests don't wait for processing
3. **Concurrent processing** - Multiple workers run in parallel
4. **Better scalability** - Serve multiple users simultaneously
5. **Prevents timeouts** - Long tasks don't cause connection timeouts

## How It Works

### Agent Tools (agent.ts)

The agent provides two tools:

#### 1. Start Background Worker

```typescript
const startBackgroundWorker = tool({
  name: 'start_background_worker',
  description: 'Start a background worker for CPU-intensive processing',
  inputSchema: z.object({
    duration: z.number().default(5),
  }),
  callback: async (input: { duration: number }): Promise<string> => {
    const taskId = app.addAsyncTask('background_worker_processing', { duration })
    const worker = new Worker(workerPath)

    // Submit job to worker
    worker.postMessage({ duration })

    // Set up completion handlers (fire and forget)
    worker.on('message', (message) => {
      app.completeAsyncTask(taskId)
      worker.terminate()
    })

    // Return immediately without waiting
    return `Worker started (Task ID: ${taskId}). Processing in background...`
  },
})
```

**Key Point:** The callback returns immediately after starting the worker, without waiting for it to complete. This is true "fire and forget" - the agent can accept new requests while the worker processes in the background.

#### 2. Get Task Status

```typescript
const getTaskStatus = tool({
  name: 'get_task_status',
  description: 'Get information about currently running background tasks',
  inputSchema: z.object({}),
  callback: async (): Promise<string> => {
    const taskStatus = app.getAsyncTaskInfo()
    // Returns: { activeCount: number, runningJobs: Array<{ name: string, duration: number }> }

    if (taskStatus.activeCount === 0) {
      return 'No background tasks currently running. Agent status is Healthy.'
    }

    // Return task details: name, duration
    return `Currently running tasks: ${taskStatus.activeCount}...`
  },
})
```

This tool uses `app.getAsyncTaskInfo()` to query the async task status, which returns:

- `activeCount`: Number of currently running background tasks
- `runningJobs`: Array of jobs with `name` and `duration` properties

### Worker Thread (worker.ts)

```typescript
parentPort.on('message', (message: { duration: number }) => {
  // CPU-intensive blocking loop
  // This blocks the WORKER thread, NOT the main thread
  const end = Date.now() + message.duration * 1000
  while (Date.now() < end) {
    /* busy loop */
  }

  // Send completion message back to main thread
  parentPort?.postMessage({ status: 'completed' })
})
```

### Health Status

When a task is registered with `addAsyncTask()`, the `/ping` endpoint automatically returns `HealthyBusy`. Once `completeAsyncTask()` is called, status returns to `Healthy`.

**Note:** The `/ping` endpoint is used by Amazon Bedrock AgentCore for internal health monitoring and session management. It is only accessible locally during development and is not exposed when the agent is deployed publicly.

## Build and Run Locally

### Prerequisites

- Node.js 20+
- AWS credentials configured (for Bedrock API access)
- AgentCore Starter Toolkit installed

### Run Locally with Hot Reload

```bash
# Start dev server with automatic reload
agentcore dev
```

Test with the CLI:

```bash
agentcore invoke --dev '{"prompt": "What is 25 * 4?"}'
```

Or with curl:

```
curl -X POST http://localhost:8080/invocations -H "Content-Type: application/json" -d '{"prompt": "start a 3 second worker"}'
BedrockAgentCoreApp server listening on port 8080
```

## Demonstrating Non-Blocking Behavior

**Note:** The `/ping` endpoint is only accessible when running locally for testing purposes. When the agent is deployed publicly on Amazon Bedrock AgentCore, this endpoint is not exposed to external traffic. AgentCore uses the `/ping` endpoint internally for health monitoring to manage agent session lifecycle.

### Test 1: Basic Worker Execution

Start a 5-second background worker:

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "start a 5 second background task"}'
```

The agent will:

1. Start the worker thread
2. Return immediately with "Worker started" message
3. Worker processes for 5 seconds in the background
4. Agent is available to handle new requests immediately

**Important:** The agent does not wait for the worker to complete. It returns immediately after starting the worker.

### Test 1b: Query Task Status

While a worker is running, check what tasks are currently active:

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "what background tasks are running?"}'
```

The agent will use the `get_task_status` tool to query `app.getAsyncTaskInfo()` and return:

- Number of active tasks (`activeCount`)
- List of running jobs with name and duration
- Current agent status (Healthy or HealthyBusy)

### Test 2: Concurrent Requests (The Key Benefit)

This demonstrates that the agent returns immediately and can handle concurrent requests while workers process in the background.

**Terminal 1:** Start a long-running worker (10 seconds)

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "run a background task for 10 seconds"}'
# Response: "Worker started..." (returns in ~500ms)
```

**Terminal 2:** Immediately send another request

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "what is 25 times 4?"}'
# Response: "625" (returns immediately, ~500ms)
```

**Result:** Both requests return immediately. The first request starts a worker and returns right away without waiting. The second request is handled normally. The 10-second worker processes in the background without blocking either request.

### Test 3: Health Status Monitoring

Monitor the agent's health status while a worker processes in the background.

**Check initial status:**

```bash
curl http://localhost:8080/ping
# Response: {"status": "Healthy"}
```

**Start a 10-second worker:**

```bash
curl -X POST http://localhost:8080/invocations \
  -d '{"prompt": "start 10 second worker"}'
# Response: "Worker started..." (returns immediately)
```

**Immediately check status (worker is now processing):**

```bash
curl http://localhost:8080/ping
# Response: {"status": "HealthyBusy"}
```

**Wait 10 seconds for worker to complete, then check again:**

```bash
sleep 10
curl http://localhost:8080/ping
# Response: {"status": "Healthy"}
```

This demonstrates that:

- Agent returns immediately after starting the worker
- Health status changes to HealthyBusy while worker processes
- Agent can still accept requests (try sending another request while status is HealthyBusy)
- Status returns to Healthy when worker completes

### Test 4: Query Running Tasks

Start multiple workers and query their status:

```bash
# Start first worker
curl -X POST http://localhost:8080/invocations \
  -d '{"prompt": "start a 15 second worker"}'

# Start second worker
curl -X POST http://localhost:8080/invocations \
  -d '{"prompt": "start a 10 second worker"}'

# Query task status
curl -X POST http://localhost:8080/invocations \
  -d '{"prompt": "what tasks are running?"}'
```

Response will show:

```
Currently running background tasks (2):

Task 1:
  - Name: background_worker_processing
  - Duration: 15 seconds

Task 2:
  - Name: background_worker_processing
  - Duration: 10 seconds

Agent status: HealthyBusy
```

## Deploying to AWS

### Prerequisites

- AWS credentials configured
- AgentCore Starter Toolkit installed

### Deployment Steps

1. **Configure the Agent**

```bash
agentcore configure
```

This will prompt you to configure deployment settings for your agent.

2. **Deploy to AWS**

```bash
agentcore deploy
```

This will:

- Build and containerize the agent
- Push the container image to Amazon ECR
- Create necessary IAM roles and permissions
- Deploy the agent to Amazon Bedrock AgentCore Runtime

The deployment outputs the Runtime ARN which you can use to invoke the agent.

### Testing the Deployed Agent

```bash
# Invoke the deployed agent
agentcore invoke --payload '{"prompt": "run a background task for 10 seconds"}'
```

## Architecture

This sample demonstrates the integration of Node.js Worker Threads with Strands SDK and Amazon Bedrock AgentCore Runtime:

### Components

1. **Agent (agent.ts)**:
   - Defines the `start_background_worker` tool
   - Spawns worker threads (fire and forget)
   - Returns immediately without waiting for worker completion
   - Tracks async tasks for health status reporting

2. **Worker (worker.ts)**:
   - Runs CPU-intensive processing in separate thread
   - Performs blocking operations without affecting main thread
   - Sends completion message back to main thread to mark async task as complete, changing agent status from HealthyBusy to Healthy

3. **Message Passing Flow (Fire and Forget)**:

   ```
   User Request → Agent → Spawn Worker → Return "Worker started"
                            ↓
                   (Agent already responded)
                            ↓
                  Worker processes in background
                            ↓
                  Worker completes, updates health status
   ```

   **Key:** The agent does not wait for the worker. It starts the worker and returns immediately, enabling true non-blocking concurrent request handling.

4. **Health Status**:
   - `addAsyncTask()`: Marks agent as `HealthyBusy`
   - Worker processes in background
   - `completeAsyncTask()`: Returns to `Healthy`

### Key Benefits

- **Non-blocking**: Main thread handles new requests while workers process
- **Concurrent**: Multiple workers can run simultaneously
- **Scalable**: Each worker runs in its own OS thread
- **Responsive**: Agent stays available during heavy processing
