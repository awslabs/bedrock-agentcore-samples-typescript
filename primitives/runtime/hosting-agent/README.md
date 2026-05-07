# Hosting an Agent

This sample shows how to deploy an AI agent to AgentCore Runtime. The agent receives prompts, uses tools to gather information, and streams responses back.

## What This Sample Demonstrates

- Wrapping an agent framework with `BedrockAgentCoreApp`
- Streaming responses using generator functions
- Tool use (a calculator that the agent can call)
- Request validation with Zod schemas

## Choose Your Framework

### [Strands Agents](./strands/)

Uses `@strands-agents/sdk` with native Bedrock integration.

```typescript
import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: 'us-east-1',
  }),
  tools: [calculator],
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async function* (request, _context) {
      for await (const event of agent.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }
    },
  },
})
```

→ [Full source](./strands/agent.ts)

---

### [Vercel AI](./vercel-ai/)

Uses `ai` SDK with `ToolLoopAgent` for agentic workflows.

```typescript
import { ToolLoopAgent, tool } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'

const bedrock = createAmazonBedrock({ region: 'us-east-1' })

const agent = new ToolLoopAgent({
  model: bedrock('global.amazon.nova-2-lite-v1:0'),
  tools: { calculator },
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async function* (request, _context) {
      const stream = await agent.stream({ prompt: request.prompt })
      for await (const chunk of stream.textStream) {
        yield { event: 'message', data: { text: chunk } }
      }
    },
  },
})
```

→ [Full source](./vercel-ai/agent.ts)

---

### [Claude Agent SDK](./claude-agent/)

Uses `@anthropic-ai/claude-agent-sdk` — model calls route through Amazon Bedrock via `CLAUDE_CODE_USE_BEDROCK=1`. Deployed via container image since the SDK spawns the Claude Code CLI as a subprocess.

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async function* (request, _context) {
      const response = query({
        prompt: request.prompt,
        options: { systemPrompt: "You're a helpful assistant.", maxTurns: 5, allowedTools: [] },
      })

      for await (const message of response) {
        if (message.type === 'assistant') {
          for (const block of message.message.content) {
            if (block.type === 'text') {
              yield { event: 'message', data: { text: block.text } }
            }
          }
        }
      }
    },
  },
})
```

→ [Full source](./claude-agent/src/agent.ts)

---

## Quick Start

For Strands or Vercel AI:

```bash
cd strands  # or vercel-ai

npm install
agentcore configure
agentcore dev       # Run locally
agentcore deploy    # Deploy to AgentCore
```

For Claude Agent SDK (container-based deployment):

```bash
cd claude-agent
npm install
npm run dev         # Run locally
./build-image.sh    # Build container
npm run deploy      # Deploy to AgentCore
```

## How It Works

```
┌────────┐       ┌───────────────────────────────────┐       ┌─────────┐
│        │       │    AgentCore Runtime Container    │       │         │
│ Client │──────▶│                                   │──────▶│   LLM   │
│        │◀──────│  BedrockAgentCoreApp              │◀──────│         │
│        │       │    ├── Agent                      │       │         │
└────────┘       │    └── Tools (calculator)         │       └─────────┘
                 │                                   │
                 └───────────────────────────────────┘
```

1. Client sends request to AgentCore Runtime endpoint
2. `BedrockAgentCoreApp` receives request, passes to your handler
3. Agent streams response, calling tools as needed
4. Handler yields events back to client

## Request/Response Format

**Request:**

```json
{ "prompt": "What is 25 * 4?" }
```

**Response (streamed):**

```json
{ "event": "message", "data": { "text": "The result of 25 × 4 is " } }
{ "event": "message", "data": { "text": "100." } }
```
