# MCP Server Deployment Guide

## What Was Built

This setup creates a complete Amazon Bedrock AgentCore Runtime hosting an MCP (Model Context Protocol) server. Here's what the infrastructure includes:

### Components Created

1. **MCP Server** (`amplify/mcp/server/`)
   - TypeScript-based MCP server with StreamableHTTP transport
   - Runs on port 8000 at `/mcp` endpoint (AgentCore standard)
   - Example tools: `add`, `subtract` operations
   - Example prompt: `greeting-prompt`

2. **Docker Container**
   - Multi-stage build for optimized image size
   - Node.js 20 Alpine base
   - TypeScript compilation during build
   - Production-ready configuration

3. **AWS CDK Infrastructure** (`amplify/mcp/mcpServer.ts`)
   - `DockerImageAsset`: Automatically builds and pushes to ECR
   - `CfnRuntime`: Bedrock AgentCore Runtime hosting the MCP server
   - IAM Role: Execution role with ECR pull permissions
   - Network: AWSVPC mode configuration

4. **CloudFormation Outputs**
   - ECR Image URI
   - Image Tag
   - Runtime ARN
   - Runtime ID
   - Execution Role ARN

## How to Deploy

### 1. Deploy with Amplify Sandbox

```bash
npx ampx sandbox
```

This will:
1. Build the Docker image locally
2. Push it to ECR
3. Create the AgentCore Runtime
4. Output all the resource identifiers

### 2. Deploy to Production

```bash
npx ampx pipeline-deploy --branch main
```

## Using the MCP Server

### Get the Runtime ARN

After deployment, find the Runtime ARN in the CloudFormation outputs:

```bash
# Look for output named: McpRuntimeArn
```

Or check the AWS Console:
- CloudFormation → Your Stack → Outputs tab

### Invoke the Runtime

The MCP server is now running in AgentCore and can be invoked using the AWS SDK:

```typescript
import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from '@aws-sdk/client-bedrock-agentcore';

const client = new BedrockAgentCoreClient({ region: 'us-east-1' });

// Invoke the runtime
const response = await client.send(
  new InvokeAgentRuntimeCommand({
    agentRuntimeArn: 'YOUR_RUNTIME_ARN', // From CloudFormation outputs
    payload: {
      // Your MCP protocol messages here
    },
  })
);
```

### Test the Tools

The MCP server exposes these tools:

#### 1. Addition Tool
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "add",
    "arguments": {
      "a": 5,
      "b": 3
    }
  },
  "id": 1
}
```

#### 2. Subtraction Tool
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "subtract",
    "arguments": {
      "a": 10,
      "b": 4
    }
  },
  "id": 2
}
```

#### 3. Greeting Prompt
```json
{
  "jsonrpc": "2.0",
  "method": "prompts/get",
  "params": {
    "name": "greeting-prompt",
    "arguments": {
      "name": "Alice"
    }
  },
  "id": 3
}
```

## Adding Custom Tools

To add your own tools to the MCP server:

### 1. Edit the Server Code

Open `amplify/mcp/server/src/server.ts`:

```typescript
mcpServer.registerTool("my_custom_tool",
  {
    title: "My Custom Tool",
    description: "Does something custom",
    inputSchema: z.object({ 
      param1: z.string(),
      param2: z.number()
    })
  },
  async ({ param1, param2 }) => ({
    content: [{ 
      type: "text", 
      text: `Result: ${param1} - ${param2}` 
    }]
  })
);
```

### 2. Redeploy

```bash
npx ampx sandbox
```

The CDK will automatically:
1. Detect the code change
2. Rebuild the Docker image
3. Push the new image to ECR
4. Update the AgentCore Runtime

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                          │
│  (Next.js / React / CLI / Lambda / etc.)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ AWS SDK
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          Amazon Bedrock AgentCore Runtime                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           MCP Server Container (ECR)                  │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │  Node.js MCP Server                             │ │  │
│  │  │  - add tool                                     │ │  │
│  │  │  - subtract tool                                │ │  │
│  │  │  - greeting-prompt                              │ │  │
│  │  │  Listening on 0.0.0.0:8000/mcp                  │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

To pass environment variables to the MCP server:

### 1. Update Backend

In `amplify/backend.ts`:

```typescript
const mcpServer = new McpServerConstruct(backend.stack, 'McpServer', {
  environment: {
    MY_API_KEY: 'your-api-key',
    CUSTOM_CONFIG: 'value',
  },
});
```

### 2. Use in Server

Access in `amplify/mcp/server/src/index.ts`:

```typescript
const apiKey = process.env.MY_API_KEY;
```

## Monitoring & Debugging

### CloudWatch Logs

The runtime logs are available in CloudWatch:

1. Go to CloudWatch Console
2. Navigate to Log Groups
3. Find `/aws/bedrock/agentcore/runtime/mcp-server-runtime`

### View Runtime Status

```bash
aws bedrock-agentcore describe-runtime \
  --agent-runtime-id YOUR_RUNTIME_ID
```

## Cost Optimization

### Runtime Compute

The runtime is configured with:
- CPU: 1024 (1 vCPU)
- Memory: 2048 MB (2 GB)

You can adjust these in `mcpServer.ts` if needed.

### ECR Storage

Docker images are stored in ECR. Old images are automatically cleaned up by CDK when no longer referenced.

## Troubleshooting

### Build Fails

If Docker build fails:
```bash
cd amplify/mcp/server
npm install
npm run build
```

Check for TypeScript errors.

### Runtime Won't Start

Check CloudWatch Logs for container startup errors.

Common issues:
- Port not exposed (must be 8000)
- Endpoint not at /mcp
- Missing dependencies in package.json

### Tool Not Working

Verify the tool is registered:
```bash
# List tools
curl -X POST https://your-runtime-endpoint/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## Next Steps

1. **Add Real Tools**: Replace the example math tools with actual functionality
2. **Connect to APIs**: Add tools that call external APIs
3. **Add Resources**: Implement MCP resources for data access
4. **Create Prompts**: Define reusable prompt templates
5. **Integrate with Agents**: Use the runtime in your AI agent workflows

## References

- [AWS Bedrock AgentCore Documentation](https://docs.aws.amazon.com/bedrock-agentcore/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
