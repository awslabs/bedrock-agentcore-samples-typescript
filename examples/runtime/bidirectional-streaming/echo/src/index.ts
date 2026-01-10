import { BedrockAgentCoreApp, type RequestContext } from 'bedrock-agentcore/runtime'
import type { WebSocket } from 'ws'

const app = new BedrockAgentCoreApp({
  // HTTP handler (required)
  invocationHandler: {
    process: async (_request, _context) => {
      return { message: 'Use WebSocket endpoint /ws for bidirectional streaming' }
    },
  },

  // WebSocket handler for bidirectional streaming
  websocketHandler: async (socket: WebSocket, context: RequestContext) => {
    console.log(`WebSocket connected: ${context.sessionId}`)

    // Send welcome message
    socket.send(
      JSON.stringify({
        type: 'connected',
        sessionId: context.sessionId,
      })
    )

    // Echo messages back with timestamp
    socket.on('message', (data) => {
      const message = JSON.parse(data.toString())
      socket.send(
        JSON.stringify({
          type: 'echo',
          received: message,
          timestamp: new Date().toISOString(),
        })
      )
    })

    socket.on('close', () => {
      console.log(`WebSocket closed: ${context.sessionId}`)
    })

    socket.on('error', (error) => {
      console.error(`WebSocket error: ${error.message}`)
    })
  },
})

app.run()
