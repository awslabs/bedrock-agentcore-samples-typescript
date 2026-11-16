# Browser (Strands)

A web automation agent built with [Strands Agents](https://strandsagents.com/) that browses real sites in an
AgentCore Browser session.

→ See the [parent README](../README.md) for the browser tools and how sessions work.

## Prerequisites

- Node.js 22+
- AWS credentials allowed to invoke Amazon Bedrock models and use AgentCore Browser

## Project Structure

```
strands/
├── src/index.ts        # The agent server
└── src/interactive.ts  # Chat client for the running server
```

## The Agent

```typescript
function createConversation(): Conversation {
  const browser = new BrowserTools({ region })
  const agent = new Agent({
    model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region }),
    tools: browser.tools,
    systemPrompt,
    toolExecutor: 'sequential',
  })
  return { agent, browser }
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, context) {
      const { agent } = await getConversation(context.sessionId)

      for await (const event of agent.stream(request.prompt)) {
        if (
          event.type === 'modelStreamUpdateEvent' &&
          event.event.type === 'modelContentBlockDeltaEvent' &&
          event.event.delta.type === 'textDelta'
        ) {
          yield { event: 'message', data: { text: event.event.delta.text } }
        }
      }
    },
  },
})
```

Each session ID gets its own agent and browser. The browser starts on the first tool call, and stopping the server
(Ctrl+C) stops every browser session it started.

→ [Full source](./src/index.ts)

## Run Locally

```bash
npm install
npm start
```

The server listens on port 8080 (set `PORT` to change it). In a second terminal:

```bash
curl -N -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Go to https://news.ycombinator.com, list the top 3 story titles, and save a screenshot to output/hn.png"}'
```

The agent streams its answer back as `event: message` server-sent events, and the screenshot lands in `./output/hn.png`.

## Chat Interactively

With the server running, start the chat client in a second terminal. It keeps one session, so the agent remembers
earlier turns and the browser stays on the page it left:

```bash
npm run start:interactive
```

```
> Go to https://news.ycombinator.com and list the top 3 story titles
The top 3 story titles on Hacker News right now are: ...

> Open the comments page of the second story and save a screenshot to output/comments.png
I opened the comments page for the second story ... and saved it to `output/comments.png`.

> exit
```

Set `SERVER_URL` if the server runs elsewhere than `http://localhost:8080`.
