# Hosting an Agent

Deploy an AI agent to AgentCore Runtime. The agent receives prompts, calls a calculator tool, and streams its answer
back.

## What This Sample Demonstrates

- Wrapping an agent framework with `BedrockAgentCoreApp`
- Streaming responses from an async generator
- Tool use (a calculator the agent can call)
- Request validation with Zod schemas

## Samples

| Sample                    | What it shows                                 |
| ------------------------- | --------------------------------------------- |
| [strands](./strands/)     | A Strands Agents agent with a calculator tool |
| [vercel-ai](./vercel-ai/) | A Vercel AI SDK agent with a calculator tool  |

## The Agent

### Strands Agents

```typescript
const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.anthropic.claude-haiku-5-5',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
    maxTokens: 8192,
  }),
  tools: [calculator],
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      for await (const event of agent.stream(request.prompt)) {
        if (
          event.type === 'modelStreamUpdateEvent' &&
          event.event.type === 'modelContentBlockDeltaEvent' &&
          event.event.delta.type === 'textDelta'
        ) {
          yield { event: 'message', data: { text: event.event.delta.text } }
        }
      }
    },
  },
})
```

→ [Full source](./strands/app/agent/main.ts)

### Vercel AI SDK

```typescript
const agent = new ToolLoopAgent({
  model: bedrock('global.anthropic.claude-haiku-5-5'),
  tools: { calculator },
})

const messages: ModelMessage[] = []

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      const userMessage: ModelMessage = { role: 'user', content: request.prompt }
      const stream = await agent.stream({ messages: [...messages, userMessage] })

      for await (const chunk of stream.textStream) {
        yield { event: 'message', data: { text: chunk } }
      }
      // The turn joins the history only once it completes, so a failed or abandoned request leaves nothing behind
      messages.push(userMessage, ...(await stream.responseMessages))
    },
  },
})
```

The Strands `Agent` keeps the conversation itself. `ToolLoopAgent` keeps no history, so `messages` holds the
conversation.

→ [Full source](./vercel-ai/app/agent/main.ts)

## Quick Start

```bash
cd strands  # or vercel-ai
agentcore dev
```

In a second terminal:

```bash
agentcore invoke --runtime agent --local --payload '{"prompt": "What is 25 * 4?"}'
```

Then deploy it and invoke the deployed agent:

```bash
npm install --prefix agentcore/cdk
agentcore deploy
agentcore invoke --runtime agent --payload '{"prompt": "What is 25 * 4?"}'
```

## How It Works

```
┌────────┐       ┌───────────────────────────────────┐       ┌─────────┐
│        │       │         AgentCore Runtime         │       │         │
│ Client │──────▶│                                   │──────▶│   LLM   │
│        │◀──────│  BedrockAgentCoreApp              │◀──────│         │
│        │       │    ├── Agent                      │       │         │
└────────┘       │    └── Tools (calculator)         │       └─────────┘
                 │                                   │
                 └───────────────────────────────────┘
```

1. The client sends a request to the AgentCore Runtime endpoint
2. `BedrockAgentCoreApp` validates it against `requestSchema` and passes it to your handler
3. The agent streams its response, calling tools as needed
4. Each `yield` is sent to the client as a server-sent event

## Request and Response

**Request:**

```json
{ "prompt": "What is 25 * 4?" }
```

**Response (server-sent events):**

```
event: message
data: {"text":"25 × 4"}

event: message
data: {"text":" = 100."}
```
