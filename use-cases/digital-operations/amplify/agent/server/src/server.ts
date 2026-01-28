import {
  stepCountIs,
  streamText,
  UIMessage,
  convertToModelMessages,
  createIdGenerator,
  NoSuchToolError,
  InvalidToolInputError,
} from 'ai'
import { getInitializedComponents } from './index'
import { setCurrentChatSessionId } from './context'

// Allow streaming responses up to 300 seconds
export const maxDuration = 300

// Handler function for Express
export async function handleAgentRequest(
  req: { body: { messages: UIMessage[]; modelId: string; chatSessionId?: string } },
  chatSessionId?: string
): Promise<Response> {
  try {
    let { messages, modelId } = req.body

    // Use chatSessionId from header if available, otherwise fall back to body
    const sessionId = chatSessionId || req.body.chatSessionId

    // Store the session ID for tool access
    setCurrentChatSessionId(sessionId)

    if (sessionId) {
      console.log(`Chat session ID: ${sessionId}`)
    }

    // Trim message history to last 10 messages to prevent payload size issues
    const MESSAGE_LIMIT = 10
    if (messages.length > MESSAGE_LIMIT) {
      const originalLength = messages.length
      messages = messages.slice(-MESSAGE_LIMIT)
      console.log(`Trimmed messages from ${originalLength} to ${messages.length} (keeping last ${MESSAGE_LIMIT})`)
    }

    console.log(`Calling model ${modelId} with ${messages.length} messages`)

    // Get pre-initialized components (credentials, tools, bedrock client, system prompt)
    const { bedrockClient, transformedTools, systemPrompt } = getInitializedComponents()

    // Create model instance using pre-initialized bedrock client
    const model = bedrockClient(modelId)

    // Use pre-transformed tools (no transformation needed per-request)
    const tools = transformedTools

    // Handle invalid tool calls gracefully by returning them to the agent
    // instead of showing errors to the user
    const repairToolCall = async ({ toolCall, error }: any) => {
      console.log(`Tool call repair triggered for: ${toolCall.toolName}`, error)

      // For NoSuchToolError (tool doesn't exist) or InvalidToolInputError,
      // return null to skip this tool call. The model will see it failed and can
      // try again with valid tools in the next step
      if (NoSuchToolError.isInstance(error)) {
        console.log(`Skipping non-existent tool: ${toolCall.toolName}`)
        return null
      }

      if (InvalidToolInputError.isInstance(error)) {
        console.log(`Skipping invalid tool input: ${toolCall.toolName}`, error.message)
        return null
      }

      // For other errors, return null to let the default behavior handle it
      return null
    }

    const result = streamText({
      model: model,
      messages: convertToModelMessages(messages),
      system: systemPrompt,
      tools: tools,
      stopWhen: stepCountIs(20), // Allow up to 20 steps
      experimental_repairToolCall: repairToolCall,
    })

    // send sources and reasoning back to the client with error handling
    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendSources: true,
      sendReasoning: true,
      generateMessageId: createIdGenerator({
        prefix: 'msg',
        size: 16,
      }),
      onError: (error) => {
        // Log the full error object for debugging
        console.error('Stream error:', error)

        // Extract detailed error information
        let errorMessage = 'An unknown error occurred'

        if (error && typeof error === 'object') {
          const apiError = error as {
            responseBody?: string | { Message?: string; message?: string }
            message?: string
          }

          // Try to extract the detailed message from responseBody first
          if (apiError.responseBody) {
            try {
              const responseBody =
                typeof apiError.responseBody === 'string' ? JSON.parse(apiError.responseBody) : apiError.responseBody

              // AWS errors use capital 'Message'
              if (responseBody.Message) {
                errorMessage = responseBody.Message
              } else if (responseBody.message) {
                errorMessage = responseBody.message
              } else if (apiError.message) {
                errorMessage = apiError.message
              }
            } catch {
              // If parsing fails, fall back to the error message
              errorMessage = apiError.message || errorMessage
            }
          } else if (apiError.message) {
            errorMessage = apiError.message
          }
        }

        return `Error: ${errorMessage}`
      },
    })
  } catch (error) {
    // Handle errors that occur before streaming starts (e.g., authentication, model initialization)
    console.error('Request error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(
      JSON.stringify({
        error: errorMessage,
        message: `Failed to initialize: ${errorMessage}`,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
