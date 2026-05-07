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
│    Client    │────▶│         AgentCore Runtime           │────▶│     LLMs     │
│              │◀────│  ┌─────────────────────────────┐    │◀────│              │
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

## Invoking an Agent

Once deployed, you can invoke your agent via HTTP or WebSocket. AgentCore supports two authentication methods:

- **IAM** — AWS SigV4 request signing (used in these samples)
- **OAuth** — Bearer token in Authorization header

### HTTP

**With AWS CLI (IAM):**

```bash
aws bedrock-agentcore invoke-agent-runtime \
  --agent-runtime-arn "arn:aws:..." \
  --runtime-session-id "session-123" \
  --payload '{"prompt": "Hello"}'
```

**With fetch (OAuth):**

```typescript
const response = await fetch(`${runtimeEndpoint}/invocations`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-amzn-bedrock-agentcore-runtime-session-id': sessionId,
  },
  body: JSON.stringify({ prompt: 'Hello' }),
})
```

### WebSocket

Use `RuntimeClient` from the SDK to generate signed connections:

```typescript
import { RuntimeClient } from 'bedrock-agentcore/runtime'
import { WebSocket } from 'ws'

const client = new RuntimeClient({ region: 'us-east-1' })

// IAM authentication
const { url, headers } = await client.generateWsConnection({
  runtimeArn: 'arn:aws:...',
})

// OAuth authentication
const { url, headers } = await client.generateWsConnectionOAuth({
  runtimeArn: 'arn:aws:...',
  bearerToken: token,
})

const ws = new WebSocket(url, { headers })
```

For OAuth setup, see the [AgentCore Identity documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity-getting-started.html).

---

## Samples

### [hosting-agent](./hosting-agent/)

Deploy an AI agent that responds to prompts with tool use. Implementations for Strands Agents SDK, Vercel AI SDK, and Claude Agent SDK.

### [bidirectional-streaming](./bidirectional-streaming/)

Full-duplex WebSocket communication for real-time applications.

### [async-agent](./async-agent/)

Long-running background tasks with automatic health status tracking.

---

## Running Locally

Install the [AgentCore Starter Toolkit](https://github.com/aws/bedrock-agentcore-starter-toolkit):

```bash
pip install bedrock-agentcore-starter-toolkit
```

Then run any sample:

```bash
cd hosting-agent/strands
npm install
agentcore configure
agentcore dev
```

## Deploying to AgentCore

```bash
agentcore deploy    # Build and deploy to AgentCore
agentcore destroy   # Clean up
```
