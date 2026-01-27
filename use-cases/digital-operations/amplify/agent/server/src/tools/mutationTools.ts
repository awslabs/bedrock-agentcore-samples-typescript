import { z } from 'zod'
import { getConfiguredAmplifyClient } from './amplifyUtils'
import { getCurrentChatSessionId } from '../context'

// GraphQL mutation strings for map layers
const mutations = {
  createMapLayer: /* GraphQL */ `
    mutation CreateMapLayer($input: CreateMapLayerInput!) {
      createMapLayer(input: $input) {
        id
        chatSessionId
        name
        type
        visible
        athenaQuery
        athenaDatabase
        geoJsonMapping
        queryRefreshInterval
        lastQueryExecutedAt
        queryError
        style
        order
        description
        source
        createdAt
        updatedAt
      }
    }
  `,
  updateMapLayer: /* GraphQL */ `
    mutation UpdateMapLayer($input: UpdateMapLayerInput!) {
      updateMapLayer(input: $input) {
        id
        chatSessionId
        name
        type
        visible
        athenaQuery
        athenaDatabase
        geoJsonMapping
        queryRefreshInterval
        lastQueryExecutedAt
        queryError
        style
        order
        description
        source
        updatedAt
      }
    }
  `,
  deleteMapLayer: /* GraphQL */ `
    mutation DeleteMapLayer($input: DeleteMapLayerInput!) {
      deleteMapLayer(input: $input) {
        id
      }
    }
  `,
  updateActionItem: /* GraphQL */ `
    mutation UpdateActionItem($input: UpdateActionItemInput!) {
      updateActionItem(input: $input) {
        id
        alertId
        type
        action
        description
        expectedValue
        risk
        status
        source
        updatedAt
      }
    }
  `,
  updateWorkoverJob: /* GraphQL */ `
    mutation UpdateWorkoverJob($input: UpdateWorkoverJobInput!) {
      updateWorkoverJob(input: $input) {
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
        updatedAt
      }
    }
  `,
}

const queries = {
  listMapLayers: /* GraphQL */ `
    query ListMapLayersByChatSession($chatSessionId: ID!, $limit: Int, $nextToken: String) {
      listMapLayers(filter: { chatSessionId: { eq: $chatSessionId } }, limit: $limit, nextToken: $nextToken) {
        items {
          id
          chatSessionId
          name
          type
          visible
          athenaQuery
          athenaDatabase
          geoJsonMapping
          queryRefreshInterval
          lastQueryExecutedAt
          queryError
          style
          order
          description
          source
          createdAt
          updatedAt
        }
        nextToken
      }
    }
  `,
}

