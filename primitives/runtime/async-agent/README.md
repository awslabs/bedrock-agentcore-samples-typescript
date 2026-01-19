# Async Agent with Background Task Management

This sample shows how to build AI agents that handle long-running background tasks with automatic health status tracking. The agent status automatically changes from `Healthy` to `HealthyBusy` while tasks are running, enabling AgentCore Runtime to properly monitor and manage background operations.

|                         |                    |
| ----------------------- | ------------------ |
| **AgentCore component** | Runtime            |
| **Protocol**            | HTTP               |
| **Model**               | Amazon Nova 2 Lite |
| **Frameworks**          | Strands Agents     |

## What This Sample Demonstrates

- Background task management with automatic health status tracking
- Agent status transitions (`Healthy` ↔ `HealthyBusy`)
- Tool-based API for starting long-running operations
- Streaming responses with Server-Sent Events
- Integration between Strands SDK and Bedrock AgentCore Runtime

## Choose Your Framework

### [Strands Agents](./strands/)

Uses `@strands-agents/sdk` with background task tracking via Bedrock AgentCore Runtime.

```typescript
import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, _context) {
      for await (const event of agent.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }
    },
  },
})

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

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: 'us-east-1',
  }),
  tools: [startBackgroundTask],
})
```

→ [Full source](./strands/src/index.ts)

---

## Quick Start

```bash
cd strands

# Build Docker image
docker build \
  --build-arg REPO_PATH=${SDK_REPO_PATH} \
  -t async-agent \
  .

# Run locally
docker run -p 8080:8080 \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  -e AWS_SESSION_TOKEN=$AWS_SESSION_TOKEN \
  -e AWS_REGION=us-east-1 \
  async-agent
```

## How It Works

```
┌────────┐       ┌───────────────────────────────────┐       ┌─────────┐
│        │       │    AgentCore Runtime Container    │       │         │
│ Client │──────▶│                                   │──────▶│ Bedrock │
│        │◀──────│  BedrockAgentCoreApp              │◀──────│  Model  │
│        │       │    ├── Agent                      │       │         │
└────────┘       │    └── Tools (longRunningTask)    │       └─────────┘
                 │                                   │
                 └───────────────────────────────────┘
```

1. Client sends request to AgentCore Runtime endpoint
2. `BedrockAgentCoreApp` receives request, passes to handler
3. Agent streams response, executing async tools as needed
4. Handler yields events back to client during processing

## Request/Response Format

**Request:**

```json
{ "prompt": "Analyze the following data: sample input" }
```

**Response (streamed):**

```json
{ "event": "message", "data": { "text": "I'll analyze that data for you..." } }
{ "event": "message", "data": { "text": "Analysis complete." } }
```
