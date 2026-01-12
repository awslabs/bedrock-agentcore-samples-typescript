# Browser Automation - Strands SDK

A web automation agent using the Strands Agents SDK with AgentCore Browser tool.

See [parent README](../README.md) for browser capabilities.

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
  -d '{"prompt": "Go to amazon.com and search for Echo Show devices. Open the product page of one, and save a screenshot."}'
```

## Test - Interactive Mode

```bash
npm run start:interactive

> Go to amazon.com and search for Echo Show
[agent navigates and searches...]

> Open the first product and take a screenshot
[agent clicks product, captures screenshot...]

> exit
```

## How It Works

This sample uses `BedrockAgentCoreApp` which creates an HTTP server following the AgentCore Runtime protocol. The same code runs locally for development and deploys to AWS without changes.

For deployment, see [runtime examples](../../../runtime/).

## Code Highlights

```typescript
import { Agent, BedrockModel } from '@strands-agents/sdk'
import { BrowserTools } from 'bedrock-agentcore/browser/strands'

const browserTools = new BrowserTools({ region: 'us-east-1' })

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-4-5-20251001-v1:0' }),
  tools: browserTools.tools,
})
```
