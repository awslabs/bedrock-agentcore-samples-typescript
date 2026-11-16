# Code Interpreter (Strands)

A data analysis agent built with [Strands Agents](https://strandsagents.com/) that runs Python in an AgentCore Code
Interpreter sandbox and saves the charts it makes to your machine.

→ See the [parent README](../README.md) for sandbox capabilities, artifact retrieval and network access.

## Prerequisites

- Node.js 22+
- AWS credentials allowed to invoke Amazon Bedrock models and use AgentCore Code Interpreter

## Project Structure

```
strands/
├── src/index.ts        # The agent server
└── src/interactive.ts  # Chat client for the running server
```

## The Agent

```typescript
function createConversation(): Conversation {
  const codeInterpreter = new CodeInterpreterTools({ region })
  const agent = new Agent({
    model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region }),
    tools: codeInterpreter.tools,
    systemPrompt,
    toolExecutor: 'sequential',
  })
  return { agent, codeInterpreter }
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, context) {
      const { agent, codeInterpreter } = await getConversation(context.sessionId)
      // stream the agent's text, then copy the sandbox's output/ files to ./output/
    },
  },
})
```

Each session ID gets its own agent and sandbox. The sandbox starts on the first tool call, and stopping the server
(Ctrl+C) stops every sandbox it started.

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
  -d '{"prompt": "Use Python to calculate the first 20 prime numbers and their sum, then create a bar chart of them and save it to output/primes.png"}'
```

```
event: message
data: {"text":"The"}

event: message
data: {"text":" first"}
...
event: message
data: {"text":"\n\n--- Artifacts saved to ./output/: primes.png ---"}
```

## Chat Interactively

With the server running, start the chat client in a second terminal. It keeps one session, so the agent remembers
earlier turns and the sandbox keeps its variables:

```bash
npm run start:interactive
```

```
> Use Python to calculate the first 10 fibonacci numbers and store them in a variable named fib
I calculated the first 10 Fibonacci numbers in Python and stored them in a list named `fib` ...

> Create a bar chart of those numbers and save it to output/fib_chart.png
I saved the bar chart to `output/fib_chart.png`. ...

--- Artifacts saved to ./output/: fib_chart.png ---

> exit
```

Set `SERVER_URL` if the server runs elsewhere than `http://localhost:8080`.
