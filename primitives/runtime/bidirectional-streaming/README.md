# Bidirectional Streaming

Real-time, full-duplex communication over WebSocket connections: client and agent can both send messages at any time.

## Samples

| Sample          | What it shows                                                              |
| --------------- | -------------------------------------------------------------------------- |
| [echo](./echo/) | A WebSocket echo server: the smallest example of full-duplex communication |

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

const region = runtimeArn.split(':')[3]
const { url, headers } = await new RuntimeClient({ region }).generateWsConnection({ runtimeArn })
const ws = new WebSocket(url, { headers })
```

For OAuth, `generateWsConnectionOAuth({ runtimeArn, bearerToken })` returns the same `url` and `headers`.

The [echo sample's client](./echo/app/agent/client.ts) does both: it connects directly to a local URL and signs the
connection for a runtime ARN.
