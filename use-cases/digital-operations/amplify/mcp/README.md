# MCP Server for Amazon Bedrock AgentCore

This directory contains an MCP (Model Context Protocol) server designed to be deployed on Amazon Bedrock AgentCore Runtime using AWS CDK's `DockerImageAsset`.

## Project Structure

```
amplify/mcp/
├── README.md                 # This file
├── mcpServer.ts             # CDK construct for building and deploying the Docker image
└── server/                  # MCP server implementation
    ├── Dockerfile           # Docker configuration
    ├── package.json         # Node.js dependencies
    ├── tsconfig.json        # TypeScript configuration
    └── src/
        └── index.ts         # MCP server implementation
```

## How It Works

### Docker Image Build & Deploy

The `McpServerConstruct` in `mcpServer.ts` uses AWS CDK's `DockerImageAsset` to:

1. **Build** the Docker image locally during `npx ampx sandbox` or deployment
2. **Tag** the image with a content-based hash (ensures immutability)
3. **Push** to ECR in your CDK bootstrap repository
4. **Output** the image URI for use with AgentCore Runtime

### MCP Server Implementation

The server in `server/src/index.ts`:

- Uses **StreamableHTTP transport** (required by AgentCore)
- Listens on **0.0.0.0:8000/mcp** (AgentCore's expected endpoint)
- Is **stateless** (AgentCore handles session isolation)
- Implements a simple "hello_world" tool as an example

## Local Development

### Install Dependencies

```bash
cd amplify/mcp/server
npm install
```

### Run Locally

```bash
npm run dev
```

The server will start on `http://localhost:8000/mcp`

### Test the Server

You can test the MCP server locally by sending HTTP requests:

```bash
# List available tools
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# Call the hello_world tool
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "hello_world",
      "arguments": {
        "name": "World"
      }
    }
  }'
```

## Deployment

### Deploy with Amplify

When you run:

```bash
npx ampx sandbox
# or
npx ampx pipeline-deploy
```

The CDK will automatically:

1. Build the Docker image
2. Push it to ECR
3. Output the image URI in CloudFormation outputs

### Access the Image URI

After deployment, you can find the image URI in:

- CloudFormation outputs: `McpServerImageUri`
- The construct property: `mcpServer.imageUri`

## Using with AgentCore Runtime

To use this MCP server with Amazon Bedrock AgentCore Runtime, you'll need to:

1. **Create an AgentCore Runtime** configured to use the MCP protocol
2. **Point it to your ECR image URI** (available from `mcpServer.imageUri`)
3. **Invoke the runtime** with the appropriate session handling

Example (pseudo-code):

```typescript
import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from '@aws-sdk/client-bedrock-agentcore'

const client = new BedrockAgentCoreClient({ region: 'us-east-1' })

const response = await client.send(
  new InvokeAgentRuntimeCommand({
    agentRuntimeArn: 'your-runtime-arn',
    // AgentCore will use the container image and route to /mcp endpoint
    // Session ID is handled automatically by AgentCore
  })
)
```

## Adding New Tools

To add new tools to your MCP server:

1. Edit `server/src/index.ts`
2. Add your tool to the `ListToolsRequestSchema` handler
3. Implement the tool logic in the `CallToolRequestSchema` handler

Example:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'my_new_tool',
      description: 'Description of what this tool does',
      inputSchema: {
        type: 'object',
        properties: {
          param1: {
            type: 'string',
            description: 'Description of param1',
          },
        },
        required: ['param1'],
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'my_new_tool') {
    const param1 = (request.params.arguments as { param1: string }).param1
    // Your tool logic here
    return {
      content: [
        {
          type: 'text',
          text: `Result from my_new_tool with ${param1}`,
        },
      ],
    }
  }
})
```

## Environment Variables

You can pass environment variables to the MCP server by modifying `mcpServer.ts`:

```typescript
const mcpServer = new McpServerConstruct(backend.stack, 'McpServer', {
  environment: {
    MY_API_KEY: 'your-api-key',
    CUSTOM_CONFIG: 'value',
  },
})
```

Then update the Dockerfile to use these:

```dockerfile
ENV MY_API_KEY=${MY_API_KEY}
```

## Key Considerations

### AgentCore Requirements

- **Transport**: Must use StreamableHTTP (not stdio)
- **Endpoint**: Must be available at `0.0.0.0:8000/mcp`
- **Stateless**: Each request should be independent
- **Session Handling**: AgentCore adds `Mcp-Session-Id` header automatically

### CDK Benefits

- **Automatic builds**: Rebuilds only when content changes
- **Content-based tags**: Ensures immutability
- **Integrated deployment**: Works seamlessly with other AWS resources
- **No manual ECR setup**: Uses CDK bootstrap repository

## References

- [AWS Bedrock AgentCore MCP Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-mcp.html)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [AWS CDK DockerImageAsset](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecr_assets.DockerImageAsset.html)
- [AgentCore Samples](https://github.com/awslabs/amazon-bedrock-agentcore-samples)
