# Hosting an Agent (Strands)

Deploy a Strands agent to Amazon Bedrock AgentCore Runtime.

|                         |                    |
| ----------------------- | ------------------ |
| **AgentCore component** | Identity           |
| **Framework**           | Strands Agents SDK |
| **Model**               | Amazon Nova 2 Lite |

→ See [parent README](../README.md) for full context on inbound identity for runtime.

## Implementation

```typescript
const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, context) {
      const user = get_user(context);
      const systemPrompt = `You are a helpful and empathetic assistant. You are talking to ${user}`;
      
      const agent = new Agent({
        model: new BedrockModel({
          modelId: 'global.amazon.nova-2-lite-v1:0',
          region: process.env['AWS_REGION'] ?? 'us-east-1',
        }),
        tools: [calculator],
        systemPrompt,
      });
      
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

→ [Full source](./src/index.ts)

## Quick Start

Requires AWS credentials in your shell (for Bedrock model access).

Deploy the Cognito User Pool:
```bash
cd cdk
npm i
cdk deploy
```

Note the ClientId and the DiscoveryUrl from the outputs.


Create the agent configuration using:
```bash
uvx --from bedrock-agentcore-starter-toolkit agentcore configure
```
When asked provide the UserPoolId and the DiscoveryUrl you noted from the CDK output.




## Test

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -H "Authorization: Bearer <jwt_token>"
  -d '{"prompt": "What is 25 * 4?"}'
```

## Deploy to AWS

```bash
```bash
uvx --from bedrock-agentcore-starter-toolkit agentcore launch
```

If you have Docker installed locally you might want to use `--local-build` to build the container image locally before deployment.


## Test Deployed Agent

```bash
npm run serve
```

Open the URL in your browser and login as instructed.

You can then chat with the agent in the UI. 

## Clean Up

```bash
make delete
```
