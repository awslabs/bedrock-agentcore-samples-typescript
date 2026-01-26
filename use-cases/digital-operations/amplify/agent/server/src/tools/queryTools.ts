import { z } from "zod";
import { getConfiguredAmplifyClient } from "./amplifyUtils";

// GraphQL queries for ActionItems and WorkoverJobs
const queries = {
  listActionItems: /* GraphQL */ `
    query ListActionItems($limit: Int, $nextToken: String) {
      listActionItems(limit: $limit, nextToken: $nextToken) {
        items {
          id
          alertId
          type
          action
          description
          expectedValue
          risk
          status
          source
          createdAt
          updatedAt
        }
        nextToken
      }
    }
  `,
  getActionItem: /* GraphQL */ `
    query GetActionItem($id: ID!) {
      getActionItem(id: $id) {
        id
        alertId
        type
        action
        description
        expectedValue
        risk
        status
        source
        createdAt
        updatedAt
      }
    }
  `,
  listWorkoverJobs: /* GraphQL */ `
    query ListWorkoverJobs($limit: Int, $nextToken: String) {
      listWorkoverJobs(limit: $limit, nextToken: $nextToken) {
        items {
          id
          wellName
          location
          jobType
          priority
          status
          estimatedDuration
          scheduledDate
          rigAssigned
          description
          estimatedCost
          financialMetrics {
            incrementalOilBOPD
            incrementalGasMCFD
            presentValue
            rateOfReturn
            paybackMonths
          }
          createdAt
          updatedAt
        }
        nextToken
      }
    }
  `,
  getWorkoverJob: /* GraphQL */ `
    query GetWorkoverJob($id: ID!) {
      getWorkoverJob(id: $id) {
        id
        wellName
        location
        jobType
        priority
        status
        estimatedDuration
        scheduledDate
        rigAssigned
        description
        estimatedCost
        financialMetrics {
          incrementalOilBOPD
          incrementalGasMCFD
          presentValue
          rateOfReturn
          paybackMonths
        }
        createdAt
        updatedAt
      }
    }
  `
};

// GraphQL mutation for executing Athena queries
const executeAthenaQueryMutation = /* GraphQL */ `
  mutation ExecuteAthenaQuery(
    $queryString: String
    $database: String
    $outputLocation: String
    $queryExecutionId: String
    $nextToken: String
  ) {
    executeAthenaQuery(
      queryString: $queryString
      database: $database
      outputLocation: $outputLocation
      queryExecutionId: $queryExecutionId
      nextToken: $nextToken
    ) {
      queryExecutionId
      status
      data
      columns
      error
      rowCount
      nextToken
    }
  }
`;

