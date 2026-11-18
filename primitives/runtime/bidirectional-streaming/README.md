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
import { randomUUID } from 'node:crypto'
import { RuntimeClient } from 'bedrock-agentcore/runtime'
import { WebSocket } from 'ws'

async function connect(urlOrArn: string): Promise<WebSocket> {
  if (urlOrArn.startsWith('ws://')) {
    return new WebSocket(urlOrArn, { headers: { 'x-amzn-bedrock-agentcore-runtime-session-id': randomUUID() } })
  }

  const region = urlOrArn.split(':')[3]
  const { url, headers } = await new RuntimeClient({ region }).generateWsConnection({ runtimeArn: urlOrArn })
  return new WebSocket(url, { headers })
}
```

For OAuth, `generateWsConnectionOAuth({ runtimeArn, bearerToken })` returns the same `url` and `headers`.

This is the [echo sample's client](./echo/app/agent/client.ts): it connects directly to a local URL and signs the
connection for a runtime ARN.
