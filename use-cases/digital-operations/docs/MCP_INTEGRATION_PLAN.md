# MCP Server Integration Plan for AI Chatbot

## Overview

This document outlines the plan to integrate a remote Model Context Protocol (MCP) server hosted on Amazon Bedrock AgentCore with the existing AI chatbot application using the AI SDK.

## Architecture

```
┌─────────────────┐
│  Next.js Chat   │
│   Application   │
└────────┬────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  API Route (src/app/api/chat/route.ts) │
│  - Creates MCP Client                  │
│  - Fetches tools from MCP server       │
│  - Passes tools to streamText          │
└────────┬───────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Amazon Bedrock AgentCore           │
│  - Hosts MCP Server                 │
│  - Exposes tools via HTTP           │
│  - OAuth authentication             │
└─────────────────────────────────────┘
```

## Prerequisites

### 1. MCP Server Deployment (AWS AgentCore)

You'll need to deploy your MCP server to AWS AgentCore first. Key information required:

- **Runtime ARN**: The AgentCore runtime ARN (e.g., `arn:aws:bedrock-agentcore:us-west-2:123456789012:runtime/my-mcp-server`)
- **Region**: AWS region where the server is deployed (e.g., `us-west-2`)
- **OAuth Configuration**:
  - Cognito User Pool ID
  - Cognito Client ID
  - Cognito Discovery URL
  - Bearer Token generation method

### 2. Required NPM Packages

```bash
npm install @ai-sdk/mcp
```

The package `@ai-sdk/mcp` provides the MCP client functionality for the AI SDK.

## Implementation Plan

### Step 1: Environment Configuration

Create/update `.env.local` with MCP server configuration:

```env
# MCP Server Configuration
MCP_SERVER_REGION=us-west-2
MCP_SERVER_RUNTIME_ARN=arn:aws:bedrock-agentcore:us-west-2:123456789012:runtime/my-mcp-server

# OAuth Configuration (Cognito)
MCP_COGNITO_POOL_ID=us-west-2_xxxxx
MCP_COGNITO_CLIENT_ID=xxxxx
MCP_COGNITO_USERNAME=your-username
MCP_COGNITO_PASSWORD=your-password
```

### Step 2: Create OAuth Token Service

Create a utility to handle Bearer token generation and caching:

**File**: `utils/mcpAuthService.ts`

```typescript
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider'

interface TokenCache {
  token: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

export async function getMCPBearerToken(): Promise<string> {
  // Return cached token if still valid
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token
  }

  const region = process.env.MCP_SERVER_REGION!
  const clientId = process.env.MCP_COGNITO_CLIENT_ID!
  const username = process.env.MCP_COGNITO_USERNAME!
  const password = process.env.MCP_COGNITO_PASSWORD!

  const client = new CognitoIdentityProviderClient({ region })

  const command = new InitiateAuthCommand({
    ClientId: clientId,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  })

  const response = await client.send(command)
  const accessToken = response.AuthenticationResult?.AccessToken

  if (!accessToken) {
    throw new Error('Failed to obtain access token from Cognito')
  }

  // Cache token (expires in 1 hour by default, we'll refresh at 55 minutes)
  tokenCache = {
    token: accessToken,
    expiresAt: Date.now() + 55 * 60 * 1000, // 55 minutes
  }

  return accessToken
}
```

**Required package**:

```bash
npm install @aws-sdk/client-cognito-identity-provider
```

### Step 3: Create MCP Client Helper

Create a utility to construct the MCP endpoint URL:

**File**: `utils/mcpClient.ts`

```typescript
export function getMCPServerUrl(): string {
  const region = process.env.MCP_SERVER_REGION!
  const runtimeArn = process.env.MCP_SERVER_RUNTIME_ARN!

  // URL-encode the ARN
  const encodedArn = runtimeArn.replace(/:/g, '%3A').replace(/\//g, '%2F')

  return `https://bedrock-agentcore.${region}.amazonaws.com/runtimes/${encodedArn}/invocations?qualifier=DEFAULT`
}
```

### Step 4: Modify API Route

Update `src/app/api/chat/route.ts` to integrate MCP tools:

```typescript
import { cookies } from 'next/headers'
import { runWithAmplifyServerContext } from '@/../utils/amplifyServerUtils'
import { fetchAuthSession } from 'aws-amplify/auth/server'

