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
import { z } from 'zod'

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: 'us-east-1',
  }),
  tools: [calculator],
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
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
import { z } from 'zod'

const bedrock = createAmazonBedrock({ region: 'us-east-1' })

const agent = new ToolLoopAgent({
  model: bedrock('global.amazon.nova-2-lite-v1:0'),
  tools: { calculator },
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
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

## Input Validation

Validate invocation payloads before forwarding them to an agent. Keep the Zod string schema when adapting these
samples so prompts stay typed as strings.

## Quick Start

```bash
cd strands  # or vercel-ai

npm install
agentcore configure
agentcore dev       # Run locally
agentcore deploy    # Deploy to AgentCore
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