// SQL Query Tool
const sqlQueryTool = {
  name: 'execute-sql-query',
  config: {
    title: 'Execute SQL Query',
    description: 'Execute SQL queries using Amazon Athena and return the results. Waits for query completion and returns data.',
    inputSchema: z.object({
      queryString: z.string().describe("The SQL query to execute"),
      database: z.string().optional().describe("The database to query (optional)"),
      outputLocation: z.string().optional().describe("S3 location for query results (optional)"),
    })
  },
  handler: async (params: any) => {
    try {
      console.log('SQL Query Tool - Received params:', JSON.stringify(params, null, 2));
      
      const client = getConfiguredAmplifyClient();
      
      // Validate that queryString is present and not empty
      if (!params.queryString || typeof params.queryString !== 'string' || params.queryString.trim() === '') {
        throw new Error('queryString parameter is required and must be a non-empty string');
      }
      
      console.log('SQL Query Tool - Executing query:', params.queryString);
      
      // Execute the initial query
      const initialResult = await client.graphql({
        query: executeAthenaQueryMutation,
        variables: {
          queryString: params.queryString,
          database: params.database,
          outputLocation: params.outputLocation,
        }
      });

      console.log('SQL Query Tool - GraphQL result:', JSON.stringify(initialResult, null, 2));

      const data = 'data' in initialResult ? initialResult.data : null;
      if (!data || !data.executeAthenaQuery) {
        throw new Error("No result returned from executeAthenaQuery");
      }

      let queryExecutionId = data.executeAthenaQuery.queryExecutionId;
      let status = data.executeAthenaQuery.status;
      let result = data.executeAthenaQuery;

      // Poll for completion if query is still running
      const maxAttempts = 60; // 5 minutes with 5-second intervals
      let attempts = 0;

      while ((status === "QUEUED" || status === "RUNNING") && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const pollResult = await client.graphql({
          query: executeAthenaQueryMutation,
          variables: {
            queryExecutionId,
          }
        });

        const pollData = 'data' in pollResult ? pollResult.data : null;
        if (pollData && pollData.executeAthenaQuery) {
          result = pollData.executeAthenaQuery;
          status = pollData.executeAthenaQuery.status;
        }
        
        attempts++;
      }

      // Check final status
      if (status === "FAILED") {
        return {
          content: [{ 
            type: "text" as const, 
            text: JSON.stringify({
              success: false,
              error: result.error || "Query execution failed",
              queryExecutionId,
              status,
            }, null, 2)
          }],
          isError: true
        };
      }

      if (status === "CANCELLED") {
        return {
          content: [{ 
            type: "text" as const, 
            text: JSON.stringify({
              success: false,
              error: "Query execution was cancelled",
              queryExecutionId,
              status,
            }, null, 2)
          }],
          isError: true
        };
      }

      if (status === "QUEUED" || status === "RUNNING") {
        return {
          content: [{ 
            type: "text" as const, 
            text: JSON.stringify({
              success: false,
              error: "Query execution timed out after 5 minutes",
              queryExecutionId,
              status,
            }, null, 2)
          }],
          isError: true
        };
      }

      // Query succeeded
      return {
        content: [{ 
          type: "text" as const, 
          text: JSON.stringify({
            success: true,
            queryExecutionId,
            status,
            data: result.data,
            columns: result.columns,
            rowCount: result.rowCount,
            nextToken: result.nextToken,
            message: `Query executed successfully. Retrieved ${result.rowCount || 0} rows.`
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error("SQL Query Tool Error:", error);
      
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = JSON.stringify(error);
      }

      return {
        content: [{ 
          type: "text" as const, 
          text: JSON.stringify({
            success: false,
            error: "Failed to execute SQL query",
            message: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

// List Action Items Tool
const listActionItemsTool = {
  name: 'list-action-items',
  config: {
    title: 'List Action Items',
    description: 'List all action items with their current status, type, and details. Use this to get an overview of pending, approved, rejected, or deferred actions.',
    inputSchema: z.object({
      limit: z.number().optional().describe('Maximum number of action items to return (default: 100)'),
      nextToken: z.string().optional().describe('Pagination token for next page of results')
    })
  },
  handler: async (params: any) => {
    try {
      const client = getConfiguredAmplifyClient();
      
      const result = await client.graphql({
        query: queries.listActionItems,
        variables: {
          limit: params.limit || 100,
          nextToken: params.nextToken
        }
      });

      const data = 'data' in result ? result.data : null;
      if (!data || !data.listActionItems) {
        throw new Error("No result returned from listActionItems");
      }

      return {
        content: [{ 
          type: "text" as const, 
          text: JSON.stringify({
            success: true,
            actionItems: data.listActionItems.items,
            nextToken: data.listActionItems.nextToken,
            count: data.listActionItems.items.length,
            message: `Retrieved ${data.listActionItems.items.length} action items`
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error("List Action Items Tool Error:", error);
      
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = JSON.stringify(error);
      }

      return {
        content: [{ 
          type: "text" as const, 
          text: JSON.stringify({
            success: false,
            error: "Failed to list action items",
            message: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

// Get Action Item Tool
const getActionItemTool = {
  name: 'get-action-item',
  config: {
    title: 'Get Action Item',
    description: 'Get detailed information about a specific action item by its ID.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the action item to retrieve')
    })
  },
  handler: async (params: any) => {
    try {
      const client = getConfiguredAmplifyClient();
      
      const result = await client.graphql({
        query: queries.getActionItem,
        variables: {
          id: params.id
        }
      });

      const data = 'data' in result ? result.data : null;
      if (!data || !data.getActionItem) {
        return {
          content: [{ 
            type: "text" as const, 
            text: JSON.stringify({
              success: false,
              error: "Action item not found",
              message: `No action item found with ID: ${params.id}`
            }, null, 2)
          }],
          isError: true
        };
      }

      return {
        content: [{ 
          type: "text" as const, 
          text: JSON.stringify({
            success: true,
            actionItem: data.getActionItem,
            message: `Retrieved action item: ${data.getActionItem.action}`
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error("Get Action Item Tool Error:", error);
      
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = JSON.stringify(error);
      }

      return {
        content: [{ 
          type: "text" as const, 
          text: JSON.stringify({
            success: false,
            error: "Failed to get action item",
            message: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

// List Workover Jobs Tool
const listWorkoverJobsTool = {
  name: 'list-workover-jobs',
  config: {
    title: 'List Workover Jobs',
    description: 'List all workover rig jobs with their status, priority, financial metrics, and scheduling information. Use this to get an overview of the workover job queue.',
    inputSchema: z.object({
      limit: z.number().optional().describe('Maximum number of workover jobs to return (default: 100)'),
      nextToken: z.string().optional().describe('Pagination token for next page of results')
    })
  },
  handler: async (params: any) => {
    try {
      const client = getConfiguredAmplifyClient();
      
      const result = await client.graphql({
        query: queries.listWorkoverJobs,
        variables: {
          limit: params.limit || 100,
          nextToken: params.nextToken
        }
      });

      const data = 'data' in result ? result.data : null;
      if (!data || !data.listWorkoverJobs) {
        throw new Error("No result returned from listWorkoverJobs");
      }

      return {
        content: [{ 
          type: "text" as const, 
          text: JSON.stringify({
            success: true,
            workoverJobs: data.listWorkoverJobs.items,
            nextToken: data.listWorkoverJobs.nextToken,
            count: data.listWorkoverJobs.items.length,
            message: `Retrieved ${data.listWorkoverJobs.items.length} workover jobs`
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error("List Workover Jobs Tool Error:", error);
      
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = JSON.stringify(error);
      }

      return {
        content: [{ 
          type: "text" as const, 
          text: JSON.stringify({
            success: false,
            error: "Failed to list workover jobs",
            message: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

// Get Workover Job Tool
const getWorkoverJobTool = {
  name: 'get-workover-job',
  config: {
    title: 'Get Workover Job',
    description: 'Get detailed information about a specific workover job by its ID, including financial metrics and scheduling details.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the workover job to retrieve')
    })
  },
  handler: async (params: any) => {
    try {
      const client = getConfiguredAmplifyClient();
      
      const result = await client.graphql({
        query: queries.getWorkoverJob,
        variables: {
          id: params.id
        }
      });

      const data = 'data' in result ? result.data : null;
      if (!data || !data.getWorkoverJob) {
        return {
          content: [{ 
            type: "text" as const, 
            text: JSON.stringify({
              success: false,
              error: "Workover job not found",
              message: `No workover job found with ID: ${params.id}`
            }, null, 2)
          }],
          isError: true
        };
      }

      return {
        content: [{ 
          type: "text" as const, 
          text: JSON.stringify({
            success: true,
            workoverJob: data.getWorkoverJob,
            message: `Retrieved workover job: ${data.getWorkoverJob.wellName} - ${data.getWorkoverJob.description}`
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error("Get Workover Job Tool Error:", error);
      
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = JSON.stringify(error);
      }

      return {
        content: [{ 
          type: "text" as const, 
          text: JSON.stringify({
            success: false,
            error: "Failed to get workover job",
            message: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

// Export all tools as an array for easy registration
export const allQueryTools = [
  sqlQueryTool,
  listActionItemsTool,
  getActionItemTool,
  listWorkoverJobsTool,
  getWorkoverJobTool,
];
