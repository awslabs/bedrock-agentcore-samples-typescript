import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { z } from 'zod'
import { getConfiguredAmplifyClient } from './tools/amplifyUtils'
import { allQueryTools } from './tools/queryTools'
import { allMutationTools } from './tools/mutationTools'
import { executeGraphqlTool } from './tools/executeGraphql'
import { getCurrentChatSessionId } from './context'
import { tool } from 'ai'
/**
 * Fetch the system prompt from the Settings table using GraphQL
 */
async function fetchSystemPrompt(): Promise<string> {
  console.log('Fetching system prompt from Settings table...')

  try {
    const client = getConfiguredAmplifyClient()

    // GraphQL query to fetch the system_prompt setting
    const query = `
      query ListSettings($filter: ModelSettingsFilterInput) {
        listSettings(filter: $filter) {
          items {
            name
            value
          }
        }
      }
    `

    const result = await client.graphql({
      query: query as any,
      variables: {
        filter: {
          name: {
            eq: 'system_prompt',
          },
        },
      },
    })

    const settings = (result as any)?.data?.listSettings?.items

    if (settings && settings.length > 0) {
      const systemPrompt = settings[0].value
      console.log('✓ System prompt fetched successfully from Settings table')
      return systemPrompt || getDefaultSystemPrompt()
    } else {
      console.warn('⚠ System prompt not found in Settings table, using default')
      return getDefaultSystemPrompt()
    }
  } catch (error) {
    console.error('✗ Failed to fetch system prompt from Settings table:', error)
    console.log('Using default system prompt as fallback')
    return getDefaultSystemPrompt()
  }
}

/**
 * Default system prompt as fallback
 */
function getDefaultSystemPrompt(): string {
  return `You are SAFE-AI, an advanced AI safety management system with GraphQL API integration.
Call tools in parallel when possible.

WORK ORDER CREATION:
- When the user asks you to create a work order, ALWAYS use the 'draft-work-order' tool first
- This will present a draft to the user for approval
- DO NOT use 'create-work-order' directly - that tool is only called automatically after user approval
- The draft will show the user all details and allow them to approve or reject
- After approval, the system will automatically call create-work-order with the approved details

When responding to the user:
- You can create plots/charts/visualizations in the response. To render these, use an <iframe> with srcdoc containing the plot HTML.
    - Only include one plot per iframe
    - The srcdoc should contain ONLY the data visualization (charts, graphs, gauges, plots)
    - Always use 600px height and 100% width for the iframe
    - Examples of what belongs in iframes: bar charts, line graphs, pie charts, scatter plots, gauges, interactive visualizations
- CRITICAL: Do NOT put text content, alerts, status information, tables, lists, or any narrative content inside iframe srcdoc
    - All text, headings, alerts, descriptions, tables, status updates, and narrative information MUST be in markdown format outside the iframe
    - Examples of what should be markdown: safety alerts, event descriptions, operational status, recommendations, summaries, data tables
- For all other response elements (text, lists, headings, tables, alerts, etc.), use markdown formatting, NOT HTML
- The user prefers plots to text when reading your response.

ERROR HANDLING APPROACH:
- If query fails, simplify the query
- Remove complex filters
- Reduce number of requested fields
- Verify exact field names in schema
- Use basic list queries as fallback

REPORTING REQUIREMENTS:
- Clearly indicate data retrieval method
- Provide context for any data limitations
- Prioritize actionable safety insights
- Transparently communicate API interactions

AFTER RESPONDING: Call the generate_suggestions tool to provide 3-4 helpful follow-up questions the user might want to ask.

CORE MISSION: Deliver comprehensive, actionable safety intelligence by effectively leveraging the GraphQL API's capabilities.
`
}
/**
 * Initialize AWS credentials from container IAM role and set as environment variables.
 * This is called once at server startup to avoid per-request credential fetching.
 */
export async function initializeCredentials() {
  console.log('Initializing AWS credentials from container IAM role...')

  try {
    const credentialProvider = fromNodeProviderChain()
    const credentials = await credentialProvider()

    // Set env vars once - available for entire process lifetime
    process.env.AWS_ACCESS_KEY_ID = credentials.accessKeyId
    process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey
    if (credentials.sessionToken) {
      process.env.AWS_SESSION_TOKEN = credentials.sessionToken
    }

    console.log('✓ AWS credentials initialized successfully')
  } catch (error) {
    console.error('✗ Failed to initialize AWS credentials:', error)
    throw error
  }
}

