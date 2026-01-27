# AgentCore Agent Deployment Guide

## Overview

This document describes the architecture and implementation plan for hosting a GenAI agent on Amazon Bedrock AgentCore Runtime, replacing the previous MCP server implementation with a direct agent deployment.

## Architecture

```
Frontend (useChat) → AgentCore Runtime → Bedrock Model
     ↓                      ↓                 ↓
  Bearer Token         /invocations      Claude/Nova
  (Cognito)            HTTP + SSE        via AI SDK
```

### Key Components

1. **Frontend (ChatBox.tsx)**
   - Uses Vercel AI SDK's `useChat` hook
   - Custom transport points directly to AgentCore endpoint
   - Bearer token authentication using Cognito access tokens

2. **AgentCore Runtime Agent**
   - Hosted on AWS Bedrock AgentCore Runtime
   - Runs on port 8080 (AgentCore standard)
   - Implements HTTP protocol contract with `/invocations` endpoint
   - Returns SSE streaming responses in Vercel AI SDK format

3. **Authentication**
   - Bearer token authentication
   - Cognito access tokens passed in Authorization header
   - AgentCore Runtime validates tokens automatically
   - No SigV4 signing required

## Protocol Requirements

### AgentCore HTTP Protocol Contract

**Container Requirements:**

- Host: `0.0.0.0`
- Port: `8080`
- Platform: ARM64

**Required Endpoints:**

- `POST /invocations` - Primary agent interaction endpoint
  - Input: JSON with `{ messages, modelId, chatSessionId }`
  - Output: SSE streaming or JSON response
- `GET /health` - Health check for monitoring

**Response Formats:**

- SSE (Server-Sent Events) for streaming
- JSON for non-streaming responses
- Must include proper CORS headers for browser access

## Implementation Plan

### Phase 1: Backend Updates

#### 1.1 Update index.ts

- [x] Change port from 8000 to 8080
- [x] Change primary endpoint from `/mcp` to `/invocations`
- [x] Add CORS headers for browser requests
- [x] Accept Vercel AI SDK request format
- [x] Return streaming response in SSE format

#### 1.2 Refactor server.ts

- [x] Export agent logic as callable function
- [x] Keep Vercel AI SDK streamText implementation
- [x] Maintain toUIMessageStreamResponse format
- [x] Support tool calling if needed

#### 1.3 Update Dockerfile

- [x] Ensure ARM64 platform specification
- [x] Expose port 8080
- [x] Optimize for AgentCore Runtime

### Phase 2: Frontend Updates

#### 2.1 Create AgentCore Client Utility

Create `src/lib/agentCoreClient.ts`:

- URL construction with ARN encoding
- Bearer token header generation
- Reusable across components

#### 2.2 Update ChatBox Component

- Configure custom transport for useChat
- Point to AgentCore endpoint
- Add Bearer token authentication
- Maintain existing functionality

### Phase 3: Infrastructure

#### 3.1 Amplify Outputs

- Export agent ARN from custom resource
- Make available to frontend via loadOutputs()

#### 3.2 Deployment

- Deploy container to AgentCore Runtime
- Configure environment variables
- Set up monitoring and logging

### Phase 4: Testing

#### 4.1 Local Testing

- Test agent locally on port 8080
- Verify /invocations endpoint accepts requests
- Test streaming responses
- Verify CORS configuration

#### 4.2 Integration Testing

- Deploy to AgentCore Runtime
- Test frontend transport connection
- Verify Bearer token authentication
- Test streaming from browser
- Verify error handling

## URL Construction

AgentCore endpoint URLs follow this pattern:

```
https://bedrock-agentcore.{region}.amazonaws.com/runtimes/{encoded-arn}/invocations?qualifier=DEFAULT
```

Where:

- `{region}`: AWS region (e.g., us-east-1)
- `{encoded-arn}`: URL-encoded agent ARN (`:` → `%3A`, `/` → `%2F`)
- `qualifier`: Runtime qualifier (typically "DEFAULT")

Example:

```typescript
const agentArn = 'arn:aws:bedrock-agentcore:us-east-1:123456789012:agent/my-agent'
const encodedArn = agentArn.replace(/:/g, '%3A').replace(/\//g, '%2F')
const url = `https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/${encodedArn}/invocations?qualifier=DEFAULT`
```

## Authentication Flow

1. User authenticates with Amplify Auth (Cognito)
2. Frontend requests access token via `fetchAuthSession()`
3. Token included in Authorization header as `Bearer {token}`
4. AgentCore Runtime validates token against Cognito
5. If valid, request is forwarded to agent container
6. Agent processes request and returns streaming response

## Request/Response Format

### Request (from useChat)

```json
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "modelId": "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "chatSessionId": "abc123"
}
```

### Response (SSE Streaming)

```
Content-Type: text/event-stream

data: {"type":"text","text":"Hello! How can I help you today?"}
data: {"type":"finish"}
```

## CORS Configuration

Required CORS headers for browser access:

```
Access-Control-Allow-Origin: * (or specific domain)
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

Preflight (OPTIONS) requests must return 200 status.

## Benefits of This Architecture

1. **Direct Connection**: Lower latency, no intermediate API route needed
2. **Streaming Support**: SSE streaming works in browser without Amplify SSR limitations
3. **Simplified Auth**: Bearer token is simpler than SigV4 signing
4. **Framework Compatibility**: Vercel AI SDK format works on both ends
5. **Scalability**: AgentCore Runtime provides auto-scaling and session isolation
6. **Cost Efficiency**: Consumption-based pricing, only pay for active processing

## Key Differences from MCP Server

| Aspect   | MCP Server     | GenAI Agent              |
| -------- | -------------- | ------------------------ |
| Protocol | JSON-RPC (MCP) | HTTP REST + SSE          |
| Port     | 8000           | 8080                     |
| Endpoint | `/mcp`         | `/invocations`           |
| Purpose  | Tool provider  | Conversational agent     |
| Input    | MCP tool calls | User prompts + messages  |
| Output   | Tool results   | Streaming chat responses |
| Auth     | Bearer token   | Bearer token (same)      |

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure CORS headers are set in backend
   - Check preflight OPTIONS requests return 200
   - Verify Authorization header is allowed

2. **Authentication Failures**
   - Verify Cognito token is valid and not expired
   - Check token is passed as `Bearer {token}`
   - Ensure AgentCore has access to Cognito user pool

3. **Streaming Not Working**
   - Verify Content-Type is `text/event-stream`
   - Check SSE format matches Vercel AI SDK expectations
   - Ensure connection stays open during streaming

4. **Agent Not Responding**
   - Check agent container logs in CloudWatch
   - Verify port 8080 is exposed and listening
   - Test /health endpoint

## References

- [AWS AgentCore Runtime Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html)
- [HTTP Protocol Contract](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-http-protocol-contract.html)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [AgentCore Starter Toolkit](https://github.com/aws/bedrock-agentcore-starter-toolkit)

## Next Steps

1. Complete backend implementation
2. Update Amplify infrastructure to export agent ARN
3. Implement frontend transport configuration
4. Deploy and test end-to-end
5. Monitor performance and costs
6. Add observability and logging
