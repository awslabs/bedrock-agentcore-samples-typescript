# AgentCore Runtime

Amazon Bedrock AgentCore Runtime is managed infrastructure for hosting AI agents.

## What is AgentCore Runtime?

AgentCore Runtime runs your agent code in containers, providing:

- **Auto-scaling** — Automatically scales based on request volume
- **Load balancing** — Distributes requests across instances
- **Logging** — CloudWatch integration out of the box
- **Networking** — Public or VPC-private endpoints
- **Protocol support** — HTTP, WebSocket, MCP, and A2A

You provide a container image or just agent code. AgentCore handles everything else.

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
2. AgentCore authenticates request and routes to your container
3. `BedrockAgentCoreApp` (from the SDK) handles protocol details
4. Your handler processes the request, streams responses back

## The Handler Pattern

Every AgentCore Runtime app follows the same pattern:

```typescript
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }), // Typed inputs with Zod
    process: async function* (request, context) {
      // request.prompt is typed as string
      // context: session ID, headers, auth tokens, etc.

      yield { event: 'message', data: { text: 'Processing...' } }
      yield { event: 'message', data: { text: 'Done!' } }
    },
  },
})

app.run() // Starts HTTP server on port 8080
```

The generator function (`async function*`) enables streaming — each `yield` sends an event to the client immediately.

## The AgentCore Protocol

`BedrockAgentCoreApp` creates an HTTP server that follows the AgentCore Runtime protocol:

- **POST /invocations** — Accepts JSON requests, streams SSE responses
- **Session management** via `x-amzn-bedrock-agentcore-runtime-session-id` header
- **Streaming** via Server-Sent Events (SSE)

This means:
1. **Same code runs locally and on AWS** — No changes needed for deployment
2. **Any HTTP client works** — curl, fetch, Postman, custom CLIs
3. **You could use any server framework** — Express, Fastify, etc. — as long as it implements the protocol

The SDK handles the protocol details so you focus on your agent logic.

## Authentication

AgentCore Runtime supports two authentication methods:

| Method | How It Works |
|--------|--------------|
| **OAuth** | Bearer token in Authorization header - no request signing required |
| **IAM** | AWS SigV4 request signing using credentials |

### OAuth

Add a bearer token to requests. Configure an OIDC provider with AgentCore Identity:

```typescript
// HTTP
fetch(`${runtimeEndpoint}/invocations`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ prompt: 'Hello' }),
})

// WebSocket
import { RuntimeClient } from 'bedrock-agentcore/runtime'

const client = new RuntimeClient({ region: 'us-east-1' })
const { url, headers } = await client.generateWsConnectionOAuth({
  runtimeArn: 'arn:aws:...',
  bearerToken: token,
})
```

See [AgentCore Identity documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity-getting-started.html) for OIDC provider configuration, or the [identity examples](../identity/) for a working OAuth sample.

### IAM

Requests must be SigV4-signed. For HTTP, use AWS CLI or SDKs. For WebSocket, use `RuntimeClient`:

```bash
# HTTP via AWS CLI
aws bedrock-agentcore invoke-agent-runtime \
  --agent-runtime-arn "arn:aws:..." \
  --payload '{"prompt": "Hello"}'
```

```typescript
// WebSocket
import { RuntimeClient } from 'bedrock-agentcore/runtime'
import { WebSocket } from 'ws'

const client = new RuntimeClient({ region: 'us-east-1' })
const { url, headers } = await client.generateWsConnection({
  runtimeArn: 'arn:aws:...',
})

const ws = new WebSocket(url, { headers })
```

`RuntimeClient` handles credential resolution and SigV4 signing automatically.

> **Note:** The samples in this repository use IAM authentication because it requires no additional OIDC provider setup.

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

| Implementation                          | Description                                | Code                                                    |
| --------------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| [Echo](./bidirectional-streaming/echo/) | Simple WebSocket echo with session context | [index.ts](./bidirectional-streaming/echo/src/index.ts) |

Uses the `websocketHandler` option in `BedrockAgentCoreApp`:

```typescript
const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async (request, context) => { ... },      // HTTP
  },
  websocketHandler: async (socket, context) => { ... } // WebSocket
})
```

---

### [async-agent](./async-agent/)

TODO

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
    ProtocolConfiguration: HTTP # Or MCP and A2A
    RoleArn: !GetAtt RuntimeRole.Arn
    NetworkConfiguration:
      NetworkMode: PUBLIC
```
