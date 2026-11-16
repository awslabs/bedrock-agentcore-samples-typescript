# AgentCore Runtime

Amazon Bedrock AgentCore Runtime is managed infrastructure for hosting AI agents.

## What is AgentCore Runtime?

AgentCore Runtime runs your agent code in isolated sessions, providing:

- **Auto-scaling** — Scales with request volume
- **Session isolation** — Each session runs in its own microVM
- **Logging and tracing** — CloudWatch integration out of the box
- **Networking** — Public or VPC-private endpoints
- **Protocol support** — HTTP, WebSocket, MCP, A2A, and AG-UI

You provide your agent code, or a container image. AgentCore handles everything else.

## How It Works

```
┌──────────────┐     ┌─────────────────────────────────────┐     ┌──────────────┐
│    Client    │────▶│         AgentCore Runtime           │────▶│     LLMs     │
│              │◀────│  ┌─────────────────────────────┐    │◀────│              │
└──────────────┘     │  │     Your Agent Session      │    │     └──────────────┘
                     │  │  ┌─────────────────────┐    │    │
                     │  │  │ BedrockAgentCoreApp │    │    │
                     │  │  │   (SDK wrapper)     │    │    │
                     │  │  └─────────────────────┘    │    │
                     │  └─────────────────────────────┘    │
                     └─────────────────────────────────────┘
```

1. A client sends a request to the AgentCore endpoint
2. AgentCore authenticates it and routes it to the session's microVM
3. `BedrockAgentCoreApp` (from the SDK) handles the protocol details
4. Your handler processes the request and streams responses back

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

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
```

Validate invocation payloads before forwarding them to an agent. Keep text prompts defined as `z.string()` and pass
only prompt text to the agent.

The generator function (`async function*`) enables streaming — each `yield` sends an event to the client immediately.

## The AgentCore Protocol

`BedrockAgentCoreApp` creates an HTTP server that follows the AgentCore Runtime protocol:

- **POST /invocations** — Accepts JSON requests, streams server-sent events
- **GET /ping** — Reports whether the session is `Healthy` or `HealthyBusy`
- **/ws** — WebSocket endpoint, when you provide a `websocketHandler`
- **Sessions** via the `x-amzn-bedrock-agentcore-runtime-session-id` header

This means:

1. **The same code runs locally and on AWS** — No changes needed for deployment
2. **Any HTTP client works** — curl, fetch, Postman, custom CLIs
3. **You could use any server framework** — as long as it implements the protocol

## Developing and Deploying

Every runtime sample is an [AgentCore CLI](https://github.com/aws/agentcore-cli) project:

```
<sample>/
├── app/agent/          # The agent: main.ts, package.json
└── agentcore/
    ├── agentcore.json  # Runtime configuration read by the AgentCore CLI
    └── cdk/            # CDK app the CLI deploys
```

Install the CLI once:

```bash
npm install -g @aws/agentcore
```

Then, from any sample:

```bash
agentcore dev                          # Run locally with hot reload
npm install --prefix agentcore/cdk
agentcore deploy                       # Bundle the agent and deploy it
agentcore invoke --runtime agent --payload '{"prompt": "Hello"}'
agentcore remove all --yes && agentcore deploy --yes   # Clean up
```

## Invoking a Deployed Agent

AgentCore supports two authentication methods:

- **IAM** — AWS SigV4 request signing (used in these samples)
- **OAuth** — Bearer token in the Authorization header (see [inbound auth](../identity/inbound-auth/))

### HTTP

**With the AWS CLI (IAM):**

```bash
aws bedrock-agentcore invoke-agent-runtime \
  --agent-runtime-arn "<runtime-arn>" \
  --runtime-session-id "$(uuidgen)" \
  --cli-binary-format raw-in-base64-out \
  --payload '{"prompt": "Hello"}' \
  response.txt
```

Session IDs must be at least 33 characters; a UUID works.

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

const client = new RuntimeClient({ region: process.env['AWS_REGION'] ?? 'us-east-1' })

const { url, headers } = await client.generateWsConnection({ runtimeArn })

const ws = new WebSocket(url, { headers })
```

See [bidirectional streaming](./bidirectional-streaming/) for OAuth connections and a complete client.

---

## Samples

### [hosting-agent](./hosting-agent/)

Deploy an AI agent that responds to prompts with tool use. Implementations for Strands Agents SDK and Vercel AI SDK.

### [bidirectional-streaming](./bidirectional-streaming/)

Full-duplex WebSocket communication for real-time applications.

### [async-agent](./async-agent/)

Long-running background tasks with automatic health status tracking.
