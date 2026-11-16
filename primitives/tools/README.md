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
const agent = new Agent({ model, tools: codeInterpreter.tools })
```

The Vercel AI SDK integrations live at `bedrock-agentcore/code-interpreter/vercel-ai` and
`bedrock-agentcore/browser/vercel-ai`; the Strands integrations are still under `bedrock-agentcore/experimental/`.

## How the Samples Run

Each sample is a local agent server built with `BedrockAgentCoreApp`, which speaks the AgentCore Runtime HTTP
protocol. The tools themselves run in AWS: a sandbox or browser session starts on the agent's first tool call and is
reused for the rest of the conversation.

```bash
cd code-interpreter/strands
npm install
npm start                    # agent server on http://localhost:8080
```

In a second terminal, send a prompt with `curl`, or chat with `npm run start:interactive`, a small client for the
running server:

```bash
curl -N -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Use Python to calculate the first 20 prime numbers and their sum"}'
```

Each session ID gets its own agent, conversation history and tool session. Stopping the server (Ctrl+C) stops every
tool session it started.

To host an agent on AgentCore Runtime instead of locally, see the [runtime samples](../runtime/).
