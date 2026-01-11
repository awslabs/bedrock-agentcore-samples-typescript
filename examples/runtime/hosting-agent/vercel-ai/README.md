# Hosting an Agent (Vercel AI SDK)

Deploy an agent using Vercel AI SDK to Amazon Bedrock AgentCore Runtime.

|                         |                    |
| ----------------------- | ------------------ |
| **AgentCore component** | Runtime            |
| **Framework**           | Vercel AI SDK      |
| **Model**               | Amazon Nova 2 Lite |

→ See [parent README](../README.md) for full context on hosting agents.

## Implementation

```typescript
import { ToolLoopAgent, tool } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const bedrock = createAmazonBedrock({ region: 'us-east-1' })

const requestSchema = z.object({ prompt: z.string() })

const calculator = tool({
  description: 'Performs basic arithmetic',
  inputSchema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ operation, a, b }) => {
    switch (operation) {
      case 'add':
        return { result: a + b }
      case 'subtract':
        return { result: a - b }
      case 'multiply':
        return { result: a * b }
      case 'divide':
        return { result: a / b }
    }
  },
})

const agent = new ToolLoopAgent({
  model: bedrock('global.amazon.nova-2-lite-v1:0'),
  tools: { calculator },
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, _context) {
      const stream = await agent.stream({ prompt: request.prompt })
      for await (const chunk of stream.textStream) {
        yield { event: 'message', data: { text: chunk } }
      }
    },
  },
})

app.run()
```

→ [Full source](./src/index.ts)

## Quick Start

Requires AWS credentials in your shell (for Bedrock model access).

```bash
make dev
```

## Test

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "What is 25 * 4?"}'
```

## Deploy to AWS

```bash
make build-and-push
make deploy
```

## Test Deployed Agent

Invoke using AWS CLI, AWS SDKs, or HTTP requests to the AgentCore endpoint.

Get the Runtime ARN from the stack outputs:

```bash
make outputs
```

Invoke the deployed agent:

```bash
aws bedrock-agentcore invoke-agent-runtime \
  --agent-runtime-arn "<RuntimeArn from outputs>" \
  --runtime-session-id "test-session-00000000000000000001" \
  --content-type "application/json" \
  --accept "text/event-stream" \
  --payload '{"prompt": "What is 25 * 4?"}' \
  --cli-binary-format raw-in-base64-out \
  --region us-east-1 \
  /dev/stdout
```

## Clean Up

```bash
make delete
```
