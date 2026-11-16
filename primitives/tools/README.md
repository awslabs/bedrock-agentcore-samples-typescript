# AgentCore Tools

Give agents a secure code sandbox and a cloud browser with Amazon Bedrock AgentCore's built-in tools.

| Tool                                    | What the agent gets                                                   | Samples                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [Code Interpreter](./code-interpreter/) | Run Python, JavaScript or TypeScript and shell commands               | [Strands](./code-interpreter/strands/) · [Vercel AI SDK](./code-interpreter/vercel-ai/) |
| [Browser](./browser/)                   | Navigate, click, type, read pages and take screenshots via Playwright | [Strands](./browser/strands/) · [Vercel AI SDK](./browser/vercel-ai/)                   |

`bedrock-agentcore` ships both tools ready-made for each framework. With Strands:

```typescript
import { CodeInterpreterTools } from 'bedrock-agentcore/experimental/code-interpreter/strands'

const codeInterpreter = new CodeInterpreterTools({ region: process.env['AWS_REGION'] ?? 'us-east-1' })
const agent = new Agent({ model, tools: codeInterpreter.tools, toolExecutor: 'sequential' })
```

The Vercel AI SDK integrations live at `bedrock-agentcore/code-interpreter/vercel-ai` and
`bedrock-agentcore/browser/vercel-ai`; the Strands integrations are under `bedrock-agentcore/experimental/`.

## How the Samples Run

Each sample is an agent on AgentCore Runtime, built with the [AgentCore CLI](https://github.com/aws/agentcore-cli):
`agentcore dev` runs it locally, `agentcore deploy` deploys it. A sandbox or browser session starts on the agent's
first tool call and serves the rest of the runtime session, so a follow-up prompt with the same `--session-id` can use
what the first one left behind.

The tools share one session per tools instance, so the samples run tool calls one at a time (`toolExecutor:
'sequential'` in Strands, `toolCallConcurrency: 1` in the Vercel AI SDK). Parallel first calls would each start a
session.

The runtime's role can call Bedrock models but not the tools. Each sample's `agentcore/cdk/lib/cdk-stack.ts` grants it
the AWS-managed Code Interpreter or Browser:

```typescript
runtime.grant(
  [
    'bedrock-agentcore:StartCodeInterpreterSession',
    'bedrock-agentcore:InvokeCodeInterpreter',
    'bedrock-agentcore:StopCodeInterpreterSession',
  ],
  [`arn:${this.partition}:bedrock-agentcore:${this.region}:aws:code-interpreter/aws.codeinterpreter.v1`]
)
```

For a Code Interpreter agent with file uploads and charts, see the [data analyzer](../../use-cases/data-analyzer/).
