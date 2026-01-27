// Subscription handler with filtering by queryExecutionId
// Ensures users only receive results for their specific queries
export function request(ctx) {
  return {
    payload: ctx.arguments,
  }
}

export function response(ctx) {
  // Filter: Only return result if queryExecutionId matches subscription argument
  const subscriptionQueryId = ctx.arguments.queryExecutionId
  const resultQueryId = ctx.result.queryExecutionId

  // If no match, don't send this result to this subscriber
  if (subscriptionQueryId && resultQueryId !== subscriptionQueryId) {
    return null
  }

  return ctx.result
}
