# Code Interpreter - Strands SDK

A data analysis agent using the Strands Agents SDK with AgentCore Code Interpreter.

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
import { Agent, BedrockModel } from '@strands-agents/sdk'
import { CodeInterpreterTools } from 'bedrock-agentcore/code-interpreter/strands'

const codeInterpreter = new CodeInterpreterTools({ region: 'us-east-1' })

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-4-5-20251001-v1:0' }),
  tools: codeInterpreter.tools,
})

for await (const event of agent.stream(prompt)) {
  // Handle streaming events
}
```
