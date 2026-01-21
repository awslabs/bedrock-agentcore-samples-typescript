# Hosting an Agent (Strands)

Deploy a Strands agent to Amazon Bedrock AgentCore Runtime.

|                         |                    |
| ----------------------- | ------------------ |
| **AgentCore component** | Identity           |
| **Framework**           | Strands Agents SDK |
| **Model**               | Amazon Nova 2 Lite |

→ See [parent README](../README.md) for full context on inbound identity for runtime.

## Implementation

In order to get the token we wrap the tool handler in a `withOauth2Token` auth function.
This function requires a Credential Provider to be setup.
You need also to pass a workloadAccessToken that is populated automatically by AgentCore in an env var.

To send back the url to the user we use an event queue.

```typescript

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
uvx --from bedrock-agentcore-starter-toolkit agentcore deploy
 --local-build --env AWS_REGION=eu-wset-1 --env CALLBACK_URL=http://localhost:8081
```

Update the identity:

```bash
aws bedrock-agentcore-control update-workload-identity --name outbound_auth_google_cal-dISujT406s --allowed-resource-oauth2-return-urls http://localhost:8080
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
