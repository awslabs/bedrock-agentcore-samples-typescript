# MCP Timeout Investigation

## Issue Summary

When calling MCP tools that take longer than ~60 seconds to execute, the following error occurs:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "An internal error occurred while processing the request."
  }
}
```

Or when using the `@ai-sdk/mcp` client:

```
Error: Protocol error: Received a response for an unknown message ID
```

## Root Cause Analysis

### Initial Hypothesis (Incorrect)

Initially suspected this was a **client-side MCP TypeScript SDK timeout** issue based on:
- GitHub Issue [#245](https://github.com/modelcontextprotocol/typescript-sdk/issues/245) documenting a hardcoded 60-second timeout
- The `@ai-sdk/mcp` package wrapping the MCP TypeScript SDK

### Actual Root Cause (Correct)

Through testing with direct curl requests to AWS Bedrock AgentCore, confirmed the issue is:

**AWS Bedrock AgentCore has an undocumented ~60-second per-request timeout** for tool execution.

This is **separate from**:
- MCP TypeScript SDK client timeout
- Session lifecycle timeouts (configurable via `lifecycleConfiguration`)

## Test Results

### Test 1: Direct curl Request to Bedrock AgentCore

```bash
curl -X POST https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/${RUNTIME_ARN}/invocations \
  -H 'Authorization: Bearer ${ACCESS_TOKEN}' \
  -H 'accept: application/json, text/event-stream' \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "subtract",
      "arguments": {
        "a": 10,
        "b": 5
      }
    }
  }'
```

**Result**: Error `-32603` after ~60 seconds, proving it's not a client-side issue.

### Test 2: Tool with 2-Minute Delay

The subtract tool in `amplify/mcp/server/src/server.ts` has:

```typescript
async ({ a, b }) => {
  // Wait two minutes
  await new Promise(resolve => setTimeout(resolve, 120000));
  return {
    content: [{ type: "text", text: String(a - b) }]
  };
}
```

This exceeds the 60-second timeout, causing failures.

## AWS Bedrock AgentCore Configuration Options

### Available Lifecycle Configuration

AWS Bedrock AgentCore supports `lifecycleConfiguration` in `CfnRuntime`:

```typescript
this.runtime = new bedrock_agent_core.CfnRuntime(this, 'McpRuntime', {
  // ... other config
  
  lifecycleConfiguration: {
    idleRuntimeSessionTimeout: 900,  // 15 minutes (default)
    maxLifetime: 28800                // 8 hours (default)
  }
});
```

**Configuration Ranges**:
- `idleRuntimeSessionTimeout`: 60-28800 seconds (1 minute to 8 hours)
- `maxLifetime`: 60-28800 seconds (1 minute to 8 hours)

### What These Settings Control

| Setting | Purpose | Does NOT Control |
|---------|---------|------------------|
| `idleRuntimeSessionTimeout` | How long a session stays alive when idle | Individual tool request timeouts |
| `maxLifetime` | Maximum lifetime of a container instance | Individual tool request timeouts |

### What's Missing

**There is NO configuration option for per-request/per-tool-call timeout** in AWS Bedrock AgentCore.

## Error Code Reference

| Error Code | Meaning | Source |
|------------|---------|--------|
| `-32001` | Request timed out | MCP TypeScript SDK client |
| `-32603` | Internal server error | AWS Bedrock AgentCore (when request timeout occurs) |
| "Protocol error: Received a response for an unknown message ID" | Response received after client gave up | Client received late response for discarded request |

## Solution

### Short-Term Fix

**Reduce tool execution time to under 60 seconds.**

For the subtract tool, change:

```typescript
// FROM:
await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes

// TO:
await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
```

### Long-Term Patterns for Long-Running Operations

For operations that legitimately take over 60 seconds:

#### Option 1: Job ID Pattern

```typescript
// Tool 1: Start job
mcpServer.registerTool("start_job", 
  { /* ... */ },
  async (params) => {
    const jobId = generateJobId();
    startBackgroundJob(jobId, params);
    return {
      content: [{
        type: "text",
        text: `Job started with ID: ${jobId}`
      }]
    };
  }
);

// Tool 2: Check job status
mcpServer.registerTool("check_job_status",
  { /* ... */ },
  async ({ jobId }) => {
    const status = await getJobStatus(jobId);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(status)
      }]
    };
  }
);
```

#### Option 2: Streaming Progress Updates

For operations under 60 seconds that need progress updates, use streaming:

```typescript
mcpServer.registerTool("long_operation",
  { /* ... */ },
  async (params) => {
    // Send progress updates
    for (let i = 0; i < 10; i++) {
      await sendProgressNotification(i, 10);
      await doWorkChunk();
    }
    return { content: [{ type: "text", text: "Complete" }] };
  }
);
```

## Related Documentation

### AWS Documentation
- [AWS Bedrock AgentCore Lifecycle Settings](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-lifecycle-settings.html)
- [AWS::BedrockAgentCore::Runtime CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-bedrockagentcore-runtime.html)

### MCP Documentation
- [MCP TypeScript SDK Issue #245](https://github.com/modelcontextprotocol/typescript-sdk/issues/245) - Client-side 60s timeout
- [MCPcat Timeout Guide](https://mcpcat.io/guides/fixing-mcp-error-32001-request-timeout/)

## Recommendations

1. **Keep tool execution under 60 seconds** - This is a hard limit in AWS Bedrock AgentCore
2. **Use job patterns** for truly long-running operations
3. **Test timeout scenarios** during development
4. **Monitor execution times** in CloudWatch logs
5. **Document expected execution times** for each tool

## Conclusion

The 60-second timeout is imposed by **AWS Bedrock AgentCore at the request level** and is **not configurable**. While lifecycle configurations exist for session management, they do not affect individual tool call timeouts.

All MCP tools deployed on AWS Bedrock AgentCore must complete within approximately 60 seconds or implement asynchronous job patterns.

---

**Date**: November 18, 2025  
**Investigated by**: Cline AI Assistant  
**Status**: Confirmed - No configuration workaround available
