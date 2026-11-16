# Browser Live View Agent

A local web app where you watch an AI agent browse the web in an AgentCore Browser session, live.

→ See the [parent README](../README.md) for the other use cases.

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock and AgentCore Browser
- Access to the model in Amazon Bedrock (default `global.anthropic.claude-haiku-5-5`)

## Project Structure

```
browser-live-view-agent/
├── server/
│   ├── agent.ts       # The Strands agent, the browser session and the activity log
│   ├── index.ts       # Local API: start, run-agent, status, stop
│   └── config.ts      # Region, model, viewport and ports
├── src/
│   ├── App.tsx        # Live view, prompt, activity log and answer
│   └── main.tsx
├── index.html
└── vite.config.ts     # Live view assets and the /api proxy
```

## The Agent

```typescript
const browserTools = new BrowserTools({ region })
const browser = browserTools.getClient()

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region }),
  tools: [
    browserTools.navigate,
    browserTools.click,
    browserTools.type,
    browserTools.getText,
    browserTools.getHtml,
    browserTools.evaluate,
  ],
  systemPrompt,
  toolExecutor: 'sequential',
})

await browser.startSession({ viewport: { width: 1920, height: 1080 } })
const liveViewUrl = await browser.generateLiveViewUrl()

for await (const event of agent.stream(prompt)) {
  if (event.type === 'beforeToolCallEvent') {
    log(describeToolInput(event.toolUse.input), event.toolUse.name)
  }
}
```

The agent uses the SDK's Strands browser tools, which all drive one browser session, so they run one at a time. The
server starts that session itself to get a live view URL, and turns the agent's events into the activity log. The
`screenshot` tool is left out: it can write files on your machine, and the live view already shows the page.

→ [Full source](./server/agent.ts)

The client shows the session with the SDK's `BrowserLiveView` React component:

```tsx
<BrowserLiveView signedUrl={liveViewUrl} remoteWidth={viewport.width} remoteHeight={viewport.height} />
```

→ [Full source](./src/App.tsx)

## How It Works

```
Your browser ──► Vite (localhost:5173) ──/api──► Agent server (127.0.0.1:3001)
     ▲                                              │  Strands agent ──► Amazon Bedrock
     │                                              │  BrowserTools  ──► AgentCore Browser
     └──────── live view stream, straight from AgentCore ──────────────┘
```

The live view URL is presigned and valid for 5 minutes. The stream goes straight from AgentCore to your browser over
Amazon DCV; it doesn't pass through the server. `BrowserLiveView` loads the DCV client that ships inside
`bedrock-agentcore`, so `vite.config.ts` points the `dcv` and `dcv-ui` imports at it, dedupes React and Cloudscape (its
UI), and serves its workers at `/nice-dcv-web-client-sdk`.

The server acts with your AWS credentials, so it listens on `127.0.0.1` only and refuses requests from any origin other
than the Vite client. Your browser talks only to Vite, which passes `/api` on to the server.

## Run Locally

```bash
npm install
export AWS_REGION=us-east-1
npm run dev
```

Open http://localhost:5173, enter a task such as `Go to example.com and tell me the page title`, and click **Launch
Agent**. The live view shows the agent's browser, and the activity log lists each tool call.

Click **Stop Session** when you're done. Stopping the server (Ctrl+C) also stops the browser session, so it doesn't
keep running until its one-hour timeout.

## Configuration

| Variable             | Default                             | Description                                  |
| -------------------- | ----------------------------------- | -------------------------------------------- |
| `AWS_REGION`         | `us-east-1`                         | Region for AgentCore Browser and Bedrock     |
| `BEDROCK_MODEL_ID`   | `global.anthropic.claude-haiku-5-5` | Any Bedrock model that supports tool use     |
| `BROWSER_IDENTIFIER` | `aws.browser.v1`                    | AgentCore browser (or your custom browser)   |
| `PORT`               | `3001`                              | Agent server port (Vite proxies `/api` here) |
| `CLIENT_PORT`        | `5173`                              | Vite port; the only origin the server allows |

For example, to run on other ports: `PORT=3101 CLIENT_PORT=5174 npm run dev`.
