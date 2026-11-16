# Data Analyzer

A data analysis agent that runs Python in a sandboxed AgentCore Code Interpreter, with a React web app for uploading
files, streaming answers and showing the charts it creates.

→ See the [parent README](../README.md) for the other use cases.

```
┌──────────────┐  bearer token   ┌───────────────────┐       ┌──────────────────────┐
│ React web app│────────────────▶│ AgentCore Runtime │──────▶│ Code Interpreter     │
│ (Cognito     │◀── SSE stream ──│ (Strands agent)   │◀──────│ (sandbox, no network)│
│  sign-in)    │                 └─────────┬─────────┘       └──────────────────────┘
└──────┬───────┘                           │ charts and files
       │      presigned URLs     ┌─────────▼─────────┐
       └────────────────────────▶│ S3 bucket         │
                                 │ (private)         │
                                 └───────────────────┘
```

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock, AgentCore, Cognito and S3
- The [AgentCore CLI](https://github.com/aws/agentcore-cli):

```bash
npm install -g @aws/agentcore
```

## Project Structure

```
data-analyzer/
├── app/agent/          # The agent: main.ts, package.json
├── agentcore/
│   ├── agentcore.json  # Runtime configuration read by the AgentCore CLI
│   └── cdk/            # CDK app the CLI deploys, plus Cognito, Code Interpreter and S3
├── frontend/           # React + Vite web app
└── data/               # sample_sales_data.csv to try it with
```

## The Agent

Each runtime session gets its own agent and Code Interpreter sandbox. Uploaded files are written to `uploads/`; whatever
the agent saves to `outputs/` is copied to S3 and streamed back as a presigned URL.

```typescript
const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, context) {
      const session = getSession(context.sessionId)
      if (request.files?.length) await writeUploads(session, request.files)

      for await (const event of session.agent.stream(prompt)) {
        // text deltas → 'message', tool calls → 'tool' and 'tool_result'
      }

      for (const name of await listNewArtifacts(session)) {
        const url = await publishArtifact(session, context.sessionId, name)
        yield { event: 'artifact', data: { name, url, mimeType: mimeTypeOf(name) } }
      }
    },
  },
})
```

→ [Full source](./app/agent/main.ts)

The request is `{ "prompt": string, "files"?: [{ "name": string, "content": base64 }] }` (up to 5 files of 10 MB).

`agentcore/cdk/lib/cdk-stack.ts` adds the Cognito user pool, a Code Interpreter in `SANDBOX` network mode (the agent
only needs the uploaded data, and no network means content in a file can't make it send your data anywhere), and a
private bucket the runtime can only put and read objects in. Because the pool is created in the same stack, the
runtime's JWT authorizer is set there too:

```typescript
const cfnRuntime = runtime.resource.node.defaultChild as agentcore.CfnRuntime
cfnRuntime.authorizerConfiguration = {
  customJwtAuthorizer: {
    discoveryUrl: `${userPool.userPoolProviderUrl}/.well-known/openid-configuration`,
    allowedClients: [webClient.userPoolClientId],
  },
}
```

## Run Locally

```bash
agentcore dev
```

The first run installs the agent's dependencies. In a second terminal, ask about the sample data:

```bash
PAYLOAD=$(jq -n --arg c "$(base64 < data/sample_sales_data.csv | tr -d '\n')" \
  '{prompt: "Which region has the highest total sales?", files: [{name: "sample_sales_data.csv", content: $c}]}')
agentcore invoke --runtime agent --local --payload "$PAYLOAD"
```

Locally the agent uses the AWS-managed Code Interpreter (also sandboxed) and, without a bucket, doesn't return files.
To get charts locally, deploy first and point the local agent at the deployed resources in `agentcore/.env.local`:

```
ARTIFACT_BUCKET=<ArtifactBucketName output>
CODE_INTERPRETER_ID=<CodeInterpreterId output>
```

To use the web app with the local agent, without sign-in:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy

```bash
npm install --prefix agentcore/cdk
agentcore deploy
```

Cognito only redirects back to the web app's registered URL, `http://localhost:3000` by default. To serve it elsewhere,
deploy with `FRONTEND_URL=https://your-host agentcore deploy` and set `FRONTEND_PORT` in `frontend/.env`.

The user pool has no self sign-up. Create a user with a generated password (the AWS CLI must use the region you
deployed to):

```bash
output() {
  aws cloudformation describe-stacks --stack-name AgentCore-DataAnalyzer-default \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
EMAIL=you@example.com
PASSWORD="$(openssl rand -base64 12)-Aa1"
aws cognito-idp admin-create-user --user-pool-id "$(output UserPoolId)" --username "$EMAIL" \
  --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true --message-action SUPPRESS
aws cognito-idp admin-set-user-password --user-pool-id "$(output UserPoolId)" --username "$EMAIL" \
  --password "$PASSWORD" --permanent
echo "$PASSWORD"
```

Point the web app at the deployed agent and start it:

```bash
cd frontend
cat > .env <<EOF
VITE_RUNTIME_URL=$(output RuntimeUrl)
VITE_COGNITO_DOMAIN=$(output CognitoDomain)
VITE_CLIENT_ID=$(output WebClientId)
EOF
npm install
npm run dev
```

Open http://localhost:3000, sign in, attach `data/sample_sales_data.csv` and ask for sales per region and category as a
chart. The app signs in with the authorization code flow and PKCE, keeps tokens in memory only, and calls the runtime
directly with the access token. Calls without a valid token are rejected:

```bash
agentcore invoke --runtime agent --payload '{"prompt": "Hello"}'
# Error: CUSTOM_JWT Runtime requires --bearer-token
```

## Clean Up

```bash
agentcore remove all --yes
agentcore deploy --yes
```

This deletes the deployed stack, including the user pool, its users and the bucket with its files. Run
`git checkout agentcore` to restore the configuration and deploy again.

The runtime, Code Interpreter and Bedrock are billed per use; see
[AgentCore pricing](https://aws.amazon.com/bedrock/agentcore/pricing/) and
[Bedrock pricing](https://aws.amazon.com/bedrock/pricing/).
