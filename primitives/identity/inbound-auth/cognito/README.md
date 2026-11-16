# Inbound Authentication with Cognito

Put an agent behind a JWT authorizer so only users of an Amazon Cognito user pool can call it. AgentCore Runtime
validates every token before the request reaches your code.

→ See the [parent README](../README.md) for how inbound authentication works.

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock, AgentCore and Cognito
- The [AgentCore CLI](https://github.com/aws/agentcore-cli):

```bash
npm install -g @aws/agentcore
```

## Project Structure

```
cognito/
├── app/agent/              # The agent: main.ts, package.json
└── agentcore/
    ├── agentcore.json      # Runtime configuration read by the AgentCore CLI
    └── cdk/lib/cdk-stack.ts # Adds the Cognito user pool and the runtime's JWT authorizer
```

## The Stack

`agentcore deploy` creates the runtime, a user pool (admin-created users only, no self sign-up) and an app client in one
stack. The pool's ids exist only once the stack deploys, so the stack wires them into the runtime's authorizer itself:

```typescript
const userPool = new cognito.UserPool(this, 'UserPool', {
  selfSignUpEnabled: false,
  removalPolicy: RemovalPolicy.DESTROY,
})
const userPoolClient = userPool.addClient('Client', { authFlows: { userPassword: true } })

const runtime = agent.resource.node.defaultChild as CfnRuntime
runtime.authorizerConfiguration = {
  customJwtAuthorizer: {
    discoveryUrl: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}/.well-known/openid-configuration`,
    allowedClients: [userPoolClient.userPoolClientId],
  },
}
```

Cognito access tokens carry the app client in `client_id` and have no `aud` claim, so the authorizer checks
`allowedClients`, not `allowedAudience`.

→ [Full source](./agentcore/cdk/lib/cdk-stack.ts)

## The Agent

The agent needs no auth code. `agentcore.json` allowlists the `Authorization` header, so the already-verified token
reaches the handler and the agent can read who is calling:

```typescript
// AgentCore Runtime has already verified the token's signature, issuer and client, so reading its claims is safe.
function usernameFromAuthorization(authorization: string | undefined): string {
  const payload = authorization?.split('.')[1]
  if (!payload) return 'anonymous'
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { username?: string }
  return claims.username ?? 'unknown'
}

process: async function* (request, context) {
  console.log(`Invoked by ${usernameFromAuthorization(context.headers['authorization'])}`)
  // ...stream the agent's answer
}
```

→ [Full source](./app/agent/main.ts)

## Run Locally

```bash
agentcore dev
```

The first run installs the agent's dependencies. In a second terminal:

```bash
agentcore invoke --runtime agent --local --payload '{"prompt": "What is 25 * 4?"}'
```

The local server doesn't check tokens; it passes on whatever `Authorization` header it gets.

## Deploy

```bash
npm install --prefix agentcore/cdk
agentcore deploy
```

Without a valid token the runtime refuses the call: an invalid token gets `HTTP 403`, a request without one `401`, and
an IAM (SigV4) request `AccessDeniedException: Authorization method mismatch`.

### Create a user and get a token

Create a test user with a random password, then sign in to get an access token:

```bash
STACK=AgentCore-InboundAuthCognito-default
output() { aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
POOL_ID=$(output UserPoolId) CLIENT_ID=$(output UserPoolClientId)
PASSWORD="$(openssl rand -base64 24)Aa1!"

aws cognito-idp admin-create-user --user-pool-id $POOL_ID --username testuser --message-action SUPPRESS > /dev/null
aws cognito-idp admin-set-user-password --user-pool-id $POOL_ID --username testuser --password "$PASSWORD" --permanent
TOKEN=$(aws cognito-idp initiate-auth --client-id $CLIENT_ID --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters "USERNAME=testuser,PASSWORD=$PASSWORD" --query AuthenticationResult.AccessToken --output text)
```

The token is valid for an hour; run the `initiate-auth` line again for a new one.

### Invoke with the token

```bash
agentcore invoke --runtime agent --bearer-token "$TOKEN" --payload '{"prompt": "What is 25 * 4?"}'
```

The runtime's log shows `Invoked by testuser`.

## Clean Up

```bash
agentcore remove all --yes
agentcore deploy --yes
```

This deletes the stack, including the user pool and its users. Run `git checkout agentcore` to restore the
configuration and deploy again.
