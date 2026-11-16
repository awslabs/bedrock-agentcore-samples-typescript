# Amazon Bedrock AgentCore Browser — Live View Agent

Watch an AI agent browse the web in real time. This local app embeds a live stream of an [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/) Browser session into a React app with the `BrowserLiveView` component from the [AgentCore TypeScript SDK](https://github.com/aws/bedrock-agentcore-sdk-typescript), while an agent navigates, clicks, types and reads pages.

→ [All use cases](../README.md)

## How It Works

1. **React client** (Vite) renders `<BrowserLiveView>`, which streams the cloud browser over the Amazon DCV protocol, and shows the activity log and the agent's answer.
2. **Fastify server** starts the browser session, generates a SigV4-presigned live view URL, and runs the agent loop with the [Bedrock Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html) and browser tools backed by `PlaywrightBrowser`.
3. **AWS**: AgentCore Browser runs the isolated browser; Amazon Bedrock runs the model.

```
Your browser ──► Vite (localhost:5173) ──/api──► Fastify server (127.0.0.1:3001)
     ▲                                              │  PlaywrightBrowser ──► AgentCore Browser
     │                                              │  Converse API      ──► Amazon Bedrock
     └──────── DCV live view stream, directly from AgentCore ──────────────┘
```

The browser only talks to Vite, which proxies `/api` to the server. The server listens on `127.0.0.1` only and refuses requests from any other origin, because it acts with your AWS credentials. The live view stream goes directly from AgentCore to your browser through the presigned URL; it doesn't pass through the server.

## Prerequisites

- Node.js 22+
- AWS credentials with access to `bedrock-agentcore` (browser sessions) and `bedrock:InvokeModel`, from any source the [default credential chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html) supports (`aws configure`, `aws sso login`, environment variables)
- Access to the model in Amazon Bedrock (default `global.anthropic.claude-haiku-5-5`)

## Run It

```bash
git clone https://github.com/awslabs/bedrock-agentcore-samples-typescript.git
cd bedrock-agentcore-samples-typescript/use-cases/browser-live-view-agent
npm install
export AWS_REGION=us-east-1
npm run dev
```

Open http://localhost:5173, enter a task such as `Go to example.com and tell me the page title`, and click **Launch Agent**. The live view shows the agent's browser while the activity log lists each tool call.

Click **Stop Session** when you're done. Stopping the server (Ctrl+C) also stops the browser session, so it doesn't keep running until its one-hour timeout.

## Configuration

| Variable             | Default                             | Description                                  |
| -------------------- | ----------------------------------- | -------------------------------------------- |
| `AWS_REGION`         | `us-east-1`                         | Region for AgentCore Browser and Bedrock     |
| `BEDROCK_MODEL_ID`   | `global.anthropic.claude-haiku-5-5` | Any Bedrock model that supports tool use     |
| `BROWSER_IDENTIFIER` | `aws.browser.v1`                    | AgentCore browser (or your custom browser)   |
| `PORT`               | `3001`                              | Agent server port (Vite proxies `/api` here) |
| `CLIENT_PORT`        | `5173`                              | Vite port; the only origin the server allows |

For example, to run on other ports: `PORT=3101 CLIENT_PORT=5174 npm run dev`.

## Project Structure

```
browser-live-view-agent/
├── server/
│   ├── config.ts      # Environment configuration
│   ├── agent.ts       # Browser session lifecycle + Converse API agent loop
│   └── index.ts       # Fastify API (start, run-agent, status, stop), origin check, shutdown cleanup
├── src/
│   ├── App.tsx        # Live view, prompt, activity log, result
│   ├── main.tsx
│   └── constants.ts   # Remote viewport size (matches the server's)
├── index.html
├── vite.config.ts     # DCV SDK aliases and static copy, /api proxy
└── package.json
```

## Key Code

**Start a session and get a live view URL (server):**

```typescript
import { PlaywrightBrowser } from 'bedrock-agentcore/browser/playwright'

const browser = new PlaywrightBrowser({ region: 'us-east-1' })
await browser.startSession({ viewport: { width: 1920, height: 1080 } })
const liveViewUrl = await browser.generateLiveViewUrl() // presigned, valid for 5 minutes

await browser.navigate({ url: 'https://example.com' })
const text = await browser.getText()
```

→ [Full source](./server/agent.ts)

**Embed the live view (client):**

```tsx
import { BrowserLiveView } from 'bedrock-agentcore/browser/live-view'

;<BrowserLiveView signedUrl={liveViewUrl} remoteWidth={1920} remoteHeight={1080} />
```

→ [Full source](./src/App.tsx)

### Vite Configuration

`BrowserLiveView` uses the Amazon DCV Web Client SDK, which ships inside `bedrock-agentcore`. The Vite config:

- **`resolve.alias`** points the `dcv` and `dcv-ui` imports to the vendored SDK files
- **`resolve.dedupe`** makes React and Cloudscape (used by the DCV UI) resolve from your `node_modules`
- **`viteStaticCopy`** serves the DCV workers and decoders at `/nice-dcv-web-client-sdk/dcvjs-esm`, where `BrowserLiveView` loads them at runtime

→ [vite.config.ts](./vite.config.ts)

## Using Agent Frameworks

This sample calls the Converse API directly. The SDK's framework integrations wrap the same `PlaywrightBrowser`, so the live view works the same way: take the URL from `getClient()`.

**Vercel AI SDK** (`ai`, `@ai-sdk/amazon-bedrock`):

```typescript
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { ToolLoopAgent } from 'ai'
import { BrowserTools } from 'bedrock-agentcore/browser/vercel-ai'

const browser = new BrowserTools({ region: 'us-east-1' })
await browser.getClient().startSession({ viewport: { width: 1920, height: 1080 } })
const liveViewUrl = await browser.getClient().generateLiveViewUrl()

const bedrock = createAmazonBedrock({ region: 'us-east-1', credentialProvider: fromNodeProviderChain() })
const agent = new ToolLoopAgent({
  model: bedrock('global.anthropic.claude-haiku-5-5'),
  instructions: 'You are a browser automation agent. Use the browser tools to answer.',
  tools: browser.tools,
})
const { text } = await agent.generate({ prompt: 'Go to example.com and tell me the page title' })
await browser.stopSession()
```

**Strands Agents** (`@strands-agents/sdk`, experimental integration):

```typescript
import { Agent, BedrockModel } from '@strands-agents/sdk'
import { BrowserTools } from 'bedrock-agentcore/experimental/browser/strands'

const browser = new BrowserTools({ region: 'us-east-1' })
await browser.getClient().startSession({ viewport: { width: 1920, height: 1080 } })
const liveViewUrl = await browser.getClient().generateLiveViewUrl()

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region: 'us-east-1' }),
  tools: browser.tools,
})
const result = await agent.invoke('Go to example.com and tell me the page title')
await browser.stopSession()
```

## Related Resources

- [AgentCore TypeScript SDK](https://github.com/aws/bedrock-agentcore-sdk-typescript)
- [AgentCore Browser documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/browser-tool.html)
- [Amazon Bedrock AgentCore pricing](https://aws.amazon.com/bedrock/agentcore/pricing/)
- [AgentCore samples (Python)](https://github.com/awslabs/amazon-bedrock-agentcore-samples)
