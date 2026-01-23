# Async Agent - Strands

Deploy an AI agent that handles long-running background tasks asynchronously using the Strands Agents SDK and Amazon Bedrock AgentCore Runtime.

## What This Sample Demonstrates

Agent code communicates its processing status using the "/ping" endpoint health status. 200 HTTP Status response with payload {"status": "HealthyBusy"} indicates the agent is busy processing background tasks. {"status": "Healthy"} indicates it is idle (waiting for requests). A session in idle state for 15 minutes gets automatically terminated.

- Background task management with automatic health status tracking
- Agent status changes from `Healthy` to `HealthyBusy` during task execution.
- Tool-based API for starting long-running operations
- Streaming responses with Server-Sent Events (SSE)
- Integration between Strands SDK and Amazon Bedrock AgentCore Runtime

## How It Works

The agent uses the AgentCore Runtime's task tracking system to manage background jobs:

```typescript
const startBackgroundTask = tool({
  name: 'start_background_task',
  description: 'Start a simple background task that runs for specified duration',
  inputSchema: z.object({
    duration: z.number().default(5),
  }),
  callback: async (input: { duration: number }): Promise<string> => {
    const taskId = app.addAsyncTask('background_processing', { duration })

    setTimeout(() => {
      app.completeAsyncTask(taskId)
    }, input.duration * 1000)

    return `Started background task (ID: ${taskId}) for ${duration} seconds. Agent status is now BUSY.`
  },
})
```

When a task is registered with `addAsyncTask()`, the runtime's health endpoint (`/ping`) automatically returns `HealthyBusy`. Once `completeAsyncTask()` is called, the status returns to `Healthy`.

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
curl -X POST http://localhost:8080/invocations -H "Content-Type: application/json" -d '{"prompt": "start a 3 second task"}'
BedrockAgentCoreApp server listening on port 8080
```

## Testing the Async Agent

**Note:** The `/ping` endpoint is only accessible when running locally. In deployed agents, AgentCore uses this endpoint internally for health monitoring and does not expose it to external traffic.

### 1. Check Initial Health Status

```bash
curl http://localhost:8080/ping
```

Response when no tasks are running:

```json
{
  "status": "Healthy",
  "time_of_last_update": "2024-01-19T10:30:00.000Z"
}
```

### 2. Start a Background Task

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
   -H "Accept: text/event-stream" \
  -d '{"prompt": "start a 20 second task"}'
```

Sample response:

```json
{
  "message": "Started background task (ID: 1) for 20 seconds. Agent status is now BUSY."
}
```

### 3. Check Status While Task is Running

```bash
curl http://localhost:8080/ping
```

Response while task is active:

```json
{
  "status": "HealthyBusy",
  "time_of_last_update": "2024-01-19T10:30:05.000Z"
}
```

### 4. Check Status After Task Completes

Wait for the task duration to complete, then check again:

```bash
curl http://localhost:8080/ping
```

Response after task completes:

```json
{
  "status": "Healthy",
  "time_of_last_update": "2024-01-19T10:30:10.000Z"
}
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
agentcore invoke --payload '{"prompt": "start a 10 second task"}'
```

## Architecture

The sample demonstrates the integration pattern between Strands SDK and Amazon Bedrock AgentCore Runtime:

1. **Tool Definition**: Define tools using Strands SDK's `tool()` function
2. **Task Tracking**: Use `app.addAsyncTask()` and `app.completeAsyncTask()` for health monitoring
3. **Agent Creation**: Create a Strands `Agent` with the tools
4. **Runtime Integration**: Use `BedrockAgentCoreApp` to handle HTTP requests and SSE streaming
5. **Automatic Health Management**: The runtime automatically reports `HealthyBusy` when tasks are active
