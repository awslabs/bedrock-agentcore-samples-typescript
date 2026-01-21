# Bidirectional Streaming

This sample demonstrates WebSocket bidirectional communication on AgentCore Runtime.

|                         |                  |
| ----------------------- | ---------------- |
| **AgentCore component** | Runtime          |
| **Protocol**            | HTTP (WebSocket) |
| **Pattern**             | Echo server      |

## What This Sample Demonstrates

- Using `websocketHandler` in `BedrockAgentCoreApp`
- Full-duplex WebSocket communication
- Session context in WebSocket connections
- Message sending and receiving patterns

## What is Bidirectional Streaming?

Unlike HTTP request/response, WebSocket enables full-duplex communication — both client and server can send messages at any time without waiting for the other. This is essential for:

- **Real-time chat** — Messages flow in both directions instantly
- **Live updates** — Server pushes data as it becomes available
- **Voice/audio** — Continuous audio streaming (future: Nova Sonic integration)

## Prerequisites

- Node.js 20+
- AWS credentials configured (for deployment)
- [AgentCore Starter Toolkit](https://github.com/aws/bedrock-agentcore-starter-toolkit):

```bash
pip install bedrock-agentcore-starter-toolkit
```

## Implementation

```typescript
import { BedrockAgentCoreApp, type RequestContext } from 'bedrock-agentcore/runtime'
import type { WebSocket } from 'ws'

const app = new BedrockAgentCoreApp({
  // HTTP handler (required)
  invocationHandler: {
    process: async (_request, _context) => {
      return { message: 'Use WebSocket endpoint /ws for bidirectional streaming' }
    },
  },

  // WebSocket handler for bidirectional streaming
  websocketHandler: async (socket: WebSocket, context: RequestContext) => {
    // Send welcome message
    socket.send(
      JSON.stringify({
        type: 'connected',
        sessionId: context.sessionId,
      })
    )

    // Echo messages back
    socket.on('message', (data) => {
      const message = JSON.parse(data.toString())
      socket.send(
        JSON.stringify({
          type: 'echo',
          received: message,
        })
      )
    })
  },
})

app.run()
```

→ [Full source](./agent.ts)

## Quick Start

Install dependencies:

```bash
npm install
```

Configure the agent (specify `agent.ts` as the entrypoint):

```bash
agentcore configure
```

Accept defaults for all prompts, except for memory—enter `s` to skip memory creation.

## Local Development

Start the local dev server (no AWS credentials required for this echo server):

```bash
agentcore dev
```

## Test - Local Development

Connect directly with any WebSocket client:

```bash
# Install wscat if needed
npm install -g wscat

# Connect to the WebSocket endpoint
wscat -c ws://localhost:8080/ws \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123"
```

**Expected output:**

```
Connected
< {"type":"connected","sessionId":"test-123"}
> {"message":"hello"}
< {"type":"echo","received":{"message":"hello"},"timestamp":"2025-01-08T..."}
```

## Deploy to AgentCore

```bash
agentcore deploy
```

## Test - Deployed Runtime

Deployed runtimes require authenticated WebSocket connections. Use the included test client which handles IAM authentication.

### Using the Test Client

```bash
npm run test:deployed -- "<runtime-arn>"
```

### How It Works

The test client ([client.ts](./client.ts)) uses `RuntimeClient` to handle SigV4 signing:

```typescript
import { RuntimeClient } from 'bedrock-agentcore/runtime'
import { WebSocket } from 'ws'

const client = new RuntimeClient({ region: 'us-east-1' })

const { url, headers } = await client.generateWsConnection({
  runtimeArn: RUNTIME_ARN,
  endpointName: 'DEFAULT',
})

const ws = new WebSocket(url, { headers })
```

`RuntimeClient` handles:

- AWS credential resolution (environment, profile, IAM role)
- SigV4 request signing
- Session ID generation

## Clean Up

```bash
agentcore destroy
```

## Key Concepts

### The `websocketHandler` Option

`BedrockAgentCoreApp` accepts an optional `websocketHandler` that receives:

- `socket` — The WebSocket connection (from `ws` package)
- `context` — Same `RequestContext` as HTTP, includes `sessionId`, `headers`, etc.

### Session ID

The session ID is passed via the `x-amzn-bedrock-agentcore-runtime-session-id` header during the WebSocket upgrade handshake.

### Endpoint

WebSocket connections use `GET /ws` with an HTTP upgrade handshake. The SDK handles the upgrade automatically when `websocketHandler` is provided.
