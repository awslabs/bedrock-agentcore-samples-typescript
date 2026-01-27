//This file will have an MCP tool which will allow the agent to execute any graphql operation
import { z } from 'zod'
import { getConfiguredAmplifyClient } from './amplifyUtils'

export const executeGraphqlTool = {
  name: 'execute-graphql',
  config: {
    title: 'Execute GraphQL',
    description:
      'Execute any GraphQL query or mutation against the AppSync API. Supports queries, mutations, and subscriptions with optional variables.',
    inputSchema: z.object({
      query: z.string().describe('The GraphQL query or mutation to execute'),
      variables: z.record(z.string(), z.any()).optional().describe('Optional variables for the GraphQL operation'),
    }),
  },
  handler: async ({ query, variables }: { query: string; variables?: Record<string, any> | undefined }) => {
    try {
      // await setAmplifyEnvVars()
      const amplifyClient = getConfiguredAmplifyClient()

      const result = await amplifyClient.graphql(
        {
          query: query as any,
          variables: variables || {},
        },
        { authMode: 'identityPool' }
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      // Get error details
      let errorMessage: string
      let errorDetails: any = undefined

      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        // For object errors (like GraphQL errors), stringify the whole thing
        errorMessage = JSON.stringify(error)
        errorDetails = error
      } else {
        errorMessage = String(error)
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                error: 'Failed to execute GraphQL query',
                message: errorMessage,
                ...(errorDetails && { details: errorDetails }),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      }
    }
  },
}
