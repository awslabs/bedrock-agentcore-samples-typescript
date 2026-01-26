# Automatic Chat Session ID Injection

## Overview

This document describes how the chat session ID is automatically passed from the frontend to agent tools without requiring the AI to explicitly provide it in tool calls.

## Architecture

The solution uses a header-based approach to pass the `chatSessionId` from the frontend through AgentCore to the agent server, where it's automatically injected into tool parameters.

**Important**: AWS BedrockAgentCore requires custom headers to follow a specific naming pattern:
- Pattern: `X-Amzn-Bedrock-AgentCore-Runtime-Custom-[name]`
- Our header: `X-Amzn-Bedrock-AgentCore-Runtime-Custom-Chat-Session-Id`

### Flow

```
Frontend (useChat)
  ↓ (X-Amzn-Bedrock-AgentCore-Runtime-Custom-Chat-Session-Id header)
AgentCore Runtime
  ↓ (header forwarded)
Agent Server (/invocations)
  ↓ (extracted from header)
streamText (experimental_toolCallContext)
  ↓ (context passed to tools)
Tool Handlers (auto-injected into params)
```

## Implementation Details

### 1. Frontend (AgentCoreChatTransport)

**File**: `src/lib/agentCoreTransport.ts`

The transport adds the custom header when making requests:

```typescript
headers: {
  ...headers,
  'Content-Type': 'application/json',
  // AWS requires custom headers to follow the pattern: X-Amzn-Bedrock-AgentCore-Runtime-Custom-*
  ...(options.body?.chatSessionId && { 
    'X-Amzn-Bedrock-AgentCore-Runtime-Custom-Chat-Session-Id': options.body.chatSessionId 
  }),
}
```

### 2. AgentCore Configuration (CDK)

**File**: `amplify/custom/agentCoreRuntimeWithBuild.ts`

The AgentCore Runtime is configured to allow the custom header using `RequestHeaderConfiguration`:

```typescript
// Allow custom headers to be passed through to the container
// Note: Custom headers must follow AWS pattern: X-Amzn-Bedrock-AgentCore-Runtime-Custom-*
requestHeaderConfiguration: {
  requestHeaderAllowlist: ['X-Amzn-Bedrock-AgentCore-Runtime-Custom-Chat-Session-Id']
}
```

This uses CloudFormation's `RequestHeaderConfiguration` property with a `RequestHeaderAllowlist` that specifies which custom headers should be forwarded to the container. 

**Important**: AWS enforces a strict naming pattern for custom headers:
- Must match: `^(Authorization|X-Amzn-Bedrock-AgentCore-Runtime-Custom-[a-zA-Z0-9_-]+)$`
- Either `Authorization` or prefixed with `X-Amzn-Bedrock-AgentCore-Runtime-Custom-`
- The allowlist can contain up to 20 header names

**Note**: This requires `aws-cdk-lib` version 2.234.1 or later for proper TypeScript type support.

### 3. Agent Server (Express)

**File**: `amplify/agent/server/src/index.ts`

The server extracts the header and passes it to the handler:

```typescript
const chatSessionId = req.headers['x-amzn-bedrock-agentcore-runtime-custom-chat-session-id'] as string | undefined;
const response = await handleAgentRequest(req, chatSessionId);
```

CORS is configured to allow the custom header:

```typescript
res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Amzn-Bedrock-AgentCore-Runtime-Custom-Chat-Session-Id');
```

### 4. Request Context Module

**File**: `amplify/agent/server/src/context.ts`

A dedicated module manages the request context to avoid circular dependencies:

```typescript
// Store the current chat session ID for tool access
let currentChatSessionId: string | undefined;

export function setCurrentChatSessionId(sessionId: string | undefined): void {
    currentChatSessionId = sessionId;
}

export function getCurrentChatSessionId(): string | undefined {
    return currentChatSessionId;
}
```

### 5. Request Handler

**File**: `amplify/agent/server/src/server.ts`

The handler stores the session ID using the context module:

