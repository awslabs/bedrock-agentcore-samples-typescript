# Bidirectional Streaming (Echo)

A WebSocket echo server on Amazon Bedrock AgentCore Runtime: the smallest example of full-duplex communication.

→ See the [parent README](../README.md) for how bidirectional streaming works.

## Prerequisites

- Node.js 22+
- AWS credentials with access to AgentCore (for deploying)
- The [AgentCore CLI](https://github.com/aws/agentcore-cli):

```bash
npm install -g @aws/agentcore
```

## Project Structure

```
echo/
├── app/agent/
│   ├── main.ts         # The WebSocket server
│   └── client.ts       # A client for the local or deployed server
└── agentcore/
    ├── agentcore.json  # Runtime configuration read by the AgentCore CLI
    └── cdk/            # CDK app the CLI deploys
```

## The Agent

```typescript
const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async (): Promise<{ message: string }> => {
      return { message: 'Use the WebSocket endpoint /ws for bidirectional streaming' }
    },
  },

  websocketHandler: async (socket, context) => {
    socket.on('message', (data) => {
      const received = parseMessage(String(data))

      if (received === undefined) {
        socket.send(JSON.stringify({ type: 'error', error: 'Messages must be JSON' }))
        return
      }

      socket.send(
        JSON.stringify({ type: 'echo', sessionId: context.sessionId, received, timestamp: new Date().toISOString() })
      )
    })
  },
})
```

`websocketHandler` serves `/ws` next to the HTTP `/invocations` endpoint. Each connection belongs to one runtime
session.

→ [Full source](./app/agent/main.ts)

## Run Locally

```bash
agentcore dev
```

The first run installs the agent's dependencies. In a second terminal, send two messages with the included client:

```bash
npm run client --prefix app/agent -- ws://localhost:8080/ws
```

```
Connected
Received: {"type":"echo","sessionId":"f8b9063e-...","received":{"message":"hello"},"timestamp":"..."}
Received: {"type":"error","error":"Messages must be JSON"}
Closed
```

## Deploy

```bash
npm install --prefix agentcore/cdk
agentcore deploy
agentcore status
```

Deployed runtimes only accept signed WebSocket connections. Given a runtime ARN instead of a URL, the client signs the
connection with `RuntimeClient` from the SDK. Pass it the ARN that `agentcore status` shows:

```bash
npm run client --prefix app/agent -- <runtime-arn>
```

## Clean Up

```bash
agentcore remove all --yes
agentcore deploy --yes
```

This deletes the deployed stack. Run `git checkout -- agentcore` to restore the configuration and deploy again.
