# Data Analyzer Agent

A data analysis agent with Code Interpreter (internet-enabled) and S3 artifact storage, deployed via AWS CDK.

## What This Demonstrates

- **Code Interpreter with internet** — Fetch data from URLs and APIs, run Python/JS code
- **Artifact storage** — Generated files uploaded to S3 with session-based prefixes
- **CDK deployment** — Single command deploys all AWS resources

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

The deploy command builds and pushes the Docker image, creates the S3 bucket, Code Interpreter, IAM role, and AgentCore Runtime.

## Local Development

Copy CDK outputs to `.env`:

```bash
cp .env.example .env
# Set ARTIFACT_BUCKET and CODE_INTERPRETER_ID from deploy output
```

Run locally:

```bash
npm run dev
```

Test:

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Create a chart showing sales data for 5 products"}'
```

Check uploaded artifacts:

```bash
aws s3 ls s3://<your-bucket>/test-123/
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `us-east-1` | AWS region |
| `BEDROCK_REGION` | `us-east-1` | Bedrock model region |
| `BEDROCK_MODEL_ID` | `claude-haiku-4-5` | Model ID |
| `ARTIFACT_BUCKET` | — | S3 bucket (from CDK) |
| `CODE_INTERPRETER_ID` | — | Code Interpreter ID (from CDK) |

## Cleanup

```bash
npm run destroy
```
