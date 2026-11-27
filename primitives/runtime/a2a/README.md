# Serving an Agent over A2A

Deploy a [Vercel AI SDK](https://ai-sdk.dev) agent with a calculator tool to Amazon Bedrock AgentCore Runtime,
served over the [Agent2Agent (A2A) protocol](https://a2a-protocol.org).

→ See the [parent README](../README.md) for how AgentCore Runtime works.

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock and AgentCore
- The [AgentCore CLI](https://github.com/aws/agentcore-cli):

```bash
npm install -g @aws/agentcore
```

## Project Structure

```
a2a/
├── app/agent/          # The agent: main.ts, client.ts, package.json
└── agentcore/
    ├── agentcore.json  # Runtime configuration read by the AgentCore CLI (protocol: A2A)
    └── cdk/            # CDK app the CLI deploys
```

## The Agent

The agent is the same calculator agent as the HTTP [Vercel AI hosting sample](../hosting-agent/vercel-ai/), but it is served with
`serveA2A` and advertises an A2A agent card built by `buildAgentCard`:

```typescript
await serveA2A({
  executor: new CalculatorAgentExecutor(),
  agentCard: buildAgentCard({
    name: 'Calculator agent',
    description: 'A Vercel AI SDK agent with a calculator tool, served over the A2A protocol on AgentCore Runtime.',
    skills: [
      {
        id: 'calculator',
        name: 'Calculator',
        description: 'Answers questions that need basic arithmetic, using a calculator tool when needed.',
        tags: ['calculator', 'math'],
        examples: ['What is 25 * 4?'],
      },
    ],
    port,
  }),
  port,
  host: '0.0.0.0',
})
```

`serveA2A` implements the AgentCore A2A contract: JSON-RPC 2.0 at `POST /`, the agent card at
`GET /.well-known/agent-card.json`, and `GET /ping`. When `AGENTCORE_RUNTIME_URL` is set (on a deployed runtime),
`buildAgentCard` rewrites the card's JSON-RPC URL so clients are not sent a localhost address.

The executor implements `@a2a-js/sdk`'s `AgentExecutor`: it turns the user message into a prompt, streams the Vercel AI
SDK agent, and publishes the reply as a completed A2A task.

→ [Full source](./app/agent/main.ts)

## Run Locally

```bash
agentcore dev
```

The first run installs the agent's dependencies. In a second terminal, inspect the agent card and send it a task with
the sample client:

```bash
npm install --prefix app/agent
npx --prefix app/agent tsx app/agent/client.ts --prompt "What is 25 * 4?"
```

Or, from `app/agent`:

```bash
npx tsx client.ts --prompt "What is 25 * 4?"
```

The client prints the card from `GET /.well-known/agent-card.json`, then sends a `message/send` request. You can also
fetch the card directly:

```bash
curl http://127.0.0.1:9000/.well-known/agent-card.json
```

A local card looks like this (trimmed). Once deployed, `buildAgentCard` rewrites the JSON-RPC URLs to the runtime
URL:

```json
{
  "name": "Calculator agent",
  "description": "A Vercel AI SDK agent with a calculator tool, served over the A2A protocol on AgentCore Runtime.",
  "version": "1.0.0",
  "skills": [
    {
      "id": "calculator",
      "name": "Calculator",
      "description": "Answers questions that need basic arithmetic, using a calculator tool when needed.",
      "examples": ["What is 25 * 4?"]
    }
  ],
  "supportedInterfaces": [
    { "url": "http://localhost:9000/", "protocolBinding": "JSONRPC", "protocolVersion": "1.0" },
    { "url": "http://localhost:9000/", "protocolBinding": "JSONRPC", "protocolVersion": "0.3" }
  ]
}
```

Prefer a lower-level invoke? A2A listens on port 9000:

```bash
agentcore invoke --runtime agent --local --payload '{"prompt": "What is 25 * 4?"}'
```

`agentcore invoke` is convenient for a smoke test. The TypeScript client is the A2A-native path: it reads the card and
sends a protocol task.

## Deploy

```bash
npm install --prefix app/agent
npm install --prefix agentcore/cdk
agentcore deploy
```

`agentcore deploy` bundles `app/agent/main.ts`, uploads it, and creates the runtime with protocol A2A and permission to
call Bedrock models. Callers also need `bedrock-agentcore:GetAgentCard` to fetch the card through the runtime endpoint,
in addition to `bedrock-agentcore:InvokeAgentRuntime`.

After deploy, send a task with the same client, passing the runtime ARN (the client builds the invocation URL with
`buildRuntimeUrl` and signs requests with SigV4):

```bash
npx --prefix app/agent tsx app/agent/client.ts \
  --runtime-arn "<runtime-arn>" \
  --prompt "What is 25 * 4?"
```

Or:

```bash
agentcore invoke --runtime agent --payload '{"prompt": "What is 25 * 4?"}'
```

## Clean Up

```bash
agentcore remove all --yes
agentcore deploy --yes
```

This deletes the deployed stack. Run `git checkout -- agentcore` to restore the configuration and deploy again.
