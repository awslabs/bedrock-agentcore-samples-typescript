# Code Interpreter

Build agents that run code in a secure sandbox with AgentCore Code Interpreter.

→ See the [parent README](../README.md) for how the tools samples run.

| Sample                    | Framework     | Import                                                    |
| ------------------------- | ------------- | --------------------------------------------------------- |
| [strands](./strands/)     | Strands       | `bedrock-agentcore/experimental/code-interpreter/strands` |
| [vercel-ai](./vercel-ai/) | Vercel AI SDK | `bedrock-agentcore/code-interpreter/vercel-ai`            |

```typescript
const codeInterpreter = new CodeInterpreterTools({ region })
const agent = new Agent({ model, tools: codeInterpreter.tools, toolExecutor: 'sequential' })
```

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

To reach public URLs or resources in a VPC, create your own Code Interpreter with `PUBLIC` or `VPC` network mode (add
`--execution-role-arn` to give the sandbox AWS permissions, such as S3 access):

```bash
aws bedrock-agentcore-control create-code-interpreter \
  --region us-east-1 \
  --name "public_code_interpreter" \
  --network-configuration '{"networkMode": "PUBLIC"}'
```

Pass the returned `codeInterpreterId` as `identifier`, and grant the runtime the returned `codeInterpreterArn` in
`agentcore/cdk/lib/cdk-stack.ts`:

```typescript
const codeInterpreter = new CodeInterpreterTools({ region, identifier: 'public_code_interpreter-<suffix>' })
```

Delete it when you no longer need it:

```bash
aws bedrock-agentcore-control delete-code-interpreter --region us-east-1 --code-interpreter-id <codeInterpreterId>
```
