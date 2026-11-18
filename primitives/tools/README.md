# AgentCore Tools

Give agents a secure code sandbox and a cloud browser with Amazon Bedrock AgentCore's built-in tools.

## Samples

| Sample                                  | What it shows                                                            |
| --------------------------------------- | ------------------------------------------------------------------------ |
| [code-interpreter](./code-interpreter/) | Agents that run code in a secure sandbox with AgentCore Code Interpreter |
| [browser](./browser/)                   | Agents that browse the web in a cloud browser with AgentCore Browser     |

## The Tools

`bedrock-agentcore` ships both tools ready-made for each framework. With Strands:

```typescript
import { CodeInterpreterTools } from 'bedrock-agentcore/experimental/code-interpreter/strands'

const codeInterpreter = new CodeInterpreterTools({ region })

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region, maxTokens: 8192 }),
  // ...a system prompt
  tools: codeInterpreter.tools,
  // The tools share one sandbox session, so they run one at a time
  toolExecutor: 'sequential',
})
```

The Vercel AI SDK integrations live at `bedrock-agentcore/code-interpreter/vercel-ai` and
`bedrock-agentcore/browser/vercel-ai`; the Strands integrations are under `bedrock-agentcore/experimental/`.

## How the Samples Run

Each sample is an agent on AgentCore Runtime, built with the [AgentCore CLI](https://github.com/aws/agentcore-cli):
`agentcore dev` runs it locally, `agentcore deploy` deploys it. The Browser samples build a container, so they need
Docker, Podman or Finch to run locally.

A sandbox or browser session starts on the agent's first tool call. Deployed, each runtime session (`--session-id`)
runs in its own microVM with its own agent, so a follow-up prompt with the same session id continues the conversation
and, for Code Interpreter, can use what the first prompt left in the sandbox. Locally, `agentcore dev` runs a single
agent for every session id.

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