```typescript
import { setCurrentChatSessionId } from './context';

export async function handleAgentRequest(req, chatSessionId) {
    // Store the session ID for tool access
    setCurrentChatSessionId(chatSessionId);
    
    const result = streamText({
        model: model,
        messages: convertToModelMessages(messages),
        system: systemPrompt,
        tools: tools,
        // ... other config
    });
}
```

This approach uses a dedicated context module to avoid circular dependencies between init.ts and server.ts.

### 6. Tool Initialization

**File**: `amplify/agent/server/src/init.ts`

Tools are configured to retrieve the session ID from the context module:

```typescript
import { getCurrentChatSessionId } from './context';

execute: async (params: any) => {
  // Inject chatSessionId from request context if not already provided
  const chatSessionId = getCurrentChatSessionId();
  const enrichedParams = {
    ...params,
    ...(chatSessionId && !params.chatSessionId && { chatSessionId })
  };
  
  const result = await queryTool.handler(enrichedParams as any);
  return result.content?.[0]?.text || JSON.stringify(result);
}
```

This approach:
- Uses a dedicated context module to avoid circular dependencies
- Tools retrieve session ID via `getCurrentChatSessionId()` function
- Simpler than passing context through the AI SDK
- Works reliably with the current AI SDK version

### 7. Tool Definitions

**File**: `amplify/agent/server/src/tools/mutationTools.ts`

Tools that need the session ID have it completely removed from their schema since it's always auto-injected:

```typescript
inputSchema: z.object({
  name: z.string().describe('Display name for the layer'),
  // ... other params (no chatSessionId parameter)
})
```

Tool handlers validate that the session ID is present (it's injected by the tool wrapper):

```typescript
if (!params.chatSessionId) {
  throw new Error('chatSessionId is required but was not provided');
}
```

This approach:
- Prevents the AI from trying to provide the session ID
- Reduces token usage in tool calls
- Makes tool schemas cleaner and easier to understand
- Ensures the session ID always comes from the authenticated request context

## Benefits

1. **Invisible to AI**: The AI never sees or needs to provide the session ID
2. **Reduced Token Usage**: Session ID isn't in tool schemas or repeated in tool calls
3. **Better Security**: Session ID comes from authenticated request context, not AI input
4. **Cleaner Tool Calls**: Tool invocations are simpler and more focused on actual parameters
5. **Better UX**: Less chance of errors from incorrect session IDs

## Tools Affected

The following tools now automatically receive the chat session ID without it being in their schema:

- `create-map-layer` - Creates map layers for the current session (no chatSessionId parameter needed)
- `list-map-layers` - Lists map layers for the current session (no chatSessionId parameter needed)

## Deployment

After making these changes, you need to:

1. Deploy the updated CDK stack (for AgentCore configuration):
   ```bash
   npx ampx sandbox
   ```

2. The agent server will automatically rebuild and redeploy with the new configuration

## Testing

To verify the implementation:

1. Start a chat session
2. Ask the AI to create a map layer (the AI won't need to provide chatSessionId)
3. Check the agent logs to confirm the session ID was auto-injected
4. Verify the map layer was created with the correct session ID
5. Confirm the tool call in the UI doesn't show a chatSessionId parameter

## Troubleshooting

If the session ID isn't being passed:

1. Check browser network tab for the `X-Amzn-Bedrock-AgentCore-Runtime-Custom-Chat-Session-Id` header
2. Check agent server logs for "Chat session ID: ..." message
3. Verify AgentCore Runtime has `requestHeaderConfiguration` configured with the correct header name
4. Ensure CORS allows the custom header
5. Verify the header name follows AWS pattern: `X-Amzn-Bedrock-AgentCore-Runtime-Custom-*`

**Common Issues:**

- **CloudFormation validation error**: If you see a pattern validation error, ensure your custom header starts with `X-Amzn-Bedrock-AgentCore-Runtime-Custom-`
- **Header not received**: Check that the header name is lowercase in the Express server (`x-amzn-bedrock-agentcore-runtime-custom-chat-session-id`)
- **CORS errors**: Ensure the exact header name is in the CORS `Access-Control-Allow-Headers` list
