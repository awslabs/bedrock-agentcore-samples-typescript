# GraphQL Query Runner

A command-line helper script for running custom GraphQL queries against your Amplify backend.

## Overview

This script provides a simple way to execute GraphQL queries and mutations from the command line. It's designed to be flexible and work with any GraphQL schema - you write the queries yourself using standard GraphQL syntax.

**Note:** This is a generic GraphQL query runner. You need to write your own GraphQL queries based on your Amplify schema. The script does not provide model-specific helpers or auto-generated queries.

## Installation

The script uses `tsx` which is already installed as a dev dependency. No additional installation needed.

## Usage

```bash
npm run graphql -- '<your-graphql-query>'
npm run graphql -- interactive
```

### Basic Query

Run a single GraphQL query:

```bash
npm run graphql -- 'query { listChatSessions { items { id name createdAt } } }'
```

### Interactive Mode

Enter interactive mode to run multiple queries in sequence:

```bash
npm run graphql -- interactive
```

In interactive mode:

- Type your GraphQL queries directly
- Type `help` to see examples
- Type `exit` or `quit` to leave

### Help

Show help and examples:

```bash
npm run graphql -- help
```

## Query Examples

### List Items

```bash
# List all chat sessions
npm run graphql -- 'query { listChatSessions { items { id name createdAt } } }'

# List with a limit
npm run graphql -- 'query { listPersonnel(limit: 10) { items { id name role } } }'
```

### Filter Results

```bash
# Filter by status
npm run graphql -- 'query {
  listProcessEquipment(
    filter: { healthStatus: { eq: "CRITICAL" } }
  ) {
    items {
      equipmentTag
      name
      healthStatus
    }
  }
}'
```

### Get Single Item

```bash
# Get a specific work order by ID
npm run graphql -- 'query {
  getWorkOrder(id: "work-order-123") {
    id
    workOrderNumber
    status
    equipment {
      equipmentTag
      name
    }
  }
}'
```

### Query Nested Relationships

```bash
# Query with related data
npm run graphql -- 'query {
  listWorkOrders {
    items {
      id
      workOrderNumber
      type
      status
      equipment {
        equipmentTag
        name
        healthStatus
      }
      assignedPersonnel {
        name
        role
      }
    }
  }
}'
```

### Complex Queries with Multiple Filters

```bash
# Combine filters and limits
npm run graphql -- 'query {
  listDigitalTwinAlerts(
    filter: {
      and: [
        { severity: { eq: "CRITICAL" } },
        { status: { eq: "ACTIVE" } }
      ]
    },
    limit: 10
  ) {
    items {
      id
      title
      severity
      detectedAt
      equipment {
        equipmentTag
        name
      }
    }
  }
}'
```

### Execute Athena Query

```bash
# Start an Athena query
npm run graphql -- 'mutation {
  executeAthenaQuery(
    queryString: "SELECT * FROM my_database.my_table LIMIT 10",
    database: "my_database"
  ) {
    queryExecutionId
    status
    data
    columns
    rowCount
    nextToken
  }
}'

# Check query status and get results
npm run graphql -- 'mutation {
  executeAthenaQuery(
    queryExecutionId: "your-query-execution-id-from-above"
  ) {
    queryExecutionId
    status
    data
    columns
    rowCount
    nextToken
  }
}'

# Get next page of results (if nextToken was returned)
npm run graphql -- 'mutation {
  executeAthenaQuery(
    queryExecutionId: "your-query-execution-id",
    nextToken: "token-from-previous-response"
  ) {
    queryExecutionId
    status
    data
    rowCount
    nextToken
  }
}'
```

## Interactive Mode Example

```bash
$ npm run graphql -- interactive

🔧 Interactive Mode - Enter GraphQL queries
Type "help" for examples, "exit" to quit

graphql> query { listAreas { items { id name riskLevel } } }

⚡ Running custom query...
Query: query { listAreas { items { id name riskLevel } } }

✅ Query executed successfully
[... results ...]

graphql> query { listPersonnel(limit: 3) { items { name role } } }

⚡ Running custom query...
Query: query { listPersonnel(limit: 3) { items { name role } } }

✅ Query executed successfully
[... results ...]

graphql> exit

Goodbye! 👋
```

## Setup Requirements

The script automatically configures the Amplify environment using credentials from `amplify_outputs.json`. Ensure:

1. You have run `npx ampx sandbox` or deployed your backend
2. The `amplify_outputs.json` file exists in the project root
3. You have valid AWS credentials configured

## How to Write Queries

Since this is a generic query runner, you need to know your GraphQL schema to write queries. Here's how to find what queries are available:

### Finding Available Queries

1. **Check your schema**: Look at `amplify/data/resource.ts` to see your models
2. **Auto-generated queries**: Amplify generates these operations for each model:
   - `list<ModelName>s` - List all items
   - `get<ModelName>` - Get a single item by ID
   - `create<ModelName>` - Create a new item (mutation)
   - `update<ModelName>` - Update an item (mutation)
   - `delete<ModelName>` - Delete an item (mutation)

### Query Syntax

Standard GraphQL syntax applies:

```graphql
query {
  listModelNames(filter: { field: { eq: "value" } }, limit: 10) {
    items {
      id
      field1
      field2
      relatedModel {
        id
        name
      }
    }
  }
}
```

### Filter Operators

Common filter operators:

- `eq` - Equals
- `ne` - Not equals
- `gt` - Greater than
- `lt` - Less than
- `contains` - Contains substring
- `beginsWith` - Begins with
- `between` - Between two values
- `and` - Combine multiple conditions
- `or` - Any condition matches

## Troubleshooting

### amplify_outputs.json not found

If you see this error, you need to deploy your Amplify backend first:

```bash
npx ampx sandbox
```

### Authentication Errors

Ensure your AWS credentials are properly configured. The script uses the credentials provider configured in `utils/amplifyUtils.ts`.

### Query Syntax Errors

Make sure your queries:

- Start with `query` or `mutation`
- Use proper GraphQL syntax
- Reference valid model names and fields from your schema
- Are properly enclosed in quotes when passed as command arguments

### No Data Returned

If your query succeeds but returns no data:

- Check if your database has any items
- Verify your filter conditions
- Ensure you have proper authorization to read the data

## Tips

1. **Use Interactive Mode for Exploration**: Interactive mode is great for testing queries before adding them to your application

2. **Pretty Print Queries**: For complex queries, format them nicely:

   ```bash
   npm run graphql -- 'query {
     listWorkOrders {
       items {
         id
         status
       }
     }
   }'
   ```

3. **Check Authorization**: Remember that queries respect your schema's authorization rules

4. **Use Limits**: When exploring data, always use limits to avoid overwhelming output:
   ```bash
   npm run graphql -- 'query { listChatSessions(limit: 5) { items { id } } }'
   ```

## Script Features

- ✅ Automatic Amplify environment setup
- ✅ Colored terminal output for better readability
- ✅ Error handling with informative messages
- ✅ Interactive mode for multiple queries
- ✅ Support for all GraphQL queries and mutations
- ✅ Generic - works with any Amplify schema
- ✅ Type-safe with TypeScript