import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { streamText, UIMessage, convertToModelMessages, createIdGenerator } from 'ai'
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp'

import { loadOutputs } from '@/../utils/amplifyUtils'
import { getMCPBearerToken } from '@/../utils/mcpAuthService'
import { getMCPServerUrl } from '@/../utils/mcpClient'

const outputs = loadOutputs()

// Allow streaming responses up to 300 seconds
export const maxDuration = 300

export async function POST(req: Request) {
  let mcpClient

  try {
    const {
      messages,
      modelId,
    }: {
      messages: UIMessage[]
      modelId: string
    } = await req.json()

    console.log(`Calling model ${modelId}`)

    // Get authenticated credentials from the request context
    const { credentials } = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => fetchAuthSession(contextSpec),
    })

    if (!credentials) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Initialize Bedrock
    const bedrock = createAmazonBedrock({
      region: outputs.auth.aws_region,
      credentialProvider: async () => ({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      }),
    })

    const model = bedrock(modelId)

    // Initialize MCP client and fetch tools
    const mcpServerUrl = getMCPServerUrl()
    const bearerToken = await getMCPBearerToken()

    mcpClient = await createMCPClient({
      transport: {
        type: 'http',
        url: mcpServerUrl,
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      },
    })

    // Get tools from MCP server
    const mcpTools = await mcpClient.tools()
    console.log('Loaded MCP tools:', Object.keys(mcpTools))

    // Stream with MCP tools
    const result = streamText({
      model: model,
      messages: convertToModelMessages(messages),
      system:
        'You are a helpful assistant that can answer questions and help with tasks. You have access to tools that can help you accomplish various tasks.',
      tools: mcpTools,
      onFinish: async () => {
        // Close MCP client when streaming completes
        if (mcpClient) {
          await mcpClient.close()
        }
      },
    })

    // Send sources and reasoning back to the client with error handling
    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendSources: true,
      sendReasoning: true,
      generateMessageId: createIdGenerator({
        prefix: 'msg',
        size: 16,
      }),
      onError: (error) => {
        console.error('Stream error:', error)

        let errorMessage = 'An unknown error occurred'

        if (error && typeof error === 'object') {
          const apiError = error as any

          if (apiError.responseBody) {
            try {
              const responseBody =
                typeof apiError.responseBody === 'string' ? JSON.parse(apiError.responseBody) : apiError.responseBody

              if (responseBody.Message) {
                errorMessage = responseBody.Message
              } else if (responseBody.message) {
                errorMessage = responseBody.message
              } else if (apiError.message) {
                errorMessage = apiError.message
              }
            } catch (parseError) {
              errorMessage = apiError.message || errorMessage
            }
          } else if (apiError.message) {
            errorMessage = apiError.message
          }
        }

        return `Error: ${errorMessage}`
      },
    })
  } catch (error) {
    // Ensure MCP client is closed on error
    if (mcpClient) {
      await mcpClient.close()
    }

    console.error('Request error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(
      JSON.stringify({
        error: errorMessage,
        message: `Failed to initialize: ${errorMessage}`,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
```

### Step 5: Optional - Type-Safe Tool Configuration

If you want type safety for specific tools, you can define them explicitly:

```typescript
import { z } from 'zod'

// Define tool schemas for type safety
const toolSchemas = {
  get_weather: {
    inputSchema: z.object({
      location: z.string().describe('The city and state, e.g. San Francisco, CA'),
      unit: z.enum(['celsius', 'fahrenheit']).optional(),
    }),
  },
  search_database: {
    inputSchema: z.object({
      query: z.string().describe('The search query'),
      limit: z.number().optional().describe('Maximum number of results'),
    }),
  },
}

// Use in MCP client
const mcpTools = await mcpClient.tools({ schemas: toolSchemas })
```

## Configuration Options

### Option A: Use All Tools (Schema Discovery)

```typescript
const mcpTools = await mcpClient.tools()
```

**Pros**:

- Simple implementation
- Automatically includes all server tools
- No maintenance when server tools change

**Cons**:

- No TypeScript type safety
- May include tools you don't want to expose

### Option B: Define Specific Tools (Schema Definition)

```typescript
const mcpTools = await mcpClient.tools({ schemas: toolSchemas })
```

**Pros**:

- Full TypeScript type safety
- Control which tools are exposed
- Better IDE autocomplete

**Cons**:

- Requires manual schema definition
- Must update when server tools change

## Testing Plan

### Local Testing

1. **Start MCP Server Locally** (for development):

   ```bash
   python my_mcp_server.py
   ```

2. **Update environment variables** to point to localhost:

   ```env
   MCP_SERVER_URL=http://localhost:8000/mcp
   ```

3. **Test the chat API**:
   ```bash
   npm run dev
   ```

### Production Testing

1. **Deploy MCP server to AgentCore**
2. **Update environment variables** with production values
3. **Test OAuth token generation**:
   ```bash
   node -e "require('./utils/mcpAuthService').getMCPBearerToken().then(console.log)"
   ```
4. **Test end-to-end** through the chat interface

## Error Handling

### Common Issues and Solutions

| Issue                   | Solution                                                       |
| ----------------------- | -------------------------------------------------------------- |
| `401 Unauthorized`      | Verify Bearer token is valid and not expired                   |
| `Connection timeout`    | Check MCP server URL and network connectivity                  |
| `Tool execution failed` | Check MCP server logs for tool-specific errors                 |
| `Token expired`         | Implement token refresh logic (already in `mcpAuthService.ts`) |

## Security Considerations

1. **OAuth Credentials**: Store in AWS Secrets Manager or environment variables (never commit to git)
2. **Token Caching**: Implement token refresh before expiration
3. **Rate Limiting**: Consider rate limiting MCP tool calls
4. **Error Messages**: Don't expose sensitive information in error messages
5. **CORS**: Ensure proper CORS configuration if accessing from browser

## Monitoring and Logging

Add logging for:

- MCP client initialization
- Tool discovery
- Tool execution
- Token refresh events
- Errors and failures

Example:

```typescript
console.log('MCP Client initialized:', { url: mcpServerUrl, toolCount: Object.keys(mcpTools).length })
```

## Deployment Checklist

- [ ] Install `@ai-sdk/mcp` package
- [ ] Install `@aws-sdk/client-cognito-identity-provider` package
- [ ] Create `utils/mcpAuthService.ts`
- [ ] Create `utils/mcpClient.ts`
- [ ] Update `src/app/api/chat/route.ts`
- [ ] Configure environment variables
- [ ] Deploy MCP server to AgentCore
- [ ] Test OAuth authentication
- [ ] Test tool discovery
- [ ] Test end-to-end chat with tools
- [ ] Monitor for errors and performance

## Next Steps

1. **Build MCP Server**: Create your MCP server with the tools you want to expose
2. **Deploy to AgentCore**: Follow AWS documentation to deploy your server
3. **Configure OAuth**: Set up Cognito user pool and client
4. **Implement Integration**: Follow this plan to integrate with your chat app
5. **Test**: Thoroughly test the integration in development and production
6. **Monitor**: Set up monitoring and alerting for production use

## Resources

- [AI SDK MCP Documentation](https://sdk.vercel.ai/docs/ai-sdk-core/mcp-tools)
- [AWS AgentCore MCP Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-mcp.html)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [AI SDK Tool Calling](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling)

## Example MCP Server Tools

Here are some example tools you might implement in your MCP server:

```python
# my_mcp_server.py

from mcp.server.fastmcp import FastMCP

mcp = FastMCP(host="0.0.0.0", stateless_http=True)

@mcp.tool()
def search_database(query: str, limit: int = 10) -> str:
    """Search the database for records matching the query"""
    # Your implementation here
    return f"Found {limit} results for: {query}"

@mcp.tool()
def get_weather(location: str, unit: str = "fahrenheit") -> str:
    """Get current weather for a location"""
    # Your implementation here
    return f"Weather in {location}: 72°{unit[0].upper()}"

@mcp.tool()
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email"""
    # Your implementation here
    return f"Email sent to {to}"

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
```

## Conclusion

This plan provides a complete roadmap for integrating your AI chatbot with an Amazon AgentCore MCP server. The integration will enable your chatbot to use tools hosted on the MCP server while maintaining security through OAuth authentication and proper error handling.
