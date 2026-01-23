# Hosting an Agent (Strands)

Deploy a Strands agent to Amazon Bedrock AgentCore Runtime.

→ See [parent README](../README.md) for full context on hosting agents.

## Prerequisites

- Node.js 20+
- AWS credentials configured
- [AgentCore Starter Toolkit](https://github.com/aws/bedrock-agentcore-starter-toolkit):

```bash
pip install bedrock-agentcore-starter-toolkit
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
      case 'add':
        return a + b
      case 'subtract':
        return a - b
      case 'multiply':
        return a * b
      case 'divide':
        return a / b
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
    process: async function* (request, _context) {
      for await (const event of agent.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }
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
```

Test with the CLI:

```bash
agentcore invoke --dev '{"prompt": "What is 25 * 4?"}'
```

Or with curl:

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
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

After deployment, your agent can also be invoked via AWS SDKs, APIs, or HTTP requests.

## Clean Up

```bash
agentcore destroy
```
