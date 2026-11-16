# Bidirectional Streaming

Real-time, full-duplex communication over WebSocket connections: client and agent can both send messages at any time.

## Samples

### [echo](./echo/)

A WebSocket server that echoes every JSON message back, with a client that connects locally or to the deployed
runtime.

## Local vs Deployed

### Local Development

`agentcore dev` serves the WebSocket endpoint at `ws://localhost:8080/ws` with no authentication. Send the session ID in
the `x-amzn-bedrock-agentcore-runtime-session-id` header.

### Deployed Runtime

Deployed runtimes only accept authenticated WebSocket connections. `RuntimeClient` from the SDK signs them for the
[`ws`](https://github.com/websockets/ws) client:

```typescript
import { RuntimeClient } from 'bedrock-agentcore/runtime'
import { WebSocket } from 'ws'

const client = new RuntimeClient({ region: process.env['AWS_REGION'] ?? 'us-east-1' })

// IAM authentication (SigV4)
const { url, headers } = await client.generateWsConnection({ runtimeArn })

// Or OAuth authentication (bearer token)
// const { url, headers } = await client.generateWsConnectionOAuth({ runtimeArn, bearerToken })

const ws = new WebSocket(url, { headers })
```

The [echo sample's client](./echo/app/agent/client.ts) does both: it connects directly to a local URL and signs the
connection for a runtime ARN.
