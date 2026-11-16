import { BedrockAgentCoreApp, type RequestContext } from 'bedrock-agentcore/runtime'
import type { WebSocket } from 'ws'

function parseMessage(data: WebSocket.RawData): unknown {
  try {
    return JSON.parse(data.toString())
  } catch {
    return undefined
  }
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async (): Promise<{ message: string }> => {
      return { message: 'Use the WebSocket endpoint /ws for bidirectional streaming' }
    },
  },

  websocketHandler: async (socket: WebSocket, context: RequestContext): Promise<void> => {
    console.log(`WebSocket connected: ${context.sessionId}`)

    socket.on('message', (data) => {
      const received = parseMessage(data)

      if (received === undefined) {
        socket.send(JSON.stringify({ type: 'error', message: 'Messages must be JSON' }))
        return
      }

      socket.send(
        JSON.stringify({ type: 'echo', sessionId: context.sessionId, received, timestamp: new Date().toISOString() })
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

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