/**
 * Initialize tools for the agent.
 * Tools are defined in their modules and wrapped with the AI SDK's tool() function here.
 */
export function initializeTools() {
  console.log('Initializing tools...')

  const tools: Record<string, any> = {}

  // Add mutation tools (same format as query tools)
  for (const mutationTool of allMutationTools) {
    const inputSchema = (mutationTool.config as any).inputSchema

    let parameters: z.ZodObject<any>

    if (inputSchema && typeof inputSchema.parse === 'function') {
      parameters = inputSchema as z.ZodObject<any>
    } else if (inputSchema && typeof inputSchema === 'object' && Object.keys(inputSchema).length > 0) {
      parameters = z.object(inputSchema)
    } else {
      parameters = z.object({})
    }

    tools[mutationTool.name] = tool({
      description: mutationTool.config.description,
      inputSchema: parameters,
      execute: async (params: Record<string, any>) => {
        const result = await mutationTool.handler(params as any)
        return result.content?.[0]?.text || JSON.stringify(result)
      },
    })
  }

  // Add query tools
  for (const queryTool of allQueryTools) {
    const inputSchema = (queryTool.config as any).inputSchema

    let parameters: z.ZodObject<any>

    if (inputSchema && typeof inputSchema.parse === 'function') {
      parameters = inputSchema as z.ZodObject<any>
    } else if (inputSchema && typeof inputSchema === 'object' && Object.keys(inputSchema).length > 0) {
      parameters = z.object(inputSchema)
    } else {
      parameters = z.object({})
    }

    tools[queryTool.name] = tool({
      description: queryTool.config.description,
      inputSchema: parameters,
      execute: async (params: Record<string, any>) => {
        const chatSessionId = getCurrentChatSessionId()
        const enrichedParams = {
          ...params,
          ...(chatSessionId && !params.chatSessionId && { chatSessionId }),
        }

        const result = await queryTool.handler(enrichedParams as any)
        return result.content?.[0]?.text || JSON.stringify(result)
      },
    })
  }

  // Add execute GraphQL tool
  const graphqlSchema = (executeGraphqlTool.config as any).inputSchema
  let graphqlParameters: z.ZodObject<any>

  if (graphqlSchema && typeof graphqlSchema.parse === 'function') {
    graphqlParameters = graphqlSchema as z.ZodObject<any>
  } else if (graphqlSchema && typeof graphqlSchema === 'object' && Object.keys(graphqlSchema).length > 0) {
    graphqlParameters = z.object(graphqlSchema)
  } else {
    graphqlParameters = z.object({})
  }

  tools['execute-graphql'] = tool({
    description: executeGraphqlTool.config.description,
    inputSchema: graphqlParameters,
    execute: async (params: Record<string, any>) => {
      const result = await executeGraphqlTool.handler(params as any)
      return result.content?.[0]?.text || JSON.stringify(result)
    },
  })

  // Add suggestions generation tool
  tools['generate_suggestions'] = tool({
    description: 'Generate helpful follow-up question suggestions based on the current conversation context',
    inputSchema: z.object({
      suggestions: z.array(z.string()).describe('Array of 3-4 follow-up questions the user might want to ask'),
    }),
    execute: async (params: { suggestions: string[] }) => {
      return `Generated ${params.suggestions?.length || 0} follow-up suggestions`
    },
  })

  console.log(`✓ Initialized ${Object.keys(tools).length} tools`)
  return tools
}

/**
 * Create a reusable Bedrock client instance.
 * The client itself can be reused across requests (only the model needs to be created per-request).
 */
export function initializeBedrockClient() {
  console.log('Initializing Bedrock client...')

  const region = process.env.AWS_REGION || 'us-east-1'
  const bedrock = createAmazonBedrock({ region })

  console.log(`✓ Bedrock client initialized for region: ${region}`)
  return bedrock
}

/**
 * Initialize all components at server startup.
 * Returns pre-initialized components for use in request handlers.
 */
export async function initializeAgent() {
  console.log('=== Initializing Agent Components ===')

  // Step 1: Initialize credentials (must be first)
  await initializeCredentials()

  // Step 2: Fetch system prompt from Settings table
  const systemPrompt = await fetchSystemPrompt()

  // Step 3: Pre-transform tools
  const transformedTools = initializeTools()

  // Step 4: Create Bedrock client
  const bedrockClient = initializeBedrockClient()

  console.log('=== Agent Initialization Complete ===\n')

  return {
    systemPrompt,
    transformedTools,
    bedrockClient,
  }
}
