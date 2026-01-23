# Customer Support Multi-Agent

Deploy a multi-agent customer support system to Amazon Bedrock AgentCore Runtime.

## Prerequisites

- Node.js 20+
- AWS credentials configured

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Orchestrator Agent                   │
│  Routes requests to appropriate specialist              │
└─────────────────┬───────────────┬───────────────┬───────┘
                  │               │               │
         ┌────────▼───────┐ ┌────▼────────┐ ┌────▼────────┐
         │ Warranty Agent │ │ Tech Support│ │ Scheduling  │
         │- check_warranty│ │-troubleshoot│ │-appointments│
         └────────────────┘ └─────────────┘ └─────────────┘
```

## Implementation

```typescript
// Specialized agents wrapped as tools for the orchestrator
const warrantyTool = tool({
  name: 'warranty_specialist',
  description: 'Handles warranty checks and policy questions',
  inputSchema: z.object({ query: z.string() }),
  callback: async ({ query }) => {
    const result = await warrantyAgent.invoke(query)
    return result.message?.content?.[0]?.text ?? String(result)
  },
})

const orchestrator = new Agent({
  model: new BedrockModel({ modelId: 'global.amazon.nova-2-lite-v1:0' }),
  tools: [warrantyTool, techSupportTool, schedulingTool],
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, _context) {
      for await (const event of orchestrator.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }
    },
  },
})

app.run()
```

→ [Full source](./src/index.ts) | [Agents](./src/agents.ts)

## Quick Start

Requires AWS credentials in your shell (for Bedrock model access).

```bash
npm install
make dev
```

## Test

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Check warranty for serial number MNO33333333"}'
```

## Deploy to AWS

```bash
make build-and-push
make deploy
```

## Test Deployed Agent

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
  --payload '{"prompt": "Check warranty for serial MNO33333333"}' \
  --cli-binary-format raw-in-base64-out \
  --region us-east-1 \
  /dev/stdout
```

## Sample Queries

1. "I have a Gaming Console Pro device, warranty serial number is MNO33333333"
2. "I have overheating issues with my device, help me debug"
3. "Can you schedule a support call for warranty renewal?"
4. "Check available slots and book one for warranty renewal"

## Run Tests

```bash
npx tsx test/invoke.ts <RuntimeArn from deploy output>
```

## Clean Up

```bash
make delete
```
