# Athena Integration Guide

This document describes the Amazon Athena integration that allows AI agents to dynamically execute SQL queries against structured data using GraphQL subscriptions.

## Overview

The integration provides a Lambda-backed GraphQL API that:

- Executes Athena SQL queries submitted by AI agents
- Returns results via AppSync subscriptions to avoid 30-second timeout limits
- Supports any Athena database/table accessible via IAM permissions
- Handles long-running queries asynchronously

## Architecture

```
AI Agent → GraphQL Mutation (executeAthenaQuery)
    ↓
AppSync → Lambda Function (athena-query)
    ↓
Amazon Athena → Execute SQL Query
    ↓
Lambda → Return Results
    ↓
AppSync Subscription (onAthenaQueryResult) → AI Agent
```

## Components

### 1. Lambda Function (`amplify/functions/athena-query/`)

- **handler.ts**: Executes Athena queries and retrieves results
- **resource.ts**: Lambda configuration (15-minute timeout, 1GB memory)

### 2. GraphQL Schema (`amplify/data/resource.ts`)

- **AthenaQueryStatus**: Enum for query states
- **AthenaQueryResult**: Result type with status, data, columns, error
- **executeAthenaQuery**: Mutation to start/check queries
- **onAthenaQueryResult**: Subscription for real-time results

### 3. Subscription Handler (`amplify/data/subscriptions/athena-query.js`)

- Passthrough resolver for subscription events

### 4. IAM Permissions (`amplify/backend.ts`)

- Lambda: Athena, S3, Glue permissions
- Agent Server: Athena query permissions
- Authenticated Users: (add if needed)

## Deployment

### Prerequisites

1. AWS Amplify Gen 2 project
2. Amazon Athena configured with data sources
3. Glue Data Catalog with databases and tables
4. S3 bucket for Athena query results

### Installation Steps

1. **Deploy Amplify backend**:

```bash
npm run sandbox
```

2. **Verify deployment**:

- Check Lambda function in AWS Console
- Verify IAM roles have Athena permissions
- Test query execution in AppSync Console

### Configuration

#### S3 Output Location

The Lambda function uses a default S3 location for query results:

```
s3://aws-athena-query-results-{account-id}-{region}/
```

To customize, set environment variable in `amplify/functions/athena-query/resource.ts`:

```typescript
export const athenaQuery = defineFunction({
  name: 'athena-query',
  entry: './handler.ts',
  timeoutSeconds: 900,
  memoryMB: 1024,
  environment: {
    ATHENA_OUTPUT_LOCATION: 's3://your-custom-bucket/athena-results/',
  },
})
```

#### Additional S3 Bucket Permissions

If using a custom S3 bucket, add permissions in `amplify/backend.ts`:

```typescript
backend.athenaQuery.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'],
    resources: ['arn:aws:s3:::your-custom-bucket', 'arn:aws:s3:::your-custom-bucket/*'],
  })
)
```

#### Additional Data Source Permissions

If your Athena queries access S3 data sources, grant Lambda access:

```typescript
backend.athenaQuery.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['s3:GetObject', 's3:ListBucket'],
    resources: ['arn:aws:s3:::your-data-bucket', 'arn:aws:s3:::your-data-bucket/*'],
  })
)
```

## Usage Examples

### Frontend TypeScript

```typescript
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '@/amplify/data/resource'

const client = generateClient<Schema>()

async function executeAthenaQuery(sqlQuery: string, database: string) {
  // First, start the query to get queryExecutionId
  const { data, errors } = await client.mutations.executeAthenaQuery({
    queryString: sqlQuery,
    database: database,
  })

  if (errors) {
    console.error('Mutation errors:', errors)
    return
  }

  const queryId = data?.queryExecutionId
  if (!queryId) {
    console.error('No query ID returned')
    return
  }

  console.log('Query started:', queryId)

  // Now subscribe to results for THIS SPECIFIC query
  // This ensures you only receive results for your query, not other users' queries
  const subscription = client.subscriptions
    .onAthenaQueryResult({
      queryExecutionId: queryId, // Filter: only receive updates for this query
    })
    .subscribe({
      next: (result) => {
        if (result.status === 'SUCCEEDED') {
          console.log('Query completed!')
          console.log('Columns:', result.columns)
          console.log('Data:', result.data)
          console.log('Rows:', result.rowCount)
          subscription.unsubscribe()
        } else if (result.status === 'FAILED') {
          console.error('Query failed:', result.error)
          subscription.unsubscribe()
        } else {
          console.log('Query status:', result.status)
        }
      },
      error: (error) => {
        console.error('Subscription error:', error)
      },
    })
}

// Usage
executeAthenaQuery('SELECT * FROM my_table LIMIT 10', 'my_database')
```

