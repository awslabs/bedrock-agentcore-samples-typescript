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

Every runtime sample has the same handler. This is the [Strands hosting sample](./hosting-agent/strands/)'s:

```typescript
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      for await (const event of agent.stream(request.prompt)) {
        // ...yield text deltas as message events
      }
    },
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
```

The handler's second argument, `context`, carries the session ID, the forwarded headers and `context.log`, a
request-scoped logger.

`requestSchema` validates each payload before your handler runs, so `request.prompt` is a string by the time it
reaches the agent. Requests that don't match are rejected. Keep prompts typed as `z.string()` and pass only the prompt
text to the agent.

The generator function (`async function*`) enables streaming — each `yield` sends an event to the client immediately.

Deployed, each runtime session runs in its own microVM, so an agent created at module level serves a single session.
Samples where the conversation is the point keep one agent per `context.sessionId`, which also keeps sessions apart
under `agentcore dev`.

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

Then, from any sample, run it locally with hot reload:

```bash
agentcore dev
```

In a second terminal, invoke it:

```bash
agentcore invoke --runtime agent --local --payload '{"prompt": "Hello"}'
```

Deploy it to AgentCore Runtime, invoke it, and clean up:

```bash
npm install --prefix agentcore/cdk
agentcore deploy
agentcore invoke --runtime agent --payload '{"prompt": "Hello"}'
agentcore remove all --yes && agentcore deploy --yes
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
  --content-type application/json \
  --accept text/event-stream \
  --cli-binary-format raw-in-base64-out \
  --payload '{"prompt": "What is 25 * 4?"}' \
  response.txt
```

Session IDs must be at least 33 characters; a UUID works. The streamed events are written to `response.txt`.

**With fetch (OAuth)**, as the [Google Calendar sample](../identity/outbound-auth/google-cal/)'s web app does:

```typescript
const response = await fetch(runtimeUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    Authorization: `Bearer ${userToken}`,
    'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': sessionId,
  },
  body: JSON.stringify({ prompt }),
})
```

`runtimeUrl` is the runtime's invocation URL, which that sample's stack outputs as `RuntimeUrl`:
`https://bedrock-agentcore.<region>.amazonaws.com/runtimes/<URL-encoded runtime ARN>/invocations?qualifier=DEFAULT`.

### WebSocket

Use `RuntimeClient` from the SDK to generate signed connections for the [`ws`](https://github.com/websockets/ws)
client:

```typescript
import { RuntimeClient } from 'bedrock-agentcore/runtime'
import { WebSocket } from 'ws'

const region = runtimeArn.split(':')[3]
const { url, headers } = await new RuntimeClient({ region }).generateWsConnection({ runtimeArn })
const ws = new WebSocket(url, { headers })
```

The [echo sample's client](./bidirectional-streaming/echo/app/agent/client.ts) is the complete version.

---

## Samples

| Sample                                                | What it shows                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| [hosting-agent](./hosting-agent/)                     | An agent with a calculator tool, in Strands Agents and the Vercel AI SDK |
| [bidirectional-streaming](./bidirectional-streaming/) | Full-duplex communication over WebSocket connections                     |
| [async-agent](./async-agent/)                         | An agent that keeps its session alive while background work runs         |
