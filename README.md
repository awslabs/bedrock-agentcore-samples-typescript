# Amazon Bedrock AgentCore TypeScript Samples

TypeScript samples for building AI agents with Amazon Bedrock AgentCore.

## What is Amazon Bedrock AgentCore?

Amazon Bedrock AgentCore is a fully managed service for deploying and running AI agents in production. It provides:

- **Runtime** — Managed infrastructure for hosting agents and MCP servers
- **Identity** — Secure credential management for both accessing agents and agents accessing external services
- **Memory** — Persistent conversation and context storage
- **Gateway** — Unified MCP layer for agents accessing REST APIs, Lambda functions, and more
- **Tools** — Built-in Code Interpreter and Browser Tool capabilities

AgentCore provides auto-scaling, load balancing, logging, and security for agents at scale.

## The TypeScript SDK

The `bedrock-agentcore` SDK provides the building blocks for TypeScript agents:

```typescript
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'

const app = new BedrockAgentCoreApp({
  handler: async function* (request, context) {
    // Your agent logic here
    yield { event: 'message', data: { text: 'Hello!' } }
  },
})

app.run()
```

The SDK wraps your agent in a container-ready HTTP server, handling request parsing, streaming responses, and session management.

## Examples

| Category       | Example                                                                | What You'll Learn                               |
| -------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| **Runtime**    | [hosting-agent](./examples/runtime/hosting-agent/)                     | Deploy an AI agent with tool use                |
| **Runtime**    | [bidirectional-streaming](./examples/runtime/bidirectional-streaming/) | WebSocket bidirectional communication           |
| **Runtime**    | [async-agent](./examples/runtime/async-agent/)                         | Long-running tasks with streaming results       |
| **Identity**   | [inbound-auth](./examples/identity/inbound-auth/)                      | Authenticate clients calling your agent         |
| **Identity**   | [outbound-auth](./examples/identity/outbound-auth/)                    | Agent accessing external services securely      |
| **Tools**      | [tools](./examples/tools/)                                             | Code Interpreter and Browser Tool (coming soon) |
| **End-to-End** | [cloudformation](./examples/end-to-end/cloudformation/)                | Complete solution with CloudFormation           |
| **End-to-End** | [cdk](./examples/end-to-end/cdk/)                                      | Complete solution with AWS CDK                  |
| **End-to-End** | [terraform](./examples/end-to-end/terraform/)                          | Complete solution with Terraform                |

## Quick Start

### 1. Create Your Agent

```typescript
import { Agent, BedrockModel } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: 'us-east-1',
  }),
})

const app = new BedrockAgentCoreApp({
  handler: async function* (request, context) {
    const { prompt } = z.object({ prompt: z.string() }).parse(request)
    for await (const event of agent.stream(prompt)) {
      if (event.delta?.type === 'textDelta') {
        yield { event: 'message', data: { text: event.delta.text } }
      }
    }
  },
})

app.run()
```

### 2. Run Locally

```bash
cd examples/runtime/hosting-agent/strands
make dev
```

### 3. Test

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Hello!"}'
```

### 4. Deploy to AWS

```bash
make build-and-push  # Build container, push to ECR
make deploy          # Deploy to AgentCore
make delete          # Clean up (avoid AWS costs)
```

## Prerequisites

- Node.js 20+
- Docker
- AWS CLI configured with credentials
- Access to Amazon Bedrock and AgentCore

## Repository Structure

```
├── examples/
│   ├── runtime/                    # AgentCore Runtime samples
│   │   ├── hosting-agent/          # Agent hosting (Strands, Vercel AI)
│   │   ├── bidirectional-streaming/  # WebSocket streaming
│   │   └── async-agent/            # Long-running tasks
│   ├── identity/                   # AgentCore Identity samples
│   │   ├── inbound-auth/           # Authenticate callers
│   │   └── outbound-auth/          # Access external services
│   ├── tools/                      # AgentCore Tools samples
│   └── end-to-end/                 # Complete deployment examples
└── .github/                        # GitHub workflows and templates
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## Related Resources

- [Amazon Bedrock AgentCore Documentation](https://docs.aws.amazon.com/bedrock-agentcore/)
- [Strands Agents SDK](https://strandsagents.com/)
- [Vercel AI SDK](https://ai-sdk.dev)

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

This project is licensed under the Apache-2.0 License. See the [LICENSE](LICENSE) file.