**Important**: The subscription now requires `queryExecutionId` as an argument. This ensures each user only receives results for their own queries, preventing cross-user data leakage in multi-user environments.

### AI Agent Integration

The AI agent can use this API to convert natural language to SQL and execute queries:

```typescript
// In your agent tools/functions
async function queryStructuredData(userQuestion: string) {
  // 1. Agent converts question to SQL
  const sqlQuery = await generateSQLFromQuestion(userQuestion)

  // 2. Execute via GraphQL
  const { data } = await client.mutations.executeAthenaQuery({
    queryString: sqlQuery,
    database: 'analytics',
  })

  // 3. Results arrive via subscription
  // 4. Agent formats and presents results
}
```

### Direct GraphQL

```graphql
# Start a query
mutation {
  executeAthenaQuery(
    queryString: "SELECT customer_id, COUNT(*) as order_count FROM orders GROUP BY customer_id ORDER BY order_count DESC LIMIT 10"
    database: "analytics"
  ) {
    queryExecutionId
    status
    data
    columns
    rowCount
    nextToken
  }
}

# Subscribe to results
subscription {
  onAthenaQueryResult {
    queryExecutionId
    status
    data
    columns
    error
    rowCount
    nextToken
  }
}

# Pagination - get next page of results
mutation {
  executeAthenaQuery(queryExecutionId: "existing-query-id", nextToken: "token-from-previous-response") {
    queryExecutionId
    status
    data
    rowCount
    nextToken
  }
}
```

## Query Flow

1. **Client subscribes** to `onAthenaQueryResult`
2. **Client calls mutation** `executeAthenaQuery` with SQL query
3. **Lambda starts** Athena query execution
4. **Lambda waits** 1 second and checks initial status
5. **Lambda returns** current status via mutation response
6. **Subscription delivers** the same result to client
7. If still running, **client can poll** by calling mutation again with `queryExecutionId`
8. **Subscription delivers** final results when query completes

## Pagination for Large Result Sets

The integration supports automatic pagination for queries that return more than 1000 rows per page.

### How Pagination Works

1. **First Page**: Execute query normally - returns up to 1000 rows plus column names
2. **Subsequent Pages**: Use `nextToken` from previous response - returns up to 1000 more rows
3. **Last Page**: When `nextToken` is `null` or absent, no more results available

### Pagination Example

```typescript
async function fetchAllResults(queryExecutionId: string) {
  let allData: any[] = []
  let columns: string[] = []
  let nextToken: string | undefined

  // Get first page
  const firstPage = await client.mutations.executeAthenaQuery({
    queryExecutionId: queryExecutionId,
  })

  if (firstPage.data?.status === 'SUCCEEDED') {
    columns = firstPage.data.columns || []
    allData = firstPage.data.data || []
    nextToken = firstPage.data.nextToken

    console.log(`First page: ${allData.length} rows`)
  }

  // Fetch remaining pages
  while (nextToken) {
    const nextPage = await client.mutations.executeAthenaQuery({
      queryExecutionId: queryExecutionId,
      nextToken: nextToken,
    })

    if (nextPage.data?.status === 'SUCCEEDED') {
      allData = allData.concat(nextPage.data.data || [])
      nextToken = nextPage.data.nextToken

      console.log(`Got page: ${nextPage.data.data?.length} rows, Total: ${allData.length}`)
    } else {
      break
    }
  }

  return { columns, data: allData, totalRows: allData.length }
}
```

### Important Notes

- **Column Names**: Only returned on the first page (when `nextToken` is not provided)
- **Page Size**: Each page contains up to 1000 rows
- **Token Expiration**: Tokens are valid for the duration of the query execution
- **Memory Consideration**: For very large result sets, consider processing pages incrementally rather than loading all into memory

