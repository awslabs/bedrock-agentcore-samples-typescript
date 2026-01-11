# Browser Grocery Shopping - Vercel AI SDK

A grocery shopping agent using the Vercel AI SDK with AgentCore Browser tool.

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
  -d '{"prompt": "Add milk, eggs, and butter to my willys.se cart"}'
```

## Test - Interactive Mode

```bash
npm run start:interactive

> Add milk and eggs to my willys.se cart
[agent navigates and adds items...]
Live View URL: https://...

> Now add butter
[agent adds butter...]

> exit
```

## How It Works

This sample uses `BedrockAgentCoreApp` which creates an HTTP server following the AgentCore Runtime protocol. The same code runs locally for development and deploys to AWS without changes.

For deployment, see [runtime examples](../../../runtime/).

## Code Highlights

```typescript
import { ToolLoopAgent } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { BrowserTools } from 'bedrock-agentcore/browser/vercel-ai'

const bedrock = createAmazonBedrock({ region: 'us-east-1' })
const browserTools = new BrowserTools({ region: 'us-east-1' })

const agent = new ToolLoopAgent({
  model: bedrock('global.anthropic.claude-haiku-4-5-20251001-v1:0'),
  tools: browserTools.tools,
})

// Get Live View URL for user handoff
const session = await browserTools.getClient().getSession()
const liveViewUrl = session.streams?.liveViewStream?.streamEndpoint
```

## Human Handoff

The agent stops before payment and provides a Live View URL so users can:
1. See the browser session in real-time
2. Take control to complete checkout
3. Enter payment details securely
