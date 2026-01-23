# Data Analyzer

A data analysis agent that executes code in a secure sandbox using AgentCore Code Interpreter. Includes a React frontend with file upload, streaming responses, and Cognito authentication.

## Features

- **Code Interpreter** — Execute code in a secure sandbox with internet access
- **File Upload** — Upload CSV, Excel, JSON, or TXT files for analysis
- **Artifact Storage** — Generated charts and files uploaded to S3
- **Streaming** — Real-time streaming of agent responses and tool execution
- **Authentication** — Cognito OAuth2 for deployed endpoint, no auth for local development

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   React     │────▶│ AgentCore       │────▶│ Code Interpreter │
│   Frontend  │◀────│ Runtime         │◀────│    (sandbox)     │
└─────────────┘     └─────────────────┘     └──────────────────┘
       │                    │
       │                    ▼
       │            ┌─────────────┐
       └───────────▶│ S3 Bucket   │
         (presigned │ (artifacts) │
          URLs)     └─────────────┘
```

The CDK stack deploys:

- **AgentCore Runtime** — Hosts the agent with JWT authentication
- **Code Interpreter** — Sandboxed execution with internet access (PUBLIC network mode)
- **S3 Bucket** — Stores generated artifacts (charts, reports, etc.)
- **Cognito User Pool** — OAuth2 with Managed Login UI and test user

## Prerequisites

- Node.js 20+
- AWS CLI configured with appropriate permissions
- AWS CDK CLI: `npm install -g aws-cdk`
- Docker (for local development)

## Deploy

```bash
npm install
npm run bootstrap   # First time only
npm run deploy
```

Note the CDK outputs — you'll need them for the `.env` files.

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Fill `frontend/.env` with CDK outputs:

```
VITE_COGNITO_DOMAIN=<CognitoDomain output>
VITE_CLIENT_ID=<WebClientId output>
VITE_AWS_REGION=<your region, e.g., us-east-1>
VITE_RUNTIME_ARN=<RuntimeArn output>
```

Start the frontend:

```bash
npm run dev
```

Open http://localhost:3000 and login with:

- **Email:** user@example.com
- **Password:** password

To test, try uploading `data/sample_sales_data.csv` and ask the agent to show sales per region per category.

## Request Format

The agent accepts JSON requests with the following schema:

```json
{
  "prompt": "Analyze this data and create a chart",
  "files": [
    {
      "name": "data.csv",
      "content": "<base64-encoded content>"
    }
  ]
}
```

| Field    | Type   | Required | Description                                     |
| -------- | ------ | -------- | ----------------------------------------------- |
| `prompt` | string | Yes      | The analysis request or question                |
| `files`  | array  | No       | Files to upload (name + base64-encoded content) |

Files are written to the `artifacts/` directory in the sandbox and referenced in the prompt automatically.

## Local Development

For backend development without deploying:

```bash
cp .env.example .env
```

Fill `.env`:

```
ARTIFACT_BUCKET=<BucketName output>
CODE_INTERPRETER_ID=<CodeInterpreterId output>
```

Run:

```bash
npm run dev
```

The frontend can switch between local (`localhost:8080`) and deployed endpoints using the dropdown.

## Clean Up

```bash
npm run destroy
```

## Pricing

This sample uses the following AWS services:

| Service               | Pricing                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **AgentCore Runtime** | vCPU-hour + GB-hour (billed per second) — [AgentCore Pricing](https://aws.amazon.com/bedrock/agentcore/pricing/) |
| **Code Interpreter**  | vCPU-hour + GB-hour (billed per second) — [AgentCore Pricing](https://aws.amazon.com/bedrock/agentcore/pricing/) |
| **Bedrock (Claude)**  | Per input/output token — [Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)                              |
| **S3**                | Storage and requests — [S3 Pricing](https://aws.amazon.com/s3/pricing/)                                          |
| **Cognito**           | Monthly active users — [Cognito Pricing](https://aws.amazon.com/cognito/pricing/)                                |

AgentCore Runtime and Code Interpreter only incur costs when actively processing requests. For development and testing, expect costs below $1/day. Delete resources with `npm run destroy` when no longer needed.
