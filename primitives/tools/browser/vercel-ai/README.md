# Browser (Vercel AI SDK)

A [Vercel AI SDK](https://ai-sdk.dev/) agent on AgentCore Runtime that browses real sites in an AgentCore Browser
session.

→ See the [parent README](../README.md) for the browser tools and how sessions work.

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock and AgentCore
- Docker, Podman or Finch, to run the agent's container locally
- The [AgentCore CLI](https://github.com/aws/agentcore-cli):

```bash
npm install -g @aws/agentcore
```

## Project Structure

```
vercel-ai/
├── app/agent/          # The agent: main.ts, package.json, Dockerfile
└── agentcore/
    ├── agentcore.json  # Runtime configuration read by the AgentCore CLI
    └── cdk/            # CDK app the CLI deploys, with the Browser grant
```

## The Agent

```typescript
const browser = new BrowserTools({ region })

const agent = new ToolLoopAgent({
  model: bedrock('global.anthropic.claude-haiku-5-5'),
  instructions:
    'You are a web assistant with a cloud browser. Each request starts with a fresh browser, so navigate first. ' +
    'Never enter payment or other sensitive details; hand off to the user instead.',
  tools: browser.tools,
  // The tools share one browser session, so they run one at a time
  toolCallConcurrency: 1,
})

const messages: ModelMessage[] = []

// The agent and its browser serve one request at a time; an overlapping request must not stop the browser in use
let busy = false

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      if (busy) {
        yield { event: 'error', data: { error: 'The agent is still answering another request' } }
        return
      }
      busy = true
      const userMessage: ModelMessage = { role: 'user', content: request.prompt }
      try {
        const stream = await agent.stream({ messages: [...messages, userMessage] })

        for await (const part of stream.fullStream) {
          if (part.type === 'tool-call') {
            yield { event: 'tool', data: { name: part.toolName, input: part.input } }
          }
          if (part.type === 'text-delta') {
            yield { event: 'message', data: { text: part.text } }
          }
        }
        // The turn joins the history only once it completes, so a failed or abandoned request leaves nothing behind
        messages.push(userMessage, ...(await stream.responseMessages))
      } finally {
        await browser.stopSession()
        busy = false
      }
    },
  },
})
```

`browser.tools` gives the agent `navigate`, `click`, `type`, `getText`, `getHtml`, `screenshot` and `evaluate`. The
browser starts on the first tool call and is stopped when the request finishes, so no session is left running.
`ToolLoopAgent` keeps no history, so `messages` holds the conversation. Each `tool` event shows what the agent does in
the browser.

→ [Full source](./app/agent/main.ts)

## Run Locally

```bash
agentcore dev
```

The first run builds the agent's container image. In a second terminal:

```bash
agentcore invoke --runtime agent --local --session-id browser-session-00000000000000000001 \
  --payload '{"prompt": "Go to https://news.ycombinator.com and list the top 3 story titles"}'
agentcore invoke --runtime agent --local --session-id browser-session-00000000000000000001 \
  --payload '{"prompt": "Now list the first 3 titles on the second page"}'
```

The second prompt relies on the conversation: the agent remembers the site and opens its second page.

Prefer a chat UI? `agentcore dev --mode browser` opens the Agent Inspector.

## Deploy

```bash
npm install --prefix agentcore/cdk
agentcore deploy
agentcore invoke --runtime agent --session-id browser-session-00000000000000000001 \
  --payload '{"prompt": "Go to https://news.ycombinator.com and list the top 3 story titles"}'
agentcore invoke --runtime agent --session-id browser-session-00000000000000000001 \
  --payload '{"prompt": "Now list the first 3 titles on the second page"}'
```

`agentcore deploy` builds the image in AWS CodeBuild, and `agentcore/cdk/lib/cdk-stack.ts` lets the runtime's role
use the AWS-managed Browser. Each runtime session runs in its own microVM with its own conversation and browser.

## Clean Up

```bash
agentcore remove all --yes
agentcore deploy --yes
```

This deletes the deployed stack. Run `git checkout -- agentcore` to restore the configuration and deploy again.
