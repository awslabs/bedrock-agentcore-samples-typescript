# Testing Athena Integration

## Prerequisites

1. Deploy the backend:

```bash
npm run sandbox
```

2. Ensure you have:
   - AWS Athena configured with at least one database
   - Proper IAM permissions for Lambda to access Athena
   - S3 bucket for query results

## Test 1: Basic Query Execution

### Using the GraphQL Helper Script

```bash
# Test with a simple SHOW DATABASES query
npm run graphql -- 'mutation {
  executeAthenaQuery(
    queryString: "SHOW DATABASES"
  ) {
    queryExecutionId
    status
    data
    columns
    error
    rowCount
  }
}'
```

**Expected Response**:

- `status`: "RUNNING" or "SUCCEEDED"
- `queryExecutionId`: A valid Athena query execution ID (not "unknown" or "none")
- `error`: null (if successful)

### Check for Errors

If you see:

```json
{
  "queryExecutionId": "none",
  "status": "FAILED",
  "error": "..."
}
```

The error message will tell you what went wrong:

- **AccessDeniedException**: Lambda doesn't have Athena permissions
- **InvalidRequestException**: Invalid query syntax
- **Database not found**: Database doesn't exist

## Test 2: Query with Database Context

```bash
npm run graphql -- 'mutation {
  executeAthenaQuery(
    queryString: "SHOW TABLES",
    database: "your_database_name"
  ) {
    queryExecutionId
    status
    data
    columns
    error
  }
}'
```

## Test 3: Data Query

```bash
npm run graphql -- 'mutation {
  executeAthenaQuery(
    queryString: "SELECT * FROM your_table LIMIT 10",
    database: "your_database"
  ) {
    queryExecutionId
    status
    data
    columns
    rowCount
    error
  }
}'
```

## Test 4: Check Query Status

After starting a query, use the `queryExecutionId` to check status:

```bash
npm run graphql -- 'mutation {
  executeAthenaQuery(
    queryExecutionId: "your-query-execution-id-from-above"
  ) {
    queryExecutionId
    status
    data
    columns
    error
    rowCount
  }
}'
```

## Test 5: Pagination

For queries with more than 1000 rows:

```bash
# First page
npm run graphql -- 'mutation {
  executeAthenaQuery(
    queryString: "SELECT * FROM large_table",
    database: "your_database"
  ) {
    queryExecutionId
    status
    data
    rowCount
    nextToken
  }
}'

# If nextToken is returned, get next page:
npm run graphql -- 'mutation {
  executeAthenaQuery(
    queryExecutionId: "query-id-from-above",
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

## Test 6: Error Handling

Test with an invalid query to verify error handling:

```bash
npm run graphql -- 'mutation {
  executeAthenaQuery(
    queryString: "SELECT * FROM nonexistent_table"
  ) {
    queryExecutionId
    status
    error
  }
}'
```

**Expected**: `status` should be "FAILED" with a detailed error message.

## Test 7: Multi-User Subscription Isolation

This test requires two separate clients (e.g., two browser tabs or two terminal sessions):

**Client 1**:

```typescript
// Start query 1
const result1 = await executeQuery('SELECT 1')
// Subscribe to query 1 results
subscribe(result1.queryExecutionId)
```

**Client 2**:

```typescript
// Start query 2
const result2 = await executeQuery('SELECT 2')
// Subscribe to query 2 results
subscribe(result2.queryExecutionId)
```

**Expected**: Each client should only receive results for their own query, not the other client's query.

## Common Issues

### Issue: "AccessDeniedException"

**Cause**: Lambda doesn't have Athena permissions

**Solution**: Check `amplify/backend.ts` to ensure Lambda has:

```typescript
backend.athenaQuery.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['athena:StartQueryExecution', 'athena:GetQueryExecution', 'athena:GetQueryResults'],
    resources: ['*'],
  })
)
```

### Issue: "Failed to start query execution"

**Cause**: Missing S3 output location or permissions

**Solution**: Ensure:

1. S3 bucket exists for query results
2. Lambda has S3 write permissions
3. Output location is configured correctly

### Issue: Query returns "unknown" ID

**Cause**: Lambda encountered an error before Athena query could start

**Solution**: Check CloudWatch logs at `/aws/lambda/athena-query-{env}` for detailed error messages

## Monitoring

### CloudWatch Logs

Check Lambda logs for detailed execution info:

```bash
aws logs tail /aws/lambda/athena-query-sandbox --follow
```

### Athena Console

1. Go to AWS Athena Console
2. Check "Recent queries" tab
3. Verify your queries are appearing and their status

## Success Criteria

✅ Query executes without "unknown" or "none" as queryExecutionId
✅ Error messages are descriptive and actionable
✅ Successful queries return data with correct columns
✅ Pagination works for large result sets
✅ Multi-user queries don't interfere with each other
✅ Failed queries return clear error messages