### AI Agent Pagination Strategy

For AI agents handling large datasets:

```typescript
async function handleLargeQuery(sqlQuery: string, database: string) {
  // Start query
  const { data } = await client.mutations.executeAthenaQuery({
    queryString: sqlQuery,
    database: database,
  })

  const queryId = data?.queryExecutionId

  // Wait for completion (via subscription or polling)
  // Then fetch results with pagination

  let hasMore = true
  let nextToken: string | undefined
  let pageNum = 1

  while (hasMore) {
    const page = await client.mutations.executeAthenaQuery({
      queryExecutionId: queryId,
      nextToken: nextToken,
    })

    if (page.data?.status === 'SUCCEEDED') {
      // Process this page of data
      console.log(`Processing page ${pageNum}: ${page.data.rowCount} rows`)

      // Present results to user incrementally
      await presentDataToUser(page.data.data)

      // Check for more pages
      nextToken = page.data.nextToken
      hasMore = !!nextToken
      pageNum++
    } else {
      hasMore = false
    }
  }
}
```

## Monitoring and Debugging

### CloudWatch Logs

Lambda logs are available in CloudWatch:

```
/aws/lambda/athena-query-{environment}
```

Key log entries:

- Query execution start
- Query status checks
- Results retrieval
- Errors and exceptions

### AppSync Logs

Enable AppSync logging in AWS Console to debug GraphQL operations.

### Athena Console

Check query history and execution details in Athena Console:

- Query status and runtime
- Data scanned and cost
- Error messages
- Results preview

## Cost Considerations

Amazon Athena charges $5 per TB of data scanned. To minimize costs:

1. **Use partitioned tables** - Query only necessary partitions
2. **Use columnar formats** - Parquet or ORC reduce data scanned
3. **Add LIMIT clauses** - Restrict result sizes
4. **Use WHERE clauses** - Filter data early
5. **Monitor query costs** - Track data scanned per query

## Security Best Practices

1. **Input Validation**: Validate SQL queries before execution to prevent injection
2. **Least Privilege**: Grant Lambda only necessary Athena/Glue permissions
3. **Data Access**: Use Lake Formation for fine-grained access control
4. **Encryption**: Use encrypted S3 buckets for query results
5. **Audit Logging**: Enable CloudTrail for Athena API calls

## Troubleshooting

### Query Stays in RUNNING State

**Cause**: Query taking longer than expected
**Solution**:

- Check Athena console for query progress
- Verify data source accessibility
- Optimize query with better predicates

### Permission Denied Errors

**Cause**: Missing IAM permissions
**Solution**:

- Verify Lambda role has Athena permissions
- Check Glue catalog permissions
- Verify S3 bucket policies

### Subscription Not Receiving Results

**Cause**: Subscription not established before mutation
**Solution**:

- Always subscribe before executing mutation
- Check WebSocket connection status
- Verify AppSync endpoint configuration

### Large Result Sets Timeout

**Cause**: Results exceed Lambda memory or timeout
**Solution**:

- Add LIMIT clause to queries
- Increase Lambda memory if needed
- Implement pagination

## Advanced Features

### Pagination

For large result sets, implement pagination using Athena's `NextToken`:

```typescript
// Modify handler.ts to support pagination
const resultsCommand = new GetQueryResultsCommand({
  QueryExecutionId: queryExecutionId,
  MaxResults: 1000,
  NextToken: nextToken, // Add this parameter
})
```

### Query Cancellation

Add mutation to cancel running queries:

```graphql
mutation {
  cancelAthenaQuery(queryExecutionId: "id") {
    success
  }
}
```

### Query History

Store executed queries in DynamoDB for audit and reuse:

```typescript
// Add to handler.ts
await dynamodb.putItem({
  TableName: 'QueryHistory',
  Item: {
    queryExecutionId,
    userId,
    queryString,
    timestamp,
    status,
  },
})
```

## Related Documentation

- [Athena Query Lambda README](../amplify/functions/athena-query/README.md)
- [AWS Athena Documentation](https://docs.aws.amazon.com/athena/)
- [Amplify Gen 2 Functions](https://docs.amplify.aws/react/build-a-backend/functions/)
- [AppSync Subscriptions](https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html)
