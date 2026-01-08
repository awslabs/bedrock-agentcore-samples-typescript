# AgentCore Runtime

Amazon Bedrock AgentCore Runtime is managed infrastructure for hosting AI agents.

## What is AgentCore Runtime?

AgentCore Runtime runs your agent code in containers, providing:

- **Auto-scaling** — Automatically scales based on request volume
- **Load balancing** — Distributes requests across instances
- **Logging** — CloudWatch integration out of the box
- **Networking** — Public or VPC-private endpoints
- **Protocol support** — HTTP and WebSocket for real-time streaming

You provide a container image with your agent. AgentCore handles everything else.

## How It Works

```
┌──────────────┐     ┌─────────────────────────────────────┐     ┌──────────────┐
│    Client    │────▶│         AgentCore Runtime           │────▶│   Bedrock    │
│              │◀────│  ┌─────────────────────────────┐    │◀────│    Models    │
└──────────────┘     │  │     Your Container          │    │     └──────────────┘
                     │  │  ┌─────────────────────┐    │    │
                     │  │  │ BedrockAgentCoreApp │    │    │
                     │  │  │   (SDK wrapper)     │    │    │
                     │  │  └─────────────────────┘    │    │
                     │  └─────────────────────────────┘    │
                     └─────────────────────────────────────┘
```

1. Client sends request to AgentCore endpoint
2. AgentCore routes to your container
3. `BedrockAgentCoreApp` (from the SDK) handles protocol details
4. Your handler processes the request, streams responses back

## The Handler Pattern

Every AgentCore Runtime app follows the same pattern:

```typescript
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'

const app = new BedrockAgentCoreApp({
  handler: async function* (request, context) {
    // request: the incoming payload (you define the shape)
    // context: session ID, headers, auth tokens, etc.

    // Yield events to stream responses back
    yield { event: 'message', data: { text: 'Processing...' } }
    yield { event: 'message', data: { text: 'Done!' } }
  },
})

app.run() // Starts HTTP server on port 8080
```

The generator function (`async function*`) enables streaming — each `yield` sends an event to the client immediately.

---

## Samples

### [hosting-agent](./hosting-agent/)

Host an AI agent that responds to prompts with tool use.

| Framework                               | Description                          | Code                                               |
| --------------------------------------- | ------------------------------------ | -------------------------------------------------- |
| [Strands](./hosting-agent/strands/)     | Strands Agents SDK with BedrockModel | [index.ts](./hosting-agent/strands/src/index.ts)   |
| [Vercel AI](./hosting-agent/vercel-ai/) | Vercel AI SDK with ToolLoopAgent     | [index.ts](./hosting-agent/vercel-ai/src/index.ts) |

---

### [bidirectional-streaming](./bidirectional-streaming/)

Full-duplex WebSocket communication for real-time applications.

| Implementation                              | Description                                    | Code                                                      |
| ------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| [Echo](./bidirectional-streaming/echo/)     | Simple WebSocket echo with session context     | [index.ts](./bidirectional-streaming/echo/src/index.ts)   |
| [OpenAI](./bidirectional-streaming/openai/) | OpenAI Realtime API bridge for audio streaming | [index.ts](./bidirectional-streaming/openai/src/index.ts) |

Uses the `websocketHandler` option in `BedrockAgentCoreApp`:

```typescript
const app = new BedrockAgentCoreApp({
  handler: async (request, context) => { ... },        // HTTP
  websocketHandler: async (socket, context) => { ... } // WebSocket
})
```

---

### [async-agent](./async-agent/)

Long-running tasks that stream results as they're produced.

| Pattern                 | Description                                |
| ----------------------- | ------------------------------------------ |
| Background task + queue | Spawn async work, stream results via queue |

Uses background tasks with async queues:

```typescript
const app = new BedrockAgentCoreApp({
  handler: async function* (request, context) {
    const queue = new AsyncQueue()

    // Spawn background task
    runLongTask(request, queue)

    // Stream results as they arrive
    for await (const result of queue) {
      yield { event: 'progress', data: result }
    }
  },
})
```

---

## Running Locally

```bash
cd hosting-agent/strands
make dev
```

## Deploying to AgentCore

```bash
make build-and-push  # Build ARM64 image, push to ECR
make deploy          # Deploy CloudFormation stack
make delete          # Clean up
```

## CloudFormation

Each sample includes `template.yaml` that creates:

- **IAM Role** — Permissions for Bedrock, ECR, CloudWatch
- **AgentCore Runtime** — The `AWS::BedrockAgentCore::Runtime` resource

```yaml
AgentRuntime:
  Type: AWS::BedrockAgentCore::Runtime
  Properties:
    AgentRuntimeName: my_agent
    AgentRuntimeArtifact:
      ContainerConfiguration:
        ContainerUri: !Ref ContainerImageUri
    ProtocolConfiguration: HTTP
    RoleArn: !GetAtt RuntimeRole.Arn
    NetworkConfiguration:
      NetworkMode: PUBLIC
```
