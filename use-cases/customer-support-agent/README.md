# Customer Support Multi-Agent

A [Strands Agents](https://strandsagents.com/) orchestrator that routes customer requests to three specialist agents,
hosted on Amazon Bedrock AgentCore Runtime.

→ See the [parent README](../README.md) for the other use cases.

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock and AgentCore
- The [AgentCore CLI](https://github.com/aws/agentcore-cli):

```bash
npm install -g @aws/agentcore
```

## Project Structure

```
customer-support-agent/
├── app/agent/
│   ├── main.ts         # Orchestrator and AgentCore Runtime entry point
│   └── specialists.ts  # Specialist agents and their tools
└── agentcore/
    ├── agentcore.json  # Runtime configuration read by the AgentCore CLI
    └── cdk/            # CDK app the CLI deploys
```

## The Agent

The orchestrator holds the conversation. There is one per runtime session, so a customer can refer back to an earlier
message, and sessions never share history or block each other:

```typescript
const agentsBySession = new Map<string, Agent>()

function getAgent(sessionId: string): Agent {
  let agent = agentsBySession.get(sessionId)
  if (!agent) {
    agent = new Agent({
      model,
      systemPrompt,
      tools: createSpecialists(model),
      // Each specialist handles one request at a time, so the orchestrator calls them one at a time
      toolExecutor: 'sequential',
    })
    agentsBySession.set(sessionId, agent)
  }
  return agent
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, context) {
      for await (const event of getAgent(context.sessionId).stream(request.prompt)) {
        // ...yield text deltas as message events
      }
    },
  },
})
```

The history lives in memory for as long as the session runs. To keep it longer, add AgentCore Memory
(`agentcore add memory`).

→ [Full source](./app/agent/main.ts)

## How It Works

| Specialist              | Handles                                            | Tools (sample data)                      |
| ----------------------- | -------------------------------------------------- | ---------------------------------------- |
| `warrantySpecialist`    | Warranty status by serial number, policy questions | `checkWarranty`                          |
| `techSupportSpecialist` | Device problems, step-by-step troubleshooting      | `getTroubleshootingGuide`                |
| `schedulingSpecialist`  | Finding a free slot, booking a support appointment | `getAvailableSlots`, `createAppointment` |

Each specialist is a Strands `Agent` with a `name` and a `description`. Agents passed in another agent's `tools` become
tools, so the orchestrator picks a specialist the way it picks any tool: from its description.

```typescript
new Agent({
  name: 'warrantySpecialist',
  description: 'Checks warranty status by serial number and answers warranty policy questions.',
  model,
  tools: [checkWarranty],
})
```

`createSpecialists(model)` builds the three specialists for each new orchestrator, sharing its model.

→ [Specialists](./app/agent/specialists.ts)

## Run Locally

```bash
agentcore dev
```

The first run installs the agent's dependencies. In a second terminal, send one request to each specialist:

```bash
agentcore invoke --runtime agent --local --payload '{"prompt": "Check the warranty for serial number MNO33333333"}'
agentcore invoke --runtime agent --local --payload '{"prompt": "My Gaming Console Pro keeps overheating. How do I fix it?"}'
agentcore invoke --runtime agent --local --payload '{"prompt": "Which slots are free? Book the first one for a warranty renewal."}'
```

To hold a conversation, send each message with the same session ID (at least 33 characters):

```bash
agentcore invoke --runtime agent --local --session-id customer-support-agent-session-00000000000000000001 \
  --payload '{"prompt": "Hi, my serial number is ABC12345678. Is my warranty still valid?"}'
agentcore invoke --runtime agent --local --session-id customer-support-agent-session-00000000000000000001 \
  --payload '{"prompt": "What product was that, and what serial number did I give you?"}'
```

Prefer a chat UI? `agentcore dev --mode browser` opens the Agent Inspector.

## Deploy

```bash
npm install --prefix agentcore/cdk
agentcore deploy
agentcore invoke --runtime agent --payload '{"prompt": "Check the warranty for serial number MNO33333333"}'
```

Add `--session-id` to hold a conversation with the deployed agent too.

## Clean Up

```bash
agentcore remove all --yes
agentcore deploy --yes
```

This deletes the deployed stack. Run `git checkout -- agentcore` to restore the configuration and deploy again.
