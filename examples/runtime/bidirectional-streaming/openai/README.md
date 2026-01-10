# Bidirectional Streaming with OpenAI Agents SDK

This sample demonstrates WebSocket bidirectional communication on AgentCore Runtime using the OpenAI Agents SDK for realtime audio.

|                         |                          |
| ----------------------- | ------------------------ |
| **AgentCore component** | Runtime                  |
| **Protocol**            | HTTP (WebSocket upgrade) |
| **Pattern**             | OpenAI Realtime bridge   |

## What This Sample Demonstrates

- Using `websocketHandler` in `BedrockAgentCoreApp`
- Bridging AgentCore WebSocket with OpenAI's Realtime API
- Secure API key handling (NoEcho in CloudFormation)
- Audio streaming between client and OpenAI

## Prerequisites

- OpenAI API key with access to the Realtime API
- Copy `.env.example` to `.env` and add your key

## Implementation

```typescript
import { BedrockAgentCoreApp, type RequestContext } from 'bedrock-agentcore/runtime'
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime'
import type { WebSocket } from 'ws'

const agent = new RealtimeAgent({
  name: 'assistant',
  instructions: 'You are a helpful assistant.',
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async (_request, _context) => {
      return { message: 'Use WebSocket endpoint /ws for realtime audio' }
    },
  },

  websocketHandler: async (socket: WebSocket, context: RequestContext) => {
    const session = new RealtimeSession(agent, { transport: 'websocket' })
    await session.connect({ apiKey: process.env['OPENAI_API_KEY'] })

    // Bridge: Client → OpenAI
    socket.on('message', async (data) => {
      const event = JSON.parse(data.toString())
      if (event.type === 'audio') {
        await session.sendAudio(Buffer.from(event.audio, 'base64'))
      }
    })

    // Bridge: OpenAI → Client
    session.on('audio', (audio) => {
      socket.send(
        JSON.stringify({
          type: 'audio',
          audio: audio.toString('base64'),
        })
      )
    })

    session.on('transcript', (transcript) => {
      socket.send(
        JSON.stringify({
          type: 'transcript',
          text: transcript,
        })
      )
    })

    socket.on('close', () => session.close())
  },
})

app.run()
```

→ [Full source](./src/index.ts)

## Quick Start

Requires AWS credentials in your shell (for Bedrock model access) and an OpenAI API key.

```bash
# Setup environment
cp .env.example .env
# Edit .env with your OPENAI_API_KEY

make dev
```

## Testing

Connect to the WebSocket endpoint and send audio events:

```bash
wscat -c ws://localhost:8080/ws \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123"
```

**Message format:**

```json
// Client → Server (audio input)
{"type": "audio", "audio": "<base64-encoded-audio>"}

// Server → Client (audio response)
{"type": "audio", "audio": "<base64-encoded-audio>"}

// Server → Client (transcript)
{"type": "transcript", "text": "Hello, how can I help?"}
```

## Deploy to AgentCore

```bash
make build-and-push
make deploy
```

The CloudFormation template securely passes your API key using `NoEcho: true`.

## Key Concepts

### OpenAI Realtime API

The OpenAI Agents SDK provides `RealtimeAgent` and `RealtimeSession` for voice interactions:

- `RealtimeAgent` — Defines the agent's behavior and instructions
- `RealtimeSession` — Manages the WebSocket connection to OpenAI

### Bridge Pattern

This sample bridges two WebSocket connections:

1. **Client ↔ AgentCore** — Your application connects here
2. **AgentCore ↔ OpenAI** — The `RealtimeSession` handles this

Audio flows bidirectionally through the bridge, with transcripts forwarded to the client.

### Environment Variables

The `OPENAI_API_KEY` is:

- Stored locally in `.env` (git-ignored)
- Passed to CloudFormation with `NoEcho: true`
- Injected as a container environment variable
