# Bidirectional Streaming

This sample demonstrates WebSocket bidirectional communication on AgentCore Runtime.

|                         |                          |
| ----------------------- | ------------------------ |
| **AgentCore component** | Runtime                  |
| **Protocol**            | HTTP (WebSocket upgrade) |
| **Pattern**             | Echo server              |

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

## Implementation

```typescript
import { BedrockAgentCoreApp, type RequestContext } from 'bedrock-agentcore/runtime'
import type { WebSocket } from 'ws'

const app = new BedrockAgentCoreApp({
  // HTTP handler (required)
  handler: async (request, context) => {
    return { message: 'Use WebSocket endpoint /ws' }
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

→ [Full source](./src/index.ts)

## Quick Start

No AWS credentials required (this is a simple echo server).

```bash
make dev
```

## Testing with wscat

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
make build-and-push
make deploy
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
