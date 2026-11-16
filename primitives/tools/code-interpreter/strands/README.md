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
    'You are a data analyst. Run Python in the sandbox to answer questions. Variables and files persist between calls.',
  tools: codeInterpreter.tools,
  // The tools share one sandbox session, so they run one at a time
  toolExecutor: 'sequential',
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      for await (const event of agent.stream(request.prompt)) {
        if (event.type === 'beforeToolCallEvent') {
          yield { event: 'tool', data: { name: event.toolUse.name, input: event.toolUse.input } }
        }
        // ...yield text deltas as message events
      }
    },
  },
})
```

`codeInterpreter.tools` gives the agent `executeCode`, `executeCommand` and `fileOperations`. The sandbox starts on
the first tool call and keeps its variables and files for the rest of the session. Each `tool` event shows the code
the agent runs.

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
