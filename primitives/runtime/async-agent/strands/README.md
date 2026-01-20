# Async Agent - Strands

Deploy an AI agent that handles long-running background tasks asynchronously using the Strands Agents SDK and Bedrock AgentCore Runtime.

|                    |                        |
| ------------------ | ---------------------- |
| **Framework**      | Strands Agents SDK     |
| **Model**          | Amazon Nova 2 Lite     |
| **Protocol**       | HTTP                   |

## What This Sample Demonstrates

- Background task management with automatic health status tracking
- Agent status changes from `Healthy` to `HealthyBusy` during task execution
- Tool-based API for starting long-running operations
- Streaming responses with Server-Sent Events (SSE)
- Integration between Strands SDK and Bedrock AgentCore Runtime

## How It Works

The agent uses the Bedrock AgentCore Runtime's task tracking system to manage background jobs:

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

- Docker installed
- AWS credentials configured (for Bedrock API access)

### Build the Docker Image

```bash
docker build \
  --build-arg REPO_PATH=${SDK_REPO_PATH} \
  -t async-agent \
  .
```

### Run the Container

Run with AWS credentials to enable Bedrock API access:

```bash
docker run -p 8080:8080 \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  -e AWS_SESSION_TOKEN=$AWS_SESSION_TOKEN \
  -e AWS_REGION=us-east-1 \
  async-agent
```

The agent will start and display:
```
🚀 Simple Async Strands Example
Test: curl -X POST http://localhost:8080/invocations -H "Content-Type: application/json" -d '{"prompt": "start a 3 second task"}'
BedrockAgentCoreApp server listening on port 8080
```

## Testing the Async Agent

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
  -d '{"prompt": "start a 5 second task"}'
```

Response:
```json
{
  "message": "Started background task (ID: 1) for 5 seconds. Agent status is now BUSY."
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

### 5. Test with Streaming Response

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"prompt": "start a 3 second background task"}'
```

This will stream the agent's response as Server-Sent Events.

## Deploying to AWS

This sample includes AWS CDK infrastructure to deploy the agent to AWS Bedrock AgentCore Runtime.

### Prerequisites

- AWS CLI configured with credentials
- Node.js 22+ installed
- Docker installed (for building container images)

### Deployment Steps

1. **Install Dependencies**

```bash
npm install
```

2. **Bootstrap CDK** (first time only)

If this is your first time using CDK in your AWS account/region:

```bash
npm run bootstrap
```

3. **Deploy the Stack**

```bash
npm run deploy
```

This will:
- Build a Docker image for the agent
- Push it to Amazon ECR
- Create an IAM role with permissions for Bedrock and CloudWatch
- Deploy the agent to Bedrock AgentCore Runtime

The deployment outputs the Runtime ARN which you can use to invoke the agent.

### Managing the Deployment

**View synthesized CloudFormation template:**
```bash
npm run synth
```

**Destroy the stack:**
```bash
npm run destroy
```

### Architecture

The CDK stack (`cdk/agent-stack.ts`) creates:

- **Docker Image Asset**: Containerizes the agent and pushes to ECR
- **IAM Role**: Grants the runtime permissions to:
  - Invoke Bedrock models (`bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`)
  - Pull container images from ECR
  - Write logs to CloudWatch
- **Bedrock AgentCore Runtime**: Runs the containerized agent with HTTP protocol and public network access

## Architecture

The sample demonstrates the integration pattern between Strands SDK and Bedrock AgentCore Runtime:

1. **Tool Definition**: Define tools using Strands SDK's `tool()` function
2. **Task Tracking**: Use `app.addAsyncTask()` and `app.completeAsyncTask()` for health monitoring
3. **Agent Creation**: Create a Strands `Agent` with the tools
4. **Runtime Integration**: Use `BedrockAgentCoreApp` to handle HTTP requests and SSE streaming
5. **Automatic Health Management**: The runtime automatically reports `HealthyBusy` when tasks are active
