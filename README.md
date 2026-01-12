# Amazon Bedrock AgentCore TypeScript Samples

TypeScript samples for building AI agents with Amazon Bedrock AgentCore.

## What is Amazon Bedrock AgentCore?

Amazon Bedrock AgentCore is a fully managed service for deploying and running AI agents in production. It provides:

- **Runtime** — Managed infrastructure for hosting agents and MCP servers
- **Identity** — Secure credential management for both accessing agents and agents accessing external services
- **Memory** — Persistent conversation and context storage
- **Gateway** — Unified MCP layer for agents accessing REST APIs, Lambda functions, and more
- **Tools** — Built-in Code Interpreter and Browser capabilities

## The TypeScript SDK

The `bedrock-agentcore` SDK provides the building blocks for TypeScript agents.

### Runtime

`BedrockAgentCoreApp` wraps any agent framework in an HTTP server that follows the AgentCore Runtime protocol—handling request parsing, streaming responses, and session management for seamless deployment:

```typescript
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async function* (request, context) {
      // Your agent logic here
      yield { event: 'message', data: { text: 'Hello!' } }
    },
  },
})

app.run() // Starts HTTP server on :8080
```

With a full agent framework:

```typescript
import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const getWeather = tool({
  name: 'getWeather',
  description: 'Gets weather for a city',
  inputSchema: z.object({ city: z.string() }),
  callback: ({ city }) => `72°F and sunny in ${city}`,
})

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.amazon.nova-2-lite-v1:0', region: 'us-east-1' }),
  tools: [getWeather],
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, context) {
      for await (const event of agent.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }
    },
  },
})

app.run()
```

→ [Runtime examples](./primitives/runtime/)

### Tools

Built-in tools for common agent capabilities.

**Code Interpreter** — Execute Python, JavaScript, or shell commands in a secure sandbox:

```typescript
import { CodeInterpreterTools } from 'bedrock-agentcore/tools/code-interpreter/strands'

const codeInterpreter = new CodeInterpreterTools({ region: 'us-east-1' })
const tools = codeInterpreter.getTools() // executeCode, fileOperations, executeCommand

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.amazon.nova-2-lite-v1:0', region: 'us-east-1' }),
  tools,
})

// Agent can now run: "Calculate the standard deviation of [1, 2, 3, 4, 5]"
// → Executes Python in a secure sandbox, returns the result
```

→ [Code Interpreter examples](./primitives/tools/code-interpreter/)

**Browser** — Automate web browsing with a remote browser session:

```typescript
import { BrowserTools } from 'bedrock-agentcore/tools/browser/strands'

const browserTools = new BrowserTools({ region: 'us-east-1' })
await browserTools.startSession()
const tools = browserTools.getTools() // navigate, click, type, getText, screenshot

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.amazon.nova-2-lite-v1:0', region: 'us-east-1' }),
  tools,
})

// Agent can now: "Go to amazon.com and find the Echo Show"
// → Navigates, searches, reads results from a real browser
```

→ [Browser examples](./primitives/tools/browser/)

## Repository Structure

```
├── primitives/
│   ├── runtime/                      # AgentCore Runtime samples
│   │   ├── hosting-agent/            # Agent hosting (Strands, Vercel AI)
│   │   ├── bidirectional-streaming/  # WebSocket streaming
│   │   └── async-agent/              # Long-running tasks
│   ├── identity/                     # AgentCore Identity samples
│   │   ├── inbound-auth/             # Authenticate callers
│   │   └── outbound-auth/            # Access external services
│   └── tools/                        # AgentCore Tools samples
│       ├── code-interpreter/         # Secure code execution
│       └── browser/                  # Web automation
├── use-cases/
│   ├── customer-support-agent/       # Complete support chatbot
│   └── data-analyzer/                # Data analysis agent
└── .github/                          # GitHub workflows and templates
```

## Prerequisites

- Node.js 20+
- AWS CLI configured with credentials
- Access to Amazon Bedrock and AgentCore

## Related Resources

- [Amazon Bedrock AgentCore Documentation](https://docs.aws.amazon.com/bedrock-agentcore/)
- [Strands Agents SDK](https://strandsagents.com/)
- [Vercel AI SDK](https://ai-sdk.dev)

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

This project is licensed under the Apache-2.0 License. See the [LICENSE](LICENSE) file.
