# Code Interpreter

Build agents that run code in a secure sandbox with AgentCore Code Interpreter.

→ See the [parent README](../README.md) for how the tools samples run.

## Samples

| Sample                    | What it shows                                                        |
| ------------------------- | -------------------------------------------------------------------- |
| [strands](./strands/)     | A Strands agent that runs Python in a Code Interpreter sandbox       |
| [vercel-ai](./vercel-ai/) | A Vercel AI SDK agent that runs Python in a Code Interpreter sandbox |

## How It Works

```typescript
import { CodeInterpreterTools } from 'bedrock-agentcore/experimental/code-interpreter/strands'

const codeInterpreter = new CodeInterpreterTools({ region })

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region, maxTokens: 8192 }),
  systemPrompt:
    'You are a data analyst. Run Python in the sandbox to answer questions. Each request gets a fresh sandbox.',
  tools: codeInterpreter.tools,
  // The tools share one sandbox session, so they run one at a time
  toolExecutor: 'sequential',
})
```

The Vercel AI SDK version is `CodeInterpreterTools` from `bedrock-agentcore/code-interpreter/vercel-ai`, used with
`toolCallConcurrency: 1`.

`codeInterpreter.tools` gives the agent three tools:

| Tool             | Description                           |
| ---------------- | ------------------------------------- |
| `executeCode`    | Run Python, JavaScript, or TypeScript |
| `fileOperations` | Read, write, list, or remove files    |
| `executeCommand` | Execute shell commands                |

The sandbox comes with pandas, numpy, matplotlib, seaborn, scipy and scikit-learn. Variables and files persist across
the tool calls of a request. A sandbox ends 15 minutes after it starts, however active it is, so the samples give each
request its own and stop it when the request finishes.

## Network Access

Every AWS account has a default Code Interpreter, `aws.codeinterpreter.v1`, which the samples use. It runs in
`SANDBOX` mode: no internet access and no AWS access.

To control the network, create your own Code Interpreter in the stack, as the
[data analyzer](../../../use-cases/data-analyzer/) does in `agentcore/cdk/lib/cdk-stack.ts`:

```typescript
const codeInterpreter = new agentcore.CodeInterpreterCustom(this, 'CodeInterpreter', {
  networkConfiguration: agentcore.CodeInterpreterNetworkConfiguration.usingSandboxNetwork(),
})
codeInterpreter.grantUse(runtime)
runtime.addEnvironmentVariable('CODE_INTERPRETER_ID', codeInterpreter.codeInterpreterId)
```

and passes its id to the tools in `app/agent/main.ts`:

```typescript
const codeInterpreter = new CodeInterpreterTools({
  region,
  ...(codeInterpreterId && { identifier: codeInterpreterId }),
})
```

`usingSandboxNetwork()` keeps the sandbox offline; `usingPublicNetwork()` lets it reach public URLs.
`agentcore deploy` creates the Code Interpreter with the agent, and `agentcore remove all` deletes it. To give the
sandbox AWS permissions, such as S3 access, grant them to `codeInterpreter.executionRole`.
