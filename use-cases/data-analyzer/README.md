# Data Analyzer

A data analysis agent that runs Python in a sandboxed AgentCore Code Interpreter, with a React web app for uploading
files, streaming answers and showing the code it ran and the charts it created.

→ See the [parent README](../README.md) for the other use cases.

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock, AgentCore, Cognito and S3
- The AWS CLI, configured for the region you deploy to
- [jq](https://jqlang.org/)
- OpenSSL, to generate the test user's password
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
├── frontend/           # React + Vite web app in TypeScript
└── data/               # sample_sales_data.csv to try it with
```

## The Agent

```typescript
const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, context) {
      const session = getSession(context.sessionId)

      let prompt = request.prompt
      if (request.files?.length) {
        await writeUploads(session, request.files)
        const fileList = request.files.map((file) => `uploads/${file.name}`).join(', ')
        prompt = `Uploaded files: ${fileList}\n\n${request.prompt}`
      }

      for await (const event of session.agent.stream(prompt)) {
        if (event.type === 'beforeToolCallEvent') {
          const { toolUseId, name, input } = event.toolUse
          yield { event: 'tool', data: { toolUseId, name, input } }
        }
        // ...yield text deltas as message events
        // ...yield tool outputs as tool_result events
      }

      if (!artifactBucket) return

      for (const name of await listNewArtifacts(session)) {
        const url = await publishArtifact(session, context.sessionId, name)
        session.publishedArtifacts.add(name)
        yield { event: 'artifact', data: { name, url, mimeType: mimeTypeOf(name) } }
      }
    },
  },
})
```

Each runtime session gets its own agent and Code Interpreter sandbox, so follow-up questions can use earlier results.
`tool` events carry the `toolUseId` so the web app can pair each with its `tool_result`, which holds the code's output.
The request is `{ "prompt": string, "files"?: [{ "name": string, "content": base64 }] }`, with up to 5 files of 10 MB
each (about 70 MB as base64, within the runtime's 100 MB payload limit).

→ [Full source](./app/agent/main.ts)

## How It Works

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

Uploaded files are written to `uploads/` in the sandbox. Whatever the agent saves to `outputs/` is copied to S3 and
streamed back as a presigned URL. The web app shows the answer first, the code the agent ran (and its output) as a
collapsed step, and charts and files below the answer.

`agentcore/cdk/lib/cdk-stack.ts` adds the Cognito user pool, a Code Interpreter in `SANDBOX` network mode (the agent
only needs the uploaded data, and no network means content in a file can't make it send your data anywhere), and a
private bucket the runtime can only put and read objects in. Because the pool is created in the same stack, the
runtime's JWT authorizer is set there too:

```typescript
const cfnRuntime = runtime.resource.node.defaultChild as agentcore.CfnRuntime
cfnRuntime.authorizerConfiguration = {
  customJwtAuthorizer: {
    discoveryUrl: `${userPool.userPoolProviderUrl}/.well-known/openid-configuration`,
    allowedClients: [client.userPoolClientId],
  },
}
```

The web app signs in with the authorization code flow and PKCE, keeps tokens in memory only, and calls the runtime
directly with the access token.

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

Or use the web app with the local agent, without sign-in:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:3000. Locally the agent uses the AWS-managed Code Interpreter (also sandboxed) and, without a
bucket, doesn't return files; see [Configuration](#configuration) to get charts locally.

## Deploy

```bash
npm install --prefix agentcore/cdk
agentcore deploy
```

The user pool has no self sign-up. Create a user with a generated password:

```bash
STACK=AgentCore-DataAnalyzer-default
output() { aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
POOL_ID=$(output UserPoolId) CLIENT_ID=$(output ClientId)
PASSWORD="$(openssl rand -base64 24)Aa1!"
aws cognito-idp admin-create-user --user-pool-id $POOL_ID --username you@example.com --message-action SUPPRESS \
  --user-attributes Name=email,Value=you@example.com Name=email_verified,Value=true > /dev/null
aws cognito-idp admin-set-user-password --user-pool-id $POOL_ID --username you@example.com --password "$PASSWORD" --permanent
echo "$PASSWORD"
```

Point the web app at the deployed agent and start it:

```bash
cd frontend
cat > .env <<EOF
VITE_RUNTIME_URL=$(output RuntimeUrl)
VITE_COGNITO_DOMAIN=$(output CognitoDomain)
VITE_CLIENT_ID=$CLIENT_ID
EOF
npm install
npm run dev
```

Open http://localhost:3000, sign in, attach `data/sample_sales_data.csv` and ask for sales per region and category as a
chart.

The runtime rejects calls without a valid access token:

```bash
curl -s -w '\n%{http_code}\n' -X POST "$(output RuntimeUrl)" -H 'Content-Type: application/json' -d '{"prompt": "Hello"}'
```

```
{"jsonrpc":"2.0","error":{"code":-32001,"message":"Missing Authentication Token"}}
401
```

## Configuration

Cognito only redirects back to the web app's registered URL, `http://localhost:3000` by default. To serve the web app
elsewhere, deploy with `FRONTEND_URL=https://your-host agentcore deploy`, and set `FRONTEND_PORT` in `frontend/.env`
when you change the port.

To get charts and files from the local agent, deploy first and point it at the deployed bucket and Code Interpreter in
`agentcore/.env.local`, then restart `agentcore dev`:

```
ARTIFACT_BUCKET=<ArtifactBucketName output>
CODE_INTERPRETER_ID=<CodeInterpreterId output>
```

## Clean Up

The runtime, Code Interpreter and Bedrock are billed per use; see
[AgentCore pricing](https://aws.amazon.com/bedrock/agentcore/pricing/) and
[Bedrock pricing](https://aws.amazon.com/bedrock/pricing/). Removing the stack also deletes the user pool, its users
and the bucket with its files:

```bash
agentcore remove all --yes
agentcore deploy --yes
```

This deletes the deployed stack. Run `git checkout -- agentcore` to restore the configuration and deploy again.
