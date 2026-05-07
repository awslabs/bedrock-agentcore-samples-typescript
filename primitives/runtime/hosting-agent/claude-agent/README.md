# Hosting an Agent (Claude Agent SDK)

Deploy a [Claude Agent SDK](https://docs.anthropic.com/en/docs/agents/claude-agent-sdk) agent to Amazon Bedrock AgentCore Runtime, with model calls routed through Amazon Bedrock.

→ See [parent README](../README.md) for full context on hosting agents.

## How It Works

The Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) spawns the Claude Code CLI as a subprocess and drives an agent loop. Setting `CLAUDE_CODE_USE_BEDROCK=1` and `ANTHROPIC_MODEL=<bedrock inference profile ID>` routes every model call through Amazon Bedrock using the container's IAM role credentials — no Anthropic API key needed.

Unlike the Strands and Vercel AI samples, this one ships a custom `Dockerfile` so the Claude Code CLI is available in the image. The `agentcore` CLI picks up the Dockerfile automatically during deployment.

## Prerequisites

- Node.js 20+
- AWS credentials configured
- Docker (or Podman/Finch) for local dev
- [AgentCore Starter Toolkit](https://github.com/aws/bedrock-agentcore-starter-toolkit):

```bash
pip install bedrock-agentcore-starter-toolkit
```

## Implementation

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const requestSchema = z.object({ prompt: z.string() })

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, _context) {
      const response = query({
        prompt: request.prompt,
        options: {
          systemPrompt: "You're a helpful assistant.",
          maxTurns: 5,
          allowedTools: [],
        },
      })

      for await (const message of response) {
        if (message.type === 'assistant') {
          for (const block of message.message.content) {
            if (block.type === 'text') {
              yield { event: 'message', data: { text: block.text } }
            }
          }
        }
      }
    },
  },
})

app.run()
```

→ [Full source](./agent.ts)

## Quick Start

Install dependencies:

```bash
npm install
```

Configure the agent (specify `agent.ts` as the entrypoint):

```bash
agentcore configure
```

Accept defaults for all prompts, except for memory—enter `s` to skip memory creation. The CLI detects the Dockerfile and uses container-based deployment.

Set environment variables so the Claude Agent SDK routes through Bedrock:

```bash
agentcore configure env CLAUDE_CODE_USE_BEDROCK=1
agentcore configure env ANTHROPIC_MODEL=us.anthropic.claude-sonnet-4-5-20250929-v1:0
```

## Local Development

The Claude Code CLI subprocess needs AWS credentials and Bedrock access locally:

```bash
npm install -g @anthropic-ai/claude-code@latest

export CLAUDE_CODE_USE_BEDROCK=1
export ANTHROPIC_MODEL=us.anthropic.claude-sonnet-4-5-20250929-v1:0
export AWS_REGION=us-east-1
```

Start the local dev server:

```bash
agentcore dev
```

Test with the CLI:

```bash
agentcore invoke --dev '{"prompt": "What is the capital of France?"}'
```

Or with curl:

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "What is the capital of France?"}'
```

## Deploy to AWS

```bash
agentcore deploy
```

AgentCore builds the ARM64 container in AWS CodeBuild, pushes it to ECR, and creates the Runtime. The execution role is granted Bedrock model invocation permissions automatically.

## Test Deployed Agent

```bash
agentcore invoke '{"prompt": "What is the capital of France?"}'
```

## Clean Up

```bash
agentcore destroy
```
