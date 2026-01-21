# Hosting an Agent (Strands)

Deploy a Strands agent to Amazon Bedrock AgentCore Runtime.

|                         |                    |
| ----------------------- | ------------------ |
| **AgentCore component** | Runtime            |
| **Framework**           | Strands Agents SDK |
| **Model**               | Amazon Nova 2 Lite |

→ See [parent README](../README.md) for full context on hosting agents.

## Prerequisites

- Node.js 20+
- AWS credentials configured
- [AgentCore Starter Toolkit](https://github.com/aidandaly24/bedrock-agentcore-starter-toolkit/tree/feat/typescript-container-deployment):

```bash
pip install git+https://github.com/aidandaly24/bedrock-agentcore-starter-toolkit.git@feat/typescript-container-deployment
```

## Implementation

```typescript
import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const requestSchema = z.object({ prompt: z.string() })

const calculator = tool({
  name: 'calculator',
  description: 'Performs basic arithmetic',
  inputSchema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  callback: ({ operation, a, b }) => {
    switch (operation) {
      case 'add': return a + b
      case 'subtract': return a - b
      case 'multiply': return a * b
      case 'divide': return a / b
    }
  },
})

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  tools: [calculator],
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async (request, _context) => {
      const response = await agent.invoke(request.prompt)
      return response
    },
  },
})

app.run()
```

→ [Full source](./agent.ts)

## Quick Start

Install dependencies:

```bash
npm install
```

Configure the agent (specify `agent.ts` as the entrypoint):

```bash
agentcore configure
```

Accept defaults for all prompts, except for memory—enter `s` to skip memory creation.

## Local Development

Start the local dev server:

```bash
agentcore dev
# or
npm run dev
```

Test with the CLI:

```bash
agentcore invoke --local '{"prompt": "What is 25 * 4?"}'
```

Or with curl:

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "What is 25 * 4?"}'
```

## Deploy to AWS

```bash
agentcore deploy
```

## Test Deployed Agent

```bash
agentcore invoke '{"prompt": "What is 25 * 4?"}'
```

## Clean Up

```bash
agentcore destroy
```
