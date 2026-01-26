# GraphQL Query MCP Tools

This document describes the MCP tools that have been created to simplify GraphQL query execution for the SAFE-AI demo.

## Overview

Instead of requiring the AI agent to construct full GraphQL queries using the `execute-graphql` tool, we've created 31 specialized MCP tools that wrap common queries. The agent only needs to provide the required parameters (like IDs or filter criteria).

## Tool Categories

### Get Tools (16 tools)
These tools retrieve a single item by ID. They all follow the same pattern:

**Input Schema:**
- `id` (string, required): The ID of the item to retrieve

**Available Get Tools:**
- `get-area` - Get area details by ID
- `get-chat-message` - Get chat message by ID
- `get-chat-session` - Get chat session by ID
- `get-emergency-response` - Get emergency response plan by ID
- `get-equipment` - Get equipment details by ID
- `get-gas-monitoring` - Get gas monitoring data by ID
- `get-job-safety-analysis` - Get JSA by ID
- `get-maintenance-item` - Get maintenance item by ID
- `get-operation` - Get operation details by ID
- `get-personnel` - Get personnel information by ID
- `get-safety-bypass` - Get safety bypass by ID
- `get-safety-event` - Get safety event by ID
- `get-safety-indicator` - Get safety indicator by ID
- `get-shift-handover` - Get shift handover report by ID
- `get-weather` - Get weather information by ID
- `get-work-permit` - Get work permit by ID

### List Tools (15 tools)
These tools retrieve multiple items with optional filtering and pagination:

**Input Schema:**
- `filter` (object, optional): Filter criteria for the query
- `limit` (number, optional): Maximum number of items to return (default: 100)
- `nextToken` (string, optional): Pagination token for fetching next page

**Available List Tools:**
- `list-areas` - List all areas
- `list-chat-sessions` - List all chat sessions
- `list-emergency-responses` - List emergency response plans
- `list-equipment` - List all equipment
- `list-gas-monitorings` - List gas monitoring readings
- `list-job-safety-analyses` - List Job Safety Analyses
- `list-maintenance-items` - List maintenance items
- `list-operations` - List operations
- `list-personnel` - List personnel
- `list-safety-bypasses` - List safety bypasses
- `list-safety-events` - List safety events
- `list-safety-indicators` - List safety indicators
- `list-shift-handovers` - List shift handover reports
- `list-weathers` - List weather records
- `list-work-permits` - List work permits

## Usage Examples

### Example 1: Get a specific area
```json
{
  "tool": "get-area",
  "arguments": {
    "id": "area-123"
  }
}
```

### Example 2: List all operations
```json
{
  "tool": "list-operations",
  "arguments": {}
}
```

### Example 3: List operations with filter
```json
{
  "tool": "list-operations",
  "arguments": {
    "filter": {
      "status": { "eq": "IN_PROGRESS" }
    },
    "limit": 10
  }
}
```

### Example 4: List personnel with multiple filters
```json
{
  "tool": "list-personnel",
  "arguments": {
    "filter": {
      "shift": { "eq": "DAY" },
      "fatigueStatus": { "eq": "HIGH" }
    }
  }
}
```

## Benefits for the Demo

1. **Simplified Prompts**: The agent doesn't need to know GraphQL syntax
2. **Consistent Results**: All queries use the same field selections
3. **Type Safety**: Input parameters are validated with Zod schemas
4. **Error Handling**: Consistent error responses across all tools
5. **Performance**: Direct execution without query string construction

## Implementation Details

### File Structure
```
amplify/mcp/server/src/tools/
├── queryTools.ts       # New file with all 31 query tools
├── executeGraphql.ts   # Original generic GraphQL execution tool
└── amplifyUtils.ts     # Shared utilities for Amplify client
```

### How It Works

1. Each tool is created using factory functions (`createGetTool` or `createListTool`)
2. The GraphQL query strings are embedded directly in the file
3. Tools automatically handle:
   - Setting Amplify environment variables
   - Creating the Amplify client
   - Executing the query with provided variables
   - Formatting responses as JSON
   - Error handling and reporting

### Registration

All tools are automatically registered in `server.ts`:

```typescript
import { allQueryTools } from "./tools/queryTools";

// Register all query tools
allQueryTools.forEach(tool => {
  mcpServer.registerTool(
    tool.name,
    tool.config,
    tool.handler
  );
});
```

## Demo Scenarios

These tools are particularly useful for the SAFE-AI demo scenarios:

### Morning Safety Brief
- `list-safety-events` - Get overnight incidents
- `list-areas` - Check area statuses
- `list-work-permits` - Review active permits
- `list-personnel` - Check fatigue status
- `get-weather` - Check weather conditions

### Critical Decision Point
- `get-operation` - Get FCCU operation details
- `list-work-permits` - Check permit status (with filter)
- `list-personnel` - Review team readiness
- `list-gas-monitorings` - Check atmospheric conditions

### Emergency Response Planning
- `list-operations` - Get planned operations
- `list-equipment` - Check equipment status
- `get-weather` - Get forecast details
- `list-safety-events` - Review recent incidents

### Incident Prevention Analysis
- `list-safety-indicators` - Analyze safety metrics
- `list-safety-events` - Pattern analysis
- `list-safety-bypasses` - Check active bypasses

### End of Shift Review
- `list-operations` - Summary of active operations
- `list-work-permits` - Permit status summary
- `list-personnel` - Personnel status
- `list-safety-events` - Daily event summary

## Maintenance

When new GraphQL queries are added to `amplify/graphql/queries.ts`, you can add them to this system by:

1. Adding the query string to the `queries` object in `queryTools.ts`
2. Creating a new tool using `createGetTool` or `createListTool`
3. Adding the new tool to the `allQueryTools` array

The tool will be automatically registered on the next server restart.
