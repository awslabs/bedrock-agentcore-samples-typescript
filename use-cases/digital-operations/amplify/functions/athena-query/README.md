# Athena Query Lambda Function

This Lambda function provides a GraphQL API for executing Amazon Athena queries with real-time results via subscriptions. It's designed to work around the AWS AppSync 30-second query timeout by using a subscription pattern.

## Overview

The function executes Athena queries and returns results through AWS AppSync subscriptions, allowing long-running queries to complete without timing out. The AI agent can dynamically send SQL queries and receive results asynchronously.

## Architecture

1. **Mutation**: `executeAthenaQuery` - Starts an Athena query or checks query status
2. **Subscription**: `onAthenaQueryResult` - Receives real-time updates on query status and results
3. **Lambda Function**: Handles query execution and result retrieval

## IAM Permissions

The Lambda function has the following permissions:

- **Athena**: Start, get, and stop query executions
- **S3**: Read/write access to Athena query results bucket
- **Glue**: Read access to data catalog (databases, tables, partitions)

The Agent server also has Athena permissions to execute queries via GraphQL.

## Usage

### Starting a New Query

```graphql
mutation ExecuteQuery {
  executeAthenaQuery(queryString: "SELECT * FROM my_database.my_table LIMIT 10", database: "my_database") {
    queryExecutionId
    status
    data
    columns
    error
    rowCount
  }
}
```

### Subscribing to Query Results

```graphql
subscription OnQueryResult {
  onAthenaQueryResult {
    queryExecutionId
    status
    data
    columns
    error
    rowCount
  }
}
```

### Checking Query Status

If your query is still running, you can check its status by providing the `queryExecutionId`:

```graphql
mutation CheckQueryStatus {
  executeAthenaQuery(queryExecutionId: "your-query-execution-id") {
    queryExecutionId
    status
    data
    columns
    error
    rowCount
    nextToken
  }
}
```

### Pagination for Large Result Sets

When a query returns more than 1000 rows, the response will include a `nextToken`. Use this token to retrieve the next page of results:

```graphql
# First page - returns up to 1000 rows
mutation ExecuteQuery {
  executeAthenaQuery(queryString: "SELECT * FROM large_table", database: "my_database") {
    queryExecutionId
    status
    data
    columns
    rowCount
    nextToken # Present if more results available
  }
}

# Get next page using the token
mutation GetNextPage {
  executeAthenaQuery(queryExecutionId: "your-query-execution-id", nextToken: "token-from-previous-response") {
    queryExecutionId
    status
    data
    rowCount
    nextToken # Present if even more results available
  }
}
```

**Note**: When using `nextToken` for pagination:

- The `columns` field will be `null` (columns are only returned on the first page)
- Each page returns up to 1000 rows
- Keep calling with the new `nextToken` until it's no longer returned

## Query Statuses

- `QUEUED`: Query is waiting to be executed
- `RUNNING`: Query is currently executing
- `SUCCEEDED`: Query completed successfully (includes results)
- `FAILED`: Query failed (includes error message)
- `CANCELLED`: Query was cancelled

## TypeScript Client Example

```typescript
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '@/amplify/data/resource'

const client = generateClient<Schema>()

// Subscribe to query results
const subscription = client.subscriptions.onAthenaQueryResult().subscribe({
  next: (result) => {
    console.log('Query status:', result.status)
    if (result.status === 'SUCCEEDED') {
      console.log('Results:', result.data)
      console.log('Columns:', result.columns)
      console.log('Row count:', result.rowCount)
    } else if (result.status === 'FAILED') {
      console.error('Query failed:', result.error)
    }
  },
  error: (error) => console.error('Subscription error:', error),
})

// Execute query
const { data, errors } = await client.mutations.executeAthenaQuery({
  queryString: 'SELECT * FROM my_database.my_table LIMIT 10',
  database: 'my_database',
})

console.log('Query started:', data?.queryExecutionId)

// Later, unsubscribe
subscription.unsubscribe()
```

## AI Agent Usage

The AI agent can use this API to:

1. Convert natural language queries to SQL
2. Execute queries against Athena databases
3. Receive results asynchronously via subscriptions
4. Present data to users in conversational format

Example agent flow:

```
User: "Show me the top 10 customers by revenue"
Agent: Generates SQL -> "SELECT customer_name, SUM(revenue) as total_revenue
        FROM sales GROUP BY customer_name ORDER BY total_revenue DESC LIMIT 10"
Agent: Calls executeAthenaQuery mutation
Agent: Subscribes to results
Agent: Presents formatted results to user when query completes
```

## Configuration

### Environment Variables

The Lambda function supports the following environment variable:

- `ATHENA_OUTPUT_LOCATION`: S3 location for query results (optional)
  - Default: `s3://aws-athena-query-results-{account}-{region}/`

### Custom Output Location

To specify a custom S3 bucket for query results:

```graphql
mutation ExecuteQuery {
  executeAthenaQuery(
    queryString: "SELECT * FROM my_database.my_table"
    outputLocation: "s3://my-custom-bucket/athena-results/"
  ) {
    queryExecutionId
    status
  }
}
```

## Limitations

- Maximum result size: 1000 rows per query (configurable in handler.ts)
- Query timeout: 15 minutes (Lambda timeout)
- Result columns must be serializable to JSON

## Security Considerations

1. **SQL Injection**: The Lambda function passes queries directly to Athena. Implement input validation in your AI agent logic.
2. **Data Access**: The Lambda function has access to all Athena databases and tables via IAM. Consider implementing additional authorization logic if needed.
3. **Cost Management**: Athena queries are billed per data scanned. Monitor usage and consider implementing query cost estimation.

## Troubleshooting

### Query Status Remains "RUNNING"

- Check Athena console for query details
- Verify the query is syntactically correct
- Check if data source is accessible

### Permission Errors

- Verify Lambda has necessary IAM permissions
- Check S3 bucket policies for Athena results
- Ensure Glue data catalog is accessible

### Results Not Appearing

- Check subscription is active before executing mutation
- Verify query completed successfully in Athena console
- Check Lambda CloudWatch logs for errors

## Performance Optimization

For large result sets:

1. Use `LIMIT` clauses in SQL queries
2. Implement pagination by using query result tokens
3. Consider using Athena workgroups with result limits
4. Cache frequently accessed query results

## Future Enhancements

Potential improvements:

- Pagination support for large result sets
- Query cancellation via GraphQL
- Query cost estimation before execution
- Result caching layer
- Query history tracking
