# Amazon Bedrock AgentCore TypeScript Samples

TypeScript samples for building AI agents with Amazon Bedrock AgentCore.

## What is Amazon Bedrock AgentCore?

Amazon Bedrock AgentCore is a fully managed service for deploying and running AI agents in production. It provides:

- **Runtime** — Managed infrastructure for hosting agents and MCP servers
- **Identity** — Secure credential management for both accessing agents and agents accessing external services
- **Memory** — Persistent conversation and context storage
- **Gateway** — Unified MCP layer for agents accessing REST APIs, Lambda functions, and more
- **Tools** — Built-in Code Interpreter and Browser capabilities

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock and AgentCore
- The [AgentCore CLI](https://github.com/aws/agentcore-cli) (`npm install -g @aws/agentcore`) for samples hosted on
  AgentCore Runtime

## The TypeScript SDK

The `bedrock-agentcore` SDK provides the building blocks for TypeScript agents.

### Runtime

`BedrockAgentCoreApp` wraps any agent framework in an HTTP server that follows the AgentCore Runtime protocol: it
parses and validates requests, streams responses, and manages sessions. This is the
[Strands hosting sample](./primitives/runtime/hosting-agent/strands/), with its calculator tool elided:

```typescript
import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const calculator = tool({
  name: 'calculator',
  description: 'Performs basic arithmetic',
  // ...a Zod input schema and the arithmetic
})

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.anthropic.claude-haiku-5-5',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
    maxTokens: 8192,
  }),
  tools: [calculator],
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      for await (const event of agent.stream(request.prompt)) {
        if (
          event.type === 'modelStreamUpdateEvent' &&
          event.event.type === 'modelContentBlockDeltaEvent' &&
          event.event.delta.type === 'textDelta'
        ) {
          yield { event: 'message', data: { text: event.event.delta.text } }
        }
      }
    },
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
```

`requestSchema` validates each invocation before it reaches the agent, and each `yield` streams an event to the caller.

Every runtime sample is an [AgentCore CLI](https://github.com/aws/agentcore-cli) project, so trying one takes a few
commands:

```bash
npm install -g @aws/agentcore
cd primitives/runtime/hosting-agent/strands
agentcore dev
```

In a second terminal, invoke it locally, then deploy it to AgentCore Runtime:

```bash
agentcore invoke --runtime agent --local --payload '{"prompt": "What is 25 * 4?"}'
npm install --prefix agentcore/cdk
agentcore deploy
agentcore invoke --runtime agent --payload '{"prompt": "What is 25 * 4?"}'
```

→ [Runtime examples](./primitives/runtime/)

### Tools

Built-in tools the SDK ready-makes for each framework. With Strands:

**Code Interpreter** — run Python, JavaScript, TypeScript and shell commands in a secure sandbox:

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

// ...stream the agent's answer, then, when the request finishes:
await codeInterpreter.stopSession()
```

→ [Code Interpreter examples](./primitives/tools/code-interpreter/)

**Browser** — drive a cloud browser session:

```typescript
import { BrowserTools } from 'bedrock-agentcore/experimental/browser/strands'

const browser = new BrowserTools({ region })

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region, maxTokens: 8192 }),
  // ...a system prompt
  tools: browser.tools,
  // The tools share one browser session, so they run one at a time
  toolExecutor: 'sequential',
})

// ...stream the agent's answer, then, when the request finishes:
await browser.stopSession()
```

Neither session is tied to the runtime session, so the samples stop each one when its request finishes; the agent keeps
the conversation.

→ [Browser examples](./primitives/tools/browser/)

## Repository Structure

```
├── primitives/
│   ├── runtime/                      # AgentCore Runtime samples
│   │   ├── hosting-agent/            # Agent hosting (Strands, Vercel AI, Claude Agent SDK)
│   │   ├── bidirectional-streaming/  # WebSocket streaming
│   │   └── async-agent/              # Long-running tasks
│   ├── identity/                     # AgentCore Identity samples
│   │   ├── inbound-auth/             # Authenticate callers
│   │   └── outbound-auth/            # Access external services
│   └── tools/                        # AgentCore Tools samples
│       ├── code-interpreter/         # Secure code execution
│       └── browser/                  # Web automation
├── use-cases/
│   ├── customer-support-agent/       # Multi-agent customer support
│   ├── data-analyzer/                # Data analysis agent with a web app
│   └── browser-live-view-agent/      # Browser agent with a live view
└── .github/                          # GitHub workflows and templates
```

## Related Resources

- [Amazon Bedrock AgentCore Documentation](https://docs.aws.amazon.com/bedrock-agentcore/)
- [Strands Agents SDK](https://strandsagents.com/)
- [Vercel AI SDK](https://ai-sdk.dev)
- [Claude Agent SDK](https://docs.claude.com/en/docs/agent-sdk/typescript)

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

This project is licensed under the Apache-2.0 License. See the [LICENSE](LICENSE) file.

## Disclaimer

These samples are provided for illustrative purposes and are designed for customers to adapt for their production use cases, not to be used as-is.
