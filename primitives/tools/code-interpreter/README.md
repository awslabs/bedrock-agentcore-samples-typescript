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
const agent = new Agent({ model, tools: codeInterpreter.tools, toolExecutor: 'sequential' })
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
tool calls until the sandbox session times out (15 minutes by default, up to 8 hours).

## Network Access

Every AWS account has a default Code Interpreter, `aws.codeinterpreter.v1`, which the samples use. It runs in
`SANDBOX` mode: no internet access and no AWS access.

To reach public URLs or resources in a VPC, create your own Code Interpreter with public or VPC network access. Add it
to the stack in `agentcore/cdk/lib/cdk-stack.ts` (with `import * as agentcore from 'aws-cdk-lib/aws-bedrockagentcore'`),
in place of the grant for the AWS-managed one:

```typescript
const codeInterpreter = new agentcore.CodeInterpreterCustom(this, 'CodeInterpreter', {
  networkConfiguration: agentcore.CodeInterpreterNetworkConfiguration.usingPublicNetwork(),
})
codeInterpreter.grantUse(runtime)
runtime.addEnvironmentVariable('CODE_INTERPRETER_ID', codeInterpreter.codeInterpreterId)
```

and pass its id to the tools in `app/agent/main.ts`:

```typescript
const codeInterpreter = new CodeInterpreterTools({ region, identifier: process.env['CODE_INTERPRETER_ID'] })
```

`agentcore deploy` creates the Code Interpreter with the agent, and `agentcore remove all` deletes it. To give the
sandbox AWS permissions, such as S3 access, grant them to `codeInterpreter.executionRole`.
