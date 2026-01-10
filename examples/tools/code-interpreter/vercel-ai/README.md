# Code Interpreter - Vercel AI SDK

A data analysis agent using the Vercel AI SDK with AgentCore Code Interpreter.

See [parent README](../README.md) for network access configuration and retrieving artifacts.

## Quick Start

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
  -d '{"prompt": "Calculate the first 20 prime numbers and sum them up"}'
```

## Deploy

```bash
make build-and-push
make deploy
make outputs
```

## Code Highlights

```typescript
import { ToolLoopAgent } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { CodeInterpreterTools } from 'bedrock-agentcore/code-interpreter/vercel-ai'

const bedrock = createAmazonBedrock({ region: 'us-east-1' })
const codeInterpreter = new CodeInterpreterTools({ region: 'us-east-1' })

const agent = new ToolLoopAgent({
  model: bedrock('global.anthropic.claude-haiku-4-5-20251001-v1:0'),
  tools: codeInterpreter.tools,
})

const stream = await agent.stream({ prompt })
for await (const chunk of stream.textStream) {
  console.log(chunk)
}
```
