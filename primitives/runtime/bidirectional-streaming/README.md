# Bidirectional Streaming

Real-time, full-duplex communication using WebSocket connections.

## Testing Local vs Deployed

### Local Development

Run `make dev` and connect directly with any WebSocket client:

```bash
wscat -c ws://localhost:8080/ws \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123"
```

No authentication required - the connection goes directly to your local server.

### Deployed Runtime

Deployed runtimes require authenticated WebSocket connections. Use `RuntimeClient` to handle signing:

```typescript
import { RuntimeClient } from 'bedrock-agentcore/runtime'
import { WebSocket } from 'ws'

const client = new RuntimeClient({ region: 'us-east-1' })

// For IAM authentication (SigV4 signing)
const { url, headers } = await client.generateWsConnection({
  runtimeArn: process.env.RUNTIME_ARN!,
})

// For OAuth authentication (bearer token)
const { url, headers } = await client.generateWsConnectionOAuth({
  runtimeArn: process.env.RUNTIME_ARN!,
  bearerToken: userToken,
})

const ws = new WebSocket(url, { headers })
```

See the [echo sample](./echo/) for a complete test client implementation.
