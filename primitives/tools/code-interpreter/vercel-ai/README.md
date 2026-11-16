# Code Interpreter (Vercel AI SDK)

A [Vercel AI SDK](https://ai-sdk.dev/) agent on AgentCore Runtime that runs Python in an AgentCore Code Interpreter
sandbox.

→ See the [parent README](../README.md) for what the sandbox provides.

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock and AgentCore
- The [AgentCore CLI](https://github.com/aws/agentcore-cli):

```bash
npm install -g @aws/agentcore
```

## Project Structure

```
vercel-ai/
├── app/agent/          # The agent: main.ts, package.json
└── agentcore/
    ├── agentcore.json  # Runtime configuration read by the AgentCore CLI
    └── cdk/            # CDK app the CLI deploys, with the Code Interpreter grant
```

## The Agent

```typescript
const codeInterpreter = new CodeInterpreterTools({ region })

const agent = new ToolLoopAgent({
  model: bedrock('global.anthropic.claude-haiku-5-5'),
  tools: codeInterpreter.tools,
  instructions:
    'You are a data analyst. Run Python in the sandbox to answer questions. Variables and files persist between calls.',
  toolCallConcurrency: 1,
})

const messages: ModelMessage[] = []

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      messages.push({ role: 'user', content: request.prompt })
      const stream = await agent.stream({ messages })

      for await (const part of stream.fullStream) {
        if (part.type === 'tool-call') {
          yield { event: 'tool', data: { name: part.toolName, input: part.input } }
        }
        if (part.type === 'text-delta') {
          yield { event: 'message', data: { text: part.text } }
        }
      }
      messages.push(...(await stream.responseMessages))
    },
  },
})
```

`codeInterpreter.tools` gives the agent `executeCode`, `executeCommand` and `fileOperations`. The sandbox starts on
the first tool call and keeps its variables and files for the rest of the session. `ToolLoopAgent` keeps no history,
so `messages` holds the conversation. Each `tool` event shows the code the agent runs.

→ [Full source](./app/agent/main.ts)

## Run Locally

```bash
agentcore dev
```

The first run installs the agent's dependencies. In a second terminal:

```bash
agentcore invoke --runtime agent --local --session-id fibonacci-demo-session-000000000001 \
  --payload '{"prompt": "Use Python to compute the first 15 Fibonacci numbers and store them in a variable named fib"}'
agentcore invoke --runtime agent --local --session-id fibonacci-demo-session-000000000001 \
  --payload '{"prompt": "Use Python to print the sum of fib and how many of its values are even"}'
```

The second prompt reuses `fib` from the sandbox:

```
event: tool
data: {"name":"executeCode","input":{"code":"total = sum(fib)\neven_count = sum(1 for x in fib if x % 2 == 0)\nprint(\"Sum:\", total)\nprint(\"Even count:\", even_count)","language":"python"}}

event: message
data: {"text":"The sum of `fib` is 986, and 5 of its values are even"}
...
```

Prefer a chat UI? `agentcore dev --mode browser` opens the Agent Inspector.

## Deploy

```bash
npm install --prefix agentcore/cdk
agentcore deploy
agentcore invoke --runtime agent --session-id fibonacci-demo-session-000000000001 \
  --payload '{"prompt": "Use Python to compute the first 15 Fibonacci numbers and store them in a variable named fib"}'
agentcore invoke --runtime agent --session-id fibonacci-demo-session-000000000001 \
  --payload '{"prompt": "Use Python to print the sum of fib and how many of its values are even"}'
```

`agentcore/cdk/lib/cdk-stack.ts` lets the runtime's role use the AWS-managed Code Interpreter. Each runtime session
runs in its own microVM with its own conversation and sandbox.

## Clean Up

```bash
agentcore remove all --yes
agentcore deploy --yes
```

This deletes the deployed stack. Run `git checkout agentcore` to restore the configuration and deploy again.
