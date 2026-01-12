# Code Interpreter

Build AI agents that execute code in a secure sandbox using AgentCore's Code Interpreter.

## Sandbox Capabilities

The Code Interpreter provides three tools:

| Tool             | Description                           |
| ---------------- | ------------------------------------- |
| `executeCode`    | Run Python, JavaScript, or TypeScript |
| `fileOperations` | Read, write, list, or remove files    |
| `executeCommand` | Execute shell commands                |

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
  identifier: '<id>', // Your codeInterpreterId
})
```

## Quick Start

```bash
cd strands  # or vercel-ai
npm install
npm start                    # HTTP server on :8080
npm run start:interactive    # Interactive shell
```

### Test

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Calculate the first 20 prime numbers and create a bar chart"}'
```

## Artifact Retrieval

These samples automatically retrieve artifacts after each request. The agent is instructed to save outputs to `output/` in the sandbox, and the sample code downloads them locally:

```typescript
// After agent completes, retrieve artifacts from sandbox
const client = codeInterpreter.getClient()
const listing = await client.executeCommand({ command: 'ls -1 output/' })

for (const file of listing.split('\n').filter(Boolean)) {
  const content = await client.readFiles({ paths: [`output/${file}`] })
  // Binary files (images, PDFs) are returned as base64
  const buffer = Buffer.from(JSON.parse(content).blob, 'base64')
  fs.writeFileSync(`./output/${file}`, buffer)
}
```

Generated files are saved to `./output/` in your local directory
