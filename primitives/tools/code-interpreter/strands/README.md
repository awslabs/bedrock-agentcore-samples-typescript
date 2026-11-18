# Code Interpreter (Strands)

A [Strands Agents](https://strandsagents.com/) agent on AgentCore Runtime that runs Python in an AgentCore Code
Interpreter sandbox.

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
strands/
├── app/agent/          # The agent: main.ts, package.json
└── agentcore/
    ├── agentcore.json  # Runtime configuration read by the AgentCore CLI
    └── cdk/            # CDK app the CLI deploys, with the Code Interpreter grant
```

## The Agent

```typescript
const codeInterpreter = new CodeInterpreterTools({ region })

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region, maxTokens: 8192 }),
  systemPrompt:
    'You are a data analyst. Run Python in the sandbox to answer questions. Each request gets a fresh sandbox.',
  tools: codeInterpreter.tools,
  // The tools share one sandbox session, so they run one at a time
  toolExecutor: 'sequential',
})

// The agent and its sandbox serve one request at a time; an overlapping request must not stop the sandbox in use
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
      try {
        for await (const event of agent.stream(request.prompt)) {
          if (event.type === 'beforeToolCallEvent') {
            yield { event: 'tool', data: { name: event.toolUse.name, input: event.toolUse.input } }
          }
          // ...yield text deltas as message events
        }
      } finally {
        // A sandbox ends 15 minutes after it starts, so each request uses its own and stops it when done
        await codeInterpreter.stopSession()
        busy = false
      }
    },
  },
})
```

`codeInterpreter.tools` gives the agent `executeCode`, `executeCommand` and `fileOperations`. The sandbox starts on
the first tool call, keeps its variables and files across that request's tool calls, and is stopped when the request
finishes. The agent keeps the conversation. Each `tool` event shows the code the agent runs.

→ [Full source](./app/agent/main.ts)

## Run Locally

```bash
agentcore dev
```

The first run installs the agent's dependencies. In a second terminal:

```bash
agentcore invoke --runtime agent --local --session-id code-interpreter-session-00000000000000000001 \
  --payload '{"prompt": "Use Python to compute the first 15 Fibonacci numbers and store them in a variable named fib"}'
agentcore invoke --runtime agent --local --session-id code-interpreter-session-00000000000000000001 \
  --payload '{"prompt": "Use Python to print the sum of fib and how many of its values are even"}'
```

The second request gets a new sandbox, so the agent recreates `fib` from the conversation before using it:

```
event: tool
data: {"name":"executeCode","input":{"code":"try:
    fib
except NameError:
    fib = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]

total = sum(fib)
...","language":"python"}}

event: message
data: {"text":"The sum of `fib` is 986, and 5 of its values are even"}
...
```

Prefer a chat UI? `agentcore dev --mode browser` opens the Agent Inspector.

## Deploy

```bash
npm install --prefix app/agent
npm install --prefix agentcore/cdk
agentcore deploy
agentcore invoke --runtime agent --session-id code-interpreter-session-00000000000000000001 \
  --payload '{"prompt": "Use Python to compute the first 15 Fibonacci numbers and store them in a variable named fib"}'
agentcore invoke --runtime agent --session-id code-interpreter-session-00000000000000000001 \
  --payload '{"prompt": "Use Python to print the sum of fib and how many of its values are even"}'
```

`agentcore/cdk/lib/cdk-stack.ts` lets the runtime's role use the AWS-managed Code Interpreter. Each runtime session
runs in its own microVM with its own agent and sandbox.

## Clean Up

```bash
agentcore remove all --yes
agentcore deploy --yes
```

This deletes the deployed stack. Run `git checkout -- agentcore` to restore the configuration and deploy again.
