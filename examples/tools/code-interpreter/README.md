# Code Interpreter Examples

Build AI agents that execute code in a secure sandbox using AgentCore's Code Interpreter.

## Available Implementations

| Framework | Directory |
|-----------|-----------|
| Strands SDK | [strands/](./strands/) |
| Vercel AI SDK | [vercel-ai/](./vercel-ai/) |

## Sandbox Capabilities

The Code Interpreter provides three tools:

| Tool | Description |
|------|-------------|
| `executeCode` | Run Python, JavaScript, or TypeScript |
| `fileOperations` | Read, write, list, or remove files |
| `executeCommand` | Execute shell commands |

**Pre-installed libraries:** pandas, numpy, matplotlib, seaborn, scipy, scikit-learn

**Session persistence:** Variables and files persist across tool invocations within a session. Sessions timeout after 15 minutes of inactivity (max 8 hours).

## Network Access

Every AWS account has access to a default Code Interpreter (`aws.codeinterpreter.v1`). This default environment runs in **SANDBOX** mode with no internet access and no execution role attached, meaning no external network or S3 access.

If you need to download data from public URLs, access external APIs, or connect to internal resources, create a custom Code Interpreter with `PUBLIC` or `VPC` network mode:

```bash
aws bedrock-agentcore create-code-interpreter \
  --region <region> \
  --name "my-code-interpreter" \
  --description "Code Interpreter with public internet access" \
  --network-configuration '{"networkMode": "PUBLIC"}' \
  --execution-role-arn "arn:aws:iam::<account-id>:role/<execution-role>"
```

**Network modes:**
- `SANDBOX` – No internet access, no AWS resource access (default)
- `PUBLIC` – Can access public internet URLs
- `VPC` – Access resources within a specific VPC

**Execution role:** Determines AWS access permissions, including which S3 buckets the agent can read from or write to.

The response contains the `codeInterpreterId`:

```json
{
  "codeInterpreterArn": "arn:aws:bedrock-agentcore:<region>:<account-id>:code-interpreter/<id>",
  "codeInterpreterId": "<id>",
  "createdAt": "2024-01-15T10:30:00Z",
  "status": "ACTIVE"
}
```

Pass this identifier when creating the tools:

```typescript
const codeInterpreter = new CodeInterpreterTools({
  region: '<region>',
  identifier: '<id>',  // Your codeInterpreterId
})
```

## Quick Start

```bash
cd strands  # or vercel-ai
npm install
make dev
```

### Test (Default Sandbox)

The default Code Interpreter works for computations that don't require network access:

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Calculate the first 20 prime numbers and sum them up"}'
```

### Test (With Internet Access)

If you've created a Code Interpreter with `PUBLIC` network mode, try prompts that fetch external data:

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Download the California Housing dataset from https://raw.githubusercontent.com/ageron/handson-ml2/master/datasets/housing/housing.csv and tell me the average median_house_value grouped by ocean_proximity. Create a lightweight visualisation and store as a .png"}'
```

## Retrieving Artifacts

When agents create files in the sandbox (visualizations, reports, processed data), you have several options for retrieving them:

**1. Discovery**

Use the `listFiles` API or have the agent run `ls` to discover created files:

```typescript
const client = codeInterpreter.getClient()
const files = await client.executeCommand({ command: 'ls -la output/' })
```

**2. Direct Retrieval**

Use the `readFiles` API to retrieve file contents. Binary files (images, PDFs) are returned as base64:

```typescript
const content = await client.readFiles({ paths: ['output/chart.png'] })
// Returns base64-encoded content for binary files
```

**3. S3 Upload**

Have the agent upload artifacts directly to S3. Requires a custom Code Interpreter with an execution role that has S3 write permissions