// Create Map Layer Tool
const createMapLayerTool = {
  name: 'create-map-layer',
  config: {
    title: 'Create Map Layer',
    description:
      'Create a new query-based map layer for the current chat session. The layer executes an Athena SQL query to generate GeoJSON data dynamically. The query will be validated before creating the layer. The chat session ID is automatically provided.',
    inputSchema: z.object({
      name: z.string().describe('Display name for the layer (e.g., "High Production Wells", "Pipeline Network")'),
      type: z
        .enum(['point', 'line', 'polygon', 'heatmap', 'geojson'])
        .describe(
          'Type of geometry: point (markers), line (pipelines), polygon (boundaries), heatmap (density), or geojson (mixed)'
        ),
      athenaQuery: z
        .string()
        .describe(
          'SQL query to generate GeoJSON data from Athena. Example: "SELECT id, name, latitude, longitude FROM wells WHERE status = \'Active\'"'
        ),
      athenaDatabase: z.string().describe('Athena database name for the query. Example: "upstream"'),
      geoJsonMapping: z
        .object({
          geometryType: z.enum(['Point', 'LineString', 'Polygon']).describe('Geometry type for query results'),
          longitudeField: z.string().optional().describe('Column name for longitude (required for Point geometry)'),
          latitudeField: z.string().optional().describe('Column name for latitude (required for Point geometry)'),
          coordinatesField: z
            .string()
            .optional()
            .describe('Column name containing coordinate array (required for LineString/Polygon)'),
          propertyFields: z
            .array(z.string())
            .optional()
            .describe(
              'Column names to include as feature properties. If omitted, all columns except coordinate fields are included.'
            ),
        })
        .describe('Mapping configuration for converting query results to GeoJSON'),
      queryRefreshInterval: z
        .number()
        .optional()
        .describe('Minutes between automatic query refresh (0 = manual only). Default: 0'),
      style: z
        .object({
          color: z.string().optional().describe('Static color for all features (e.g., "#ff0000", "red")'),
          opacity: z.number().optional().describe('Opacity (0-1)'),
          radius: z.number().optional().describe('Point radius or heatmap radius'),
          width: z.number().optional().describe('Line width'),
          strokeColor: z.string().optional().describe('Stroke/border color'),
          strokeWidth: z.number().optional().describe('Stroke/border width'),
          intensity: z.number().optional().describe('Heatmap intensity'),
          colorScale: z
            .object({
              type: z
                .enum(['linear', 'categorical', 'step'])
                .describe('Type of color scale: linear (gradient), categorical (discrete categories), step (ranges)'),
              property: z.string().describe('Property name from query results to use for coloring'),
              stops: z
                .array(z.tuple([z.union([z.number(), z.string()]), z.string()]))
                .optional()
                .describe(
                  'Array of [value, color] pairs for linear/step scales. Example: [[0, "#blue"], [50, "#yellow"], [100, "#red"]]'
                ),
              categories: z
                .record(z.string())
                .optional()
                .describe(
                  'Object mapping category values to colors. Example: {"Active": "#green", "Inactive": "#red"}'
                ),
              defaultColor: z.string().optional().describe('Fallback color for values not in scale'),
            })
            .optional()
            .describe('Data-driven color scale configuration'),
          radiusScale: z
            .object({
              property: z.string().describe('Property name to use for sizing'),
              min: z.number().describe('Minimum data value'),
              max: z.number().describe('Maximum data value'),
              minRadius: z.number().describe('Radius for minimum value'),
              maxRadius: z.number().describe('Radius for maximum value'),
            })
            .optional()
            .describe('Data-driven radius scale for points'),
          tooltip: z
            .object({
              title: z.string().optional().describe('Property name to use as tooltip title (defaults to "name")'),
              fields: z
                .array(
                  z.object({
                    property: z.string().describe('Property name from query results'),
                    label: z.string().describe('Display label for this field'),
                    format: z
                      .enum(['number', 'decimal', 'currency', 'date', 'text'])
                      .optional()
                      .describe('Format type'),
                    decimals: z.number().optional().describe('Number of decimal places (for number/decimal/currency)'),
                    unit: z.string().optional().describe('Unit to append (e.g., "MCF/D", "PSI", "%")'),
                  })
                )
                .optional()
                .describe('Fields to display in tooltip'),
            })
            .optional()
            .describe('Tooltip configuration'),
        })
        .optional()
        .describe('Style configuration with optional data-driven styling'),
      order: z.number().optional().describe('Layer z-index order (higher numbers render on top). Default: 0'),
      description: z.string().optional().describe('Optional description of what this layer represents'),
      source: z
        .string()
        .optional()
        .describe('Data source identifier (e.g., "athena-query", "user-input", "ai-analysis")'),
    }),
  },
  handler: async (params: any) => {
    try {
      const amplifyClient = getConfiguredAmplifyClient()

      // Get chatSessionId from request context
      const chatSessionId = getCurrentChatSessionId()
      if (!chatSessionId) {
        throw new Error('chatSessionId is required but was not provided')
      }

      // Validate required fields
      if (!params.athenaQuery) {
        throw new Error('athenaQuery is required')
      }

      if (!params.athenaDatabase) {
        throw new Error('athenaDatabase is required')
      }

      if (!params.geoJsonMapping) {
        throw new Error('geoJsonMapping is required')
      }

      // Execute the query to validate it
      console.log('Validating query for map layer:', params.name)
      const queryResult = await amplifyClient.graphql({
        query: /* GraphQL */ `
          mutation ExecuteMapLayerQuery($queryString: String!, $database: String!, $geoJsonMapping: AWSJSON!) {
            executeMapLayerQuery(queryString: $queryString, database: $database, geoJsonMapping: $geoJsonMapping) {
              success
              geoJsonData
              error
              rowCount
            }
          }
        `,
        variables: {
          queryString: params.athenaQuery,
          database: params.athenaDatabase,
          geoJsonMapping: JSON.stringify(params.geoJsonMapping),
        },
      })

      const queryData = 'data' in queryResult ? queryResult.data : null
      if (!queryData || !queryData.executeMapLayerQuery.success) {
        const errorMsg = queryData?.executeMapLayerQuery.error || 'Query validation failed'
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'Query validation failed',
                  message: errorMsg,
                  query: params.athenaQuery,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        }
      }

      console.log(`Query validated successfully: ${queryData.executeMapLayerQuery.rowCount} features generated`)

      const input = {
        chatSessionId,
        name: params.name,
        type: params.type,
        visible: true,
        athenaQuery: params.athenaQuery,
        athenaDatabase: params.athenaDatabase,
        geoJsonMapping: JSON.stringify(params.geoJsonMapping),
        queryRefreshInterval: params.queryRefreshInterval || 0,
        style: params.style ? JSON.stringify(params.style) : null,
        order: params.order || 0,
        description: params.description || null,
        source: params.source || 'ai-created',
      }

      const result = await amplifyClient.graphql({
        query: mutations.createMapLayer,
        variables: { input },
      })

      const data = 'data' in result ? result.data : null
      if (!data) {
        throw new Error('No data returned from GraphQL mutation')
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                layer: data.createMapLayer,
                message: `Created query-based map layer "${params.name}" with query: ${params.athenaQuery.substring(0, 100)}... The query will be executed automatically by the frontend.`,
              },
              null,
              2
            ),
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
                success: false,
                error: 'Failed to create map layer',
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
}

