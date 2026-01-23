# Inbound Authentication with Cognito

Configure OAuth for inbound authentication—AgentCore validates JWTs before requests reach your container.

## Overview

This sample demonstrates how to configure inbound authentication for an AgentCore Runtime using Amazon Cognito as the identity provider. AgentCore validates JWT tokens before requests reach your container, so your agent code stays simple—no auth logic required.

The CDK stack deploys:

- **Cognito User Pool** with a test user (`user@example.com` / `password`)
- **Client** configured for USER_PASSWORD_AUTH flow

## Prerequisites

- Node.js 20+
- AWS credentials configured
- [AgentCore Starter Toolkit](https://github.com/aws/bedrock-agentcore-starter-toolkit):

```bash
pip install bedrock-agentcore-starter-toolkit
```

## Implementation

```typescript
import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const requestSchema = z.object({ prompt: z.string() })

const calculator = tool({
  name: 'calculator',
  description: 'Performs basic arithmetic',
  inputSchema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  callback: ({ operation, a, b }) => {
    switch (operation) {
      case 'add':
        return a + b
      case 'subtract':
        return a - b
      case 'multiply':
        return a * b
      case 'divide':
        return a / b
    }
  },
})

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  tools: [calculator],
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, context) {
      // Log Authorization header (first 20 chars) to demonstrate header propagation
      const authHeader = context.headers?.authorization ?? 'none'
      console.log(`Authorization: ${authHeader.substring(0, 20)}...`)

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

> [Full source](./agent.ts)

## Setup

### 1. Deploy Cognito

```bash
cd cdk
npm install
npx cdk deploy
```

Note the outputs:

- `DiscoveryUrl` - OIDC discovery URL for configuring AgentCore
- `ClientId` - Cognito client ID

### 2. Install Agent Dependencies

```bash
cd ..
npm install
```

### 3. Configure the Agent

```bash
agentcore configure
```

When prompted:

- Specify `agent.ts` as the entrypoint
- Enter a name for the agent
- Enter `s` to skip memory creation
- When prompted to allow headers, enter `Authorization`
- Select **OAuth/OIDC** as the authentication method
- Enter the `DiscoveryUrl` from CDK outputs
- Enter the `ClientId` as an allowed client

By allow-listing the `Authorization` header, the access token becomes available in your agent via `context.headers.authorization`. This allows the agent to access user identity information from the JWT.

## Local Development

Start the local dev server:

```bash
agentcore dev
```

### Test with Authentication

Get a token:

```bash
# Set your client ID from CDK outputs
export CLIENT_ID=<your-client-id>

# Get an access token
export TOKEN=$(aws cognito-idp initiate-auth \
  --client-id $CLIENT_ID \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=user@example.com,PASSWORD=password \
  --query 'AuthenticationResult.AccessToken' \
  --output text)
```

Test the local dev server:

```bash
agentcore invoke --dev '{"prompt": "What is 25 * 4?"}'
```

Or with curl: (note that the access token is added. This is not required when invoking the local endpoint)

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"prompt": "What is 25 * 4?"}'
```

## Deploy to AWS

```bash
agentcore deploy
```

## Test Deployed Agent

```bash
agentcore invoke '{"prompt": "What is 25 * 4?"}' -bt $TOKEN
```

## Clean Up

Destroy the AgentCore Runtime:

```bash
agentcore destroy
```

Destroy the Cognito stack:

```bash
cd cdk
npx cdk destroy
```
