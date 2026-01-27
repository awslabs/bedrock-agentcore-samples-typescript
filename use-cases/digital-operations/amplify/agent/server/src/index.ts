import express, { Request, Response } from 'express'
import { handleAgentRequest } from './server'
import { initializeAgent } from './init'

const PORT = 8080
const app = express()

// Store initialized components
let initializedComponents: Awaited<ReturnType<typeof initializeAgent>> | null = null

// Increase body size limit to 10mb to handle larger conversations
app.use(express.json({ limit: '10mb' }))

// Error handling middleware for payload size errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.too.large') {
    console.error('PayloadTooLargeError:', {
      url: req.url,
      method: req.method,
      contentLength: req.headers['content-length'],
      limit: '10mb',
    })

    return res.status(413).json({
      error: 'Payload too large',
      message: 'Request payload exceeds the 10mb limit. Please reduce conversation history or message size.',
      details: {
        contentLength: req.headers['content-length'],
        limit: '10mb',
      },
    })
  }
  next(err)
})

// CORS middleware for browser access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Amzn-Bedrock-AgentCore-Runtime-Custom-Chat-Session-Id'
  )

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// Root path handler
app.all('/', async (req: Request, res: Response) => {
  console.log('Root path invoked')
  res.status(405).json({
    error: 'Method not allowed',
    message: 'Please use the /invocations endpoint',
  })
})

// Main agent invocation endpoint for AgentCore Runtime
app.post('/invocations', async (req: Request, res: Response) => {
  console.log('Agent invocation request received')

  // Log payload size information for debugging
  const contentLength = req.headers['content-length']
  const messageCount = req.body?.messages?.length || 0
  const chatSessionId = req.headers['x-amzn-bedrock-agentcore-runtime-custom-chat-session-id'] as string | undefined

  console.log('Request details:', {
    contentLength: contentLength ? `${contentLength} bytes` : 'unknown',
    messageCount: messageCount,
    modelId: req.body?.modelId,
    chatSessionId: chatSessionId || 'not provided',
  })

  try {
    // The agent handler returns a streaming response
    const response = await handleAgentRequest(req, chatSessionId)

    // Copy status and headers from the agent response
    res.status(response.status)

    // Ensure the critical x-vercel-ai-ui-message-stream header is set
    // This tells the client to expect the UI message stream protocol (v1)
    res.setHeader('x-vercel-ai-ui-message-stream', 'v1')

    response.headers.forEach((value: string, key: string) => {
      // Don't override the x-vercel-ai-ui-message-stream header if we already set it
      if (key.toLowerCase() !== 'x-vercel-ai-ui-message-stream') {
        res.setHeader(key, value)
      }
    })

    // Pipe the streaming response to the client with proper backpressure handling
    if (response.body) {
      const reader = response.body.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            res.end()
            break
          }

          // Handle backpressure - wait if Express response buffer is full
          // This ensures the AI SDK 5 SSE format is preserved byte-for-byte
          if (!res.write(value)) {
            await new Promise((resolve) => res.once('drain', resolve))
          }
        }
      } catch (error) {
        console.error('Streaming error:', error)
        if (!res.headersSent) {
          res.status(500).end()
        }
      }
    } else {
      res.status(500).json({ error: 'No response body' })
    }
  } catch (error) {
    console.error('Request error:', error)
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
})

// Reject GET requests to /invocations
app.get('/invocations', async (req: Request, res: Response) => {
  console.log('Received GET request to /invocations')
  res.status(405).json({
    error: 'Method not allowed',
    message: 'Only POST requests are accepted',
  })
})

// Health check endpoint for AWS Bedrock AgentCore Runtime monitoring
app.get('/health', (req: Request, res: Response) => {
  console.log('Health check request received')
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AgentCore GenAI Agent',
    port: PORT,
  })
})

// Initialize agent components before starting server
;(async () => {
  try {
    initializedComponents = await initializeAgent()

    // Start server after initialization
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`AgentCore GenAI Agent running on port ${PORT}`)
      console.log('Endpoints:')
      console.log('  POST /invocations - Main agent endpoint')
      console.log('  GET  /health - Health check')
    })
  } catch (error) {
    console.error('Failed to initialize agent:', error)
    process.exit(1)
  }
})()

// Export initialized components for use in request handlers
export function getInitializedComponents() {
  if (!initializedComponents) {
    throw new Error('Agent components not initialized. Server may still be starting up.')
  }
  return initializedComponents
}
