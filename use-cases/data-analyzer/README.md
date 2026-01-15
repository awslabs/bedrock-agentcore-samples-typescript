# Data Analyzer Agent

A data analysis agent with Code Interpreter (internet-enabled), S3 artifact storage, Cognito authentication, and a React frontend.

## What This Demonstrates

- **Code Interpreter with internet** — Fetch data from URLs and APIs, run Python/JS code
- **Artifact storage** — Generated files uploaded to S3 with session-based prefixes
- **Cognito authentication** — OAuth2 login for the deployed AgentCore Runtime
- **React frontend** — Chat interface with environment toggle (local vs deployed)
- **CDK deployment** — Single command deploys all AWS resources

## What Gets Created

The CDK stack deploys:

- **AgentCore Runtime** — Hosts the agent container with JWT authentication
- **Code Interpreter** — Sandboxed Python/JS execution with internet access
- **S3 Bucket** — Stores generated artifacts (charts, reports, etc.)
- **Cognito User Pool** — OAuth2 authentication with Managed Login v2 UI
- **Test User** — Pre-created user (user@example.com / password)

## Prerequisites

- Node.js 20+
- AWS CLI configured
- AWS CDK CLI: `npm install -g aws-cdk`
- Docker

## Quick Start

```bash
npm install
npm run bootstrap   # First time only
npm run deploy
```

After deployment, note the CDK outputs — you'll need them for the `.env` files.

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Fill `frontend/.env` with CDK outputs:
- `VITE_COGNITO_DOMAIN` ← CognitoDomain output
- `VITE_CLIENT_ID` ← WebClientId output
- `VITE_AWS_REGION` ← Your AWS region
- `VITE_RUNTIME_ARN` ← RuntimeArn output

Start the frontend:

```bash
npm run dev
```

Open http://localhost:3000 and login with:
- **Email:** user@example.com
- **Password:** password

Use the dropdown to switch between:
- **Local** — Sends requests to `localhost:8080` (no auth)
- **Deployed** — Sends requests to AgentCore Runtime (with OAuth token)

## Local Backend Development

```bash
cp .env.example .env
```

Fill `.env` with CDK outputs:
- `ARTIFACT_BUCKET` ← BucketName output
- `CODE_INTERPRETER_ID` ← CodeInterpreterId output

Run locally:

```bash
npm run dev
```

Test with curl:

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Create a chart showing sales data for 5 products"}'
```

## Cleanup

```bash
npm run destroy
```

## Cost

This sample incurs AWS charges for:
- **AgentCore Runtime** — Pay per invocation and compute time
- **Code Interpreter** — Pay per session and execution time
- **Bedrock model calls** — Pay per input/output tokens (Claude Haiku)
- **S3 storage** — Minimal cost for artifact storage
- **Cognito** — Free tier covers 50,000 MAUs

For development/testing, costs are typically a few dollars per day. Delete resources with `npm run destroy` when not in use.
