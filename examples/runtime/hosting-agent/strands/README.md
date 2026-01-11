# Hosting an Agent (Strands)

Deploy a Strands agent to Amazon Bedrock AgentCore Runtime.

|                         |                    |
| ----------------------- | ------------------ |
| **AgentCore component** | Runtime            |
| **Framework**           | Strands Agents SDK |
| **Model**               | Amazon Nova 2 Lite |

→ See [parent README](../README.md) for full context on hosting agents.

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
    region: 'us-east-1',
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
