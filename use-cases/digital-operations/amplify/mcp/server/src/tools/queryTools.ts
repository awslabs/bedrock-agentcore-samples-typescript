import { z } from 'zod'
import { getConfiguredAmplifyClient } from './amplifyUtils'

// GraphQL query strings - only for active models
const queries = {}

// Helper function to create a tool for a "list" query
const createListTool = (name: string, description: string, queryString: string) => ({
  name,
  config: {
    title: name
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    description,
    // inputSchema: {
    //   filter: z.record(z.any()).optional().describe("Filter criteria for the query"),
    //   limit: z.number().optional().describe("Maximum number of items to return (default: 100)"),
    //   nextToken: z.string().optional().describe("Pagination token for fetching next page of results")
    // }
  },
  handler: async ({
    filter,
    limit,
    nextToken,
  }: {
    filter?: Record<string, any>
    limit?: number
    nextToken?: string
  }) => {
    try {
      const amplifyClient = getConfiguredAmplifyClient()

      const variables: any = {}
      if (filter) variables.filter = filter
      if (limit) variables.limit = limit
      if (nextToken) variables.nextToken = nextToken

      const result = await amplifyClient.graphql({
        query: queryString as any,
        variables,
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      let errorMessage: string
      if (error instanceof Error) {
        errorMessage = error.message
      } else {
        errorMessage = JSON.stringify(error)
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                error: `Failed to execute ${name}`,
                message: errorMessage,
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
})

// Export all tools as an array for easy registration
export const allQueryTools = []
