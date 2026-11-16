# Code Interpreter

Build agents that run code in a secure sandbox with AgentCore Code Interpreter.

→ See the [parent README](../README.md) for how the tools samples run.

| Sample                    | Framework     | Import                                                    |
| ------------------------- | ------------- | --------------------------------------------------------- |
| [strands](./strands/)     | Strands       | `bedrock-agentcore/experimental/code-interpreter/strands` |
| [vercel-ai](./vercel-ai/) | Vercel AI SDK | `bedrock-agentcore/code-interpreter/vercel-ai`            |

## Sandbox Capabilities

`codeInterpreter.tools` gives the agent three tools:

| Tool             | Description                           |
| ---------------- | ------------------------------------- |
| `executeCode`    | Run Python, JavaScript, or TypeScript |
| `fileOperations` | Read, write, list, or remove files    |
| `executeCommand` | Execute shell commands                |

**Pre-installed libraries:** pandas, numpy, matplotlib, seaborn, scipy, scikit-learn

**Session persistence:** Variables and files persist across tool calls within a sandbox session. A session times out
after 15 minutes by default (up to 8 hours); the samples then start the conversation over with a new sandbox.

**Sequential tool calls:** The samples run tool calls one at a time (`toolExecutor: 'sequential'` in Strands,
`toolCallConcurrency: 1` in the Vercel AI SDK). The sandbox starts on the first call, and parallel first calls would
each start one.

## Artifact Retrieval

The agent is told to save what it creates (charts, reports) to `output/` in the sandbox. After every turn in which the
agent used the sandbox, the samples copy those files to `./output/` on your machine:

```typescript
const client = codeInterpreter.getClient()
const listing = await client.executeCommand({ command: "find output -maxdepth 1 -type f -printf '%f\\n'" })

for (const file of listing.split(/\r?\n/).filter(Boolean)) {
  // Binary files come back as JSON with a base64 blob, text files as their contents
  const content = await client.readFiles({ paths: [`output/${file}`] })
  fs.writeFileSync(path.join('output', file), decodeFile(content))
}
```

## Network Access

Every AWS account has a default Code Interpreter, `aws.codeinterpreter.v1`. It runs in **SANDBOX** mode: no internet
access and no execution role, so no external network or S3 access.

To download data from public URLs, call external APIs or reach internal resources, create your own Code Interpreter
with `PUBLIC` or `VPC` network mode:

```bash
aws bedrock-agentcore-control create-code-interpreter \
  --region us-east-1 \
  --name "public_code_interpreter" \
  --description "Code Interpreter with public internet access" \
  --network-configuration '{"networkMode": "PUBLIC"}'
```

```json
{
  "codeInterpreterId": "public_code_interpreter-<suffix>",
  "codeInterpreterArn": "arn:aws:bedrock-agentcore:us-east-1:<account-id>:code-interpreter-custom/public_code_interpreter-<suffix>",
  "createdAt": "2026-11-16T15:10:50.358006+00:00",
  "status": "READY"
}
```

**Network modes:**

- `SANDBOX` – No internet access, no AWS resource access (default)
- `PUBLIC` – Can access public internet URLs
- `VPC` – Access resources within a specific VPC

Add `--execution-role-arn` to give the sandbox AWS permissions, such as which S3 buckets it can read from or write to.

Pass the `codeInterpreterId` when creating the tools:

```typescript
const codeInterpreter = new CodeInterpreterTools({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  identifier: 'public_code_interpreter-<suffix>',
})
```

Delete it when you no longer need it:

```bash
aws bedrock-agentcore-control delete-code-interpreter --region us-east-1 --code-interpreter-id <codeInterpreterId>
```
