# Inbound Authentication with Cognito

An agent behind a JWT authorizer that only accepts access tokens from an Amazon Cognito user pool.

→ See the [parent README](../README.md) for how inbound authentication works.

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock, AgentCore and Cognito
- The AWS CLI, configured for the region you deploy to
- OpenSSL, to generate the test user's password
- The [AgentCore CLI](https://github.com/aws/agentcore-cli):

```bash
npm install -g @aws/agentcore
```

## Project Structure

```
cognito/
├── app/agent/                # The agent: main.ts, package.json
└── agentcore/
    ├── agentcore.json        # Runtime configuration read by the AgentCore CLI
    └── cdk/lib/cdk-stack.ts  # Adds the Cognito user pool and the runtime's JWT authorizer
```

## The Agent

The agent has no auth code. AgentCore Runtime checks every token before the request reaches it, and `agentcore.json`
allowlists the `Authorization` header, so the agent can read who is calling:

```typescript
function usernameFromAuthorization(authorization: string | undefined): string {
  const payload = authorization?.split('.')[1]
  if (!payload) return 'anonymous'
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { username?: string }
    return claims.username ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

process: async function* (request, context) {
  context.log.info(`Invoked by ${usernameFromAuthorization(context.headers['authorization'])}`)
  // ...yield text deltas as message events
}
```

`context.log` is the SDK's request-scoped logger: each line carries the request's ID.

→ [Full source](./app/agent/main.ts)

The stack adds a user pool (admin-created users only) and an app client, and points the runtime's authorizer at them.
The pool exists only once the stack deploys, so the stack sets the authorizer itself:

```typescript
const cfnRuntime = runtime.resource.node.defaultChild as agentcore.CfnRuntime
cfnRuntime.authorizerConfiguration = {
  customJwtAuthorizer: {
    discoveryUrl: `${userPool.userPoolProviderUrl}/.well-known/openid-configuration`,
    allowedClients: [client.userPoolClientId],
  },
}
```

Cognito access tokens name the app client in `client_id` and have no `aud` claim, so the authorizer checks
`allowedClients`, not `allowedAudience`.

→ [Full source](./agentcore/cdk/lib/cdk-stack.ts)

## Run Locally

```bash
agentcore dev
```

The first run installs the agent's dependencies. In a second terminal:

```bash
agentcore invoke --runtime agent --local --payload '{"prompt": "What is 25 * 4?"}'
```

The local server doesn't check tokens, so the `agentcore dev` output shows `"msg":"Invoked by anonymous"`.

## Deploy

```bash
npm install --prefix app/agent
npm install --prefix agentcore/cdk
agentcore deploy
```

The deployed runtime refuses calls without a valid token (`401` or `403`) before they reach the agent.

Create a test user with a random password, and sign in to get an access token:

```bash
STACK=AgentCore-InboundAuthCognito-default
output() { aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
POOL_ID=$(output UserPoolId) CLIENT_ID=$(output ClientId)
PASSWORD="$(openssl rand -base64 24)Aa1!"
aws cognito-idp admin-create-user --user-pool-id $POOL_ID --username testuser --message-action SUPPRESS > /dev/null
aws cognito-idp admin-set-user-password --user-pool-id $POOL_ID --username testuser --password "$PASSWORD" --permanent
TOKEN=$(aws cognito-idp initiate-auth --client-id $CLIENT_ID --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters "USERNAME=testuser,PASSWORD=$PASSWORD" --query AuthenticationResult.AccessToken --output text)
```

Invoke the agent with the token:

```bash
agentcore invoke --runtime agent --bearer-token "$TOKEN" --payload '{"prompt": "What is 25 * 4?"}'
```

The runtime's log shows `Invoked by testuser`:

```bash
agentcore logs runtime --name agent --since 5m
```

The token is valid for an hour; run the `initiate-auth` line again for a new one.

## Clean Up

```bash
agentcore remove all --yes
agentcore deploy --yes
```

This deletes the deployed stack. Run `git checkout -- agentcore` to restore the configuration and deploy again.