// Update Map Layer Tool
const updateMapLayerTool = {
  name: 'update-map-layer',
  config: {
    title: 'Update Map Layer',
    description:
      'Update an existing map layer. Use this to modify layer query, style, visibility, or other properties.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the map layer to update'),
      name: z.string().optional().describe('New display name for the layer'),
      type: z.enum(['point', 'line', 'polygon', 'heatmap', 'geojson']).optional().describe('New geometry type'),
      visible: z.boolean().optional().describe('Whether the layer should be visible'),
      athenaQuery: z.string().optional().describe('Updated SQL query'),
      athenaDatabase: z.string().optional().describe('Updated database name'),
      geoJsonMapping: z
        .object({
          geometryType: z.enum(['Point', 'LineString', 'Polygon']),
          longitudeField: z.string().optional(),
          latitudeField: z.string().optional(),
          coordinatesField: z.string().optional(),
          propertyFields: z.array(z.string()).optional(),
        })
        .optional()
        .describe('Updated GeoJSON mapping configuration'),
      queryRefreshInterval: z.number().optional().describe('Updated refresh interval in minutes'),
      style: z
        .object({
          color: z.string().optional(),
          opacity: z.number().optional(),
          radius: z.number().optional(),
          width: z.number().optional(),
          strokeColor: z.string().optional(),
          strokeWidth: z.number().optional(),
          intensity: z.number().optional(),
          colorScale: z
            .object({
              type: z.enum(['linear', 'categorical', 'step']),
              property: z.string(),
              stops: z.array(z.tuple([z.union([z.number(), z.string()]), z.string()])).optional(),
              categories: z.record(z.string()).optional(),
              defaultColor: z.string().optional(),
            })
            .optional(),
          radiusScale: z
            .object({
              property: z.string(),
              min: z.number(),
              max: z.number(),
              minRadius: z.number(),
              maxRadius: z.number(),
            })
            .optional(),
        })
        .optional()
        .describe('Updated style configuration with optional data-driven styling'),
      tooltip: z
        .object({
          title: z.string().optional().describe('Property name to use as tooltip title (defaults to "name")'),
          fields: z
            .array(
              z.object({
                property: z.string().describe('Property name from query results'),
                label: z.string().describe('Display label for this field'),
                format: z.enum(['number', 'decimal', 'currency', 'date', 'text']).optional().describe('Format type'),
                decimals: z.number().optional().describe('Number of decimal places (for number/decimal/currency)'),
                unit: z.string().optional().describe('Unit to append (e.g., "MCF/D", "PSI", "%")'),
              })
            )
            .optional()
            .describe('Fields to display in tooltip'),
        })
        .optional()
        .describe('Tooltip configuration'),
      order: z.number().optional().describe('Updated z-index order'),
      description: z.string().optional().describe('Updated description'),
    }),
  },
  handler: async (params: any) => {
    try {
      const amplifyClient = getConfiguredAmplifyClient()

      // Build input object with only provided fields
      const input: any = { id: params.id }
      if (params.name !== undefined) input.name = params.name
      if (params.type !== undefined) input.type = params.type
      if (params.visible !== undefined) input.visible = params.visible
      if (params.athenaQuery !== undefined) input.athenaQuery = params.athenaQuery
      if (params.athenaDatabase !== undefined) input.athenaDatabase = params.athenaDatabase
      if (params.geoJsonMapping !== undefined) input.geoJsonMapping = JSON.stringify(params.geoJsonMapping)
      if (params.queryRefreshInterval !== undefined) input.queryRefreshInterval = params.queryRefreshInterval
      if (params.style !== undefined) input.style = JSON.stringify(params.style)
      if (params.order !== undefined) input.order = params.order
      if (params.description !== undefined) input.description = params.description

      const result = await amplifyClient.graphql({
        query: mutations.updateMapLayer,
        variables: { input },
      })

      const data = 'data' in result ? result.data : null
      if (!data) {
        throw new Error('No data returned from GraphQL mutation')
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                layer: data.updateMapLayer,
                message: `Updated map layer ${params.id}`,
              },
              null,
              2
            ),
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
                success: false,
                error: 'Failed to update map layer',
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
}

