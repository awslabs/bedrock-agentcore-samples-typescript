# Hosting an Agent (Claude Agent SDK)

Deploy a [Claude Agent SDK](https://docs.claude.com/en/docs/agent-sdk/typescript) agent with a calculator tool to
Amazon Bedrock AgentCore Runtime.

→ See the [parent README](../README.md) for how hosting works.

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock and AgentCore
- Docker, Podman or Finch, to run the agent's container locally
- The [AgentCore CLI](https://github.com/aws/agentcore-cli):

```bash
npm install -g @aws/agentcore
```

## Project Structure

```
claude-agent/
├── app/agent/          # The agent: main.ts, package.json, Dockerfile
└── agentcore/
    ├── agentcore.json  # Runtime configuration read by the AgentCore CLI
    └── cdk/            # CDK app the CLI deploys
```

## The Agent

```typescript
const calculator = tool(
  'calculator',
  'Performs basic arithmetic',
  {
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  },
  async ({ operation, a, b }): Promise<CallToolResult> => ({
    content: [{ type: 'text', text: String(calculate(operation, a, b)) }],
  })
)

const tools = createSdkMcpServer({ name: 'tools', tools: [calculator] })

let sessionId: string | undefined

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      const messages = query({
        prompt: request.prompt,
        options: {
          model: 'global.anthropic.claude-haiku-5-5',
          env: {
            ...process.env,
            CLAUDE_CODE_USE_BEDROCK: '1',
            AWS_REGION: process.env['AWS_REGION'] ?? 'us-east-1',
          },
          tools: [],
          mcpServers: { tools },
          allowedTools: ['mcp__tools__calculator'],
          includePartialMessages: true,
          resume: sessionId,
        },
      })

      for await (const message of messages) {
        if (
          message.type === 'stream_event' &&
          message.event.type === 'content_block_delta' &&
          message.event.delta.type === 'text_delta'
        ) {
          yield { event: 'message', data: { text: message.event.delta.text } }
        }
        if (message.type === 'result' && message.subtype === 'success') {
          sessionId = message.session_id
        }
      }
    },
  },
})
```

The SDK runs the Claude Code binary it ships with, and `CLAUDE_CODE_USE_BEDROCK` sends its model calls to Amazon
Bedrock. `tools: []` turns off the built-in Claude Code tools (Bash, Read, Edit and the rest), so the calculator, served
from an in-process MCP server, is the only tool. `allowedTools` lets it run without a permission prompt. `resume`
continues the previous session, so the agent remembers the conversation.

→ [Full source](./app/agent/main.ts)

## Run Locally

```bash
agentcore dev
```

The first run builds the agent's container image. In a second terminal:

```bash
agentcore invoke --runtime agent --local --payload '{"prompt": "What is 25 * 4?"}'
```

Prefer a chat UI? `agentcore dev --mode browser` opens the Agent Inspector.

## Deploy

```bash
npm install --prefix agentcore/cdk
agentcore deploy
agentcore invoke --runtime agent --payload '{"prompt": "What is 25 * 4?"}'
```

`agentcore deploy` builds the image from `app/agent/Dockerfile` in AWS CodeBuild and creates the runtime with
permission to call Bedrock models. The image installs the SDK on Linux, so it gets the matching Claude Code binary.

## Clean Up

```bash
agentcore remove all --yes
agentcore deploy --yes
```

This deletes the deployed stack. Run `git checkout -- agentcore` to restore the configuration and deploy again.
