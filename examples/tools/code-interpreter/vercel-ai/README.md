# Code Interpreter - Vercel AI SDK

A data analysis agent using the Vercel AI SDK with AgentCore Code Interpreter.

See [parent README](../README.md) for network access configuration and artifact retrieval details.

## Quick Start

```bash
npm install
npm start
```

## Test - Server Mode

```bash
npm start  # Starts HTTP server on :8080

# In another terminal:
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Calculate the first 20 prime numbers"}'

# With artifact generation:
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Create a bar chart of fibonacci numbers 1-10 and save it"}'

ls output/  # Check saved artifacts
```

## Test - Interactive Mode

```bash
npm run start:interactive

> Calculate the first 10 fibonacci numbers
[agent response...]

> Create a bar chart of those numbers
--- Artifacts saved to ./output/: fib_chart.png ---

> exit
```

## How It Works

This sample uses `BedrockAgentCoreApp` which creates an HTTP server following the AgentCore Runtime protocol. The same code runs locally for development and deploys to AWS without changes.

For deployment, see [runtime examples](../../../runtime/).

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
  instructions: '... save artifacts to output/ ...',
})

// Artifacts saved to sandbox output/ are automatically retrieved and saved locally
```