// Delete Map Layer Tool
const deleteMapLayerTool = {
  name: 'delete-map-layer',
  config: {
    title: 'Delete Map Layer',
    description: 'Delete a map layer from the chat session.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the map layer to delete'),
    }),
  },
  handler: async (params: any) => {
    try {
      const amplifyClient = getConfiguredAmplifyClient()

      const result = await amplifyClient.graphql({
        query: mutations.deleteMapLayer,
        variables: { input: { id: params.id } },
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                message: `Deleted map layer ${params.id}`,
              },
              null,
              2
            ),
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
                success: false,
                error: 'Failed to delete map layer',
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
}

// List Map Layers Tool
const listMapLayersTool = {
  name: 'list-map-layers',
  config: {
    title: 'List Map Layers',
    description: 'List all map layers for the current chat session. The chat session ID is automatically provided.',
    inputSchema: z.object({
      limit: z.number().optional().describe('Maximum number of layers to return'),
      nextToken: z.string().optional().describe('Pagination token for next page'),
    }),
  },
  handler: async (params: any) => {
    try {
      const amplifyClient = getConfiguredAmplifyClient()

      // Get chatSessionId from request context
      const chatSessionId = getCurrentChatSessionId()
      if (!chatSessionId) {
        throw new Error('chatSessionId is required but was not provided')
      }

      const result = await amplifyClient.graphql({
        query: queries.listMapLayers,
        variables: {
          chatSessionId,
          limit: params.limit,
          nextToken: params.nextToken,
        },
      })

      const data = 'data' in result ? result.data : null
      if (!data) {
        throw new Error('No data returned from GraphQL query')
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                layers: data.listMapLayers.items,
                nextToken: data.listMapLayers.nextToken,
                count: data.listMapLayers.items.length,
              },
              null,
              2
            ),
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
                success: false,
                error: 'Failed to list map layers',
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
}

// Update Action Item Status Tool
const updateActionItemTool = {
  name: 'update-action-item-status',
  config: {
    title: 'Update Action Item Status',
    description:
      'Update the status of an action item (approve, reject, or defer). Use this when the user makes decisions about pending actions.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the action item to update'),
      status: z.enum(['pending', 'approved', 'rejected', 'deferred']).describe('New status for the action item'),
    }),
  },
  handler: async (params: any) => {
    try {
      const amplifyClient = getConfiguredAmplifyClient()

      const input = {
        id: params.id,
        status: params.status,
      }

      const result = await amplifyClient.graphql({
        query: mutations.updateActionItem,
        variables: { input },
      })

      const data = 'data' in result ? result.data : null
      if (!data) {
        throw new Error('No data returned from GraphQL mutation')
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                actionItem: data.updateActionItem,
                message: `Updated action item status to "${params.status}": ${data.updateActionItem.action}`,
              },
              null,
              2
            ),
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
                success: false,
                error: 'Failed to update action item status',
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
}

// Update Workover Job Tool
const updateWorkoverJobTool = {
  name: 'update-workover-job',
  config: {
    title: 'Update Workover Job',
    description: 'Update workover job details such as status, priority, scheduling, or rig assignment.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the workover job to update'),
      status: z
        .enum(['queued', 'inProgress', 'completed', 'delayed'])
        .optional()
        .describe('New status for the workover job'),
      priority: z.enum(['high', 'medium', 'low']).optional().describe('New priority level'),
      scheduledDate: z.string().optional().describe('New scheduled date (YYYY-MM-DD format)'),
      rigAssigned: z.string().optional().describe('Rig assignment for the job'),
      estimatedDuration: z.string().optional().describe('Updated estimated duration'),
      description: z.string().optional().describe('Updated job description'),
    }),
  },
  handler: async (params: any) => {
    try {
      const amplifyClient = getConfiguredAmplifyClient()

      // Build input object with only provided fields
      const input: any = { id: params.id }
      if (params.status !== undefined) input.status = params.status
      if (params.priority !== undefined) input.priority = params.priority
      if (params.scheduledDate !== undefined) input.scheduledDate = params.scheduledDate
      if (params.rigAssigned !== undefined) input.rigAssigned = params.rigAssigned
      if (params.estimatedDuration !== undefined) input.estimatedDuration = params.estimatedDuration
      if (params.description !== undefined) input.description = params.description

      const result = await amplifyClient.graphql({
        query: mutations.updateWorkoverJob,
        variables: { input },
      })

      const data = 'data' in result ? result.data : null
      if (!data) {
        throw new Error('No data returned from GraphQL mutation')
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                workoverJob: data.updateWorkoverJob,
                message: `Updated workover job: ${data.updateWorkoverJob.wellName} - ${data.updateWorkoverJob.description}`,
              },
              null,
              2
            ),
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
                success: false,
                error: 'Failed to update workover job',
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
}

export const allMutationTools = [
  createMapLayerTool,
  updateMapLayerTool,
  deleteMapLayerTool,
  listMapLayersTool,
  updateActionItemTool,
  updateWorkoverJobTool,
]
