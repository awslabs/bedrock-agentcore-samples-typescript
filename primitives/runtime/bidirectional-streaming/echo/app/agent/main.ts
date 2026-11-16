import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'

function parseMessage(text: string): unknown {
  try {
    return JSON.parse(text)
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

  websocketHandler: async (socket, context) => {
    context.log.info(`WebSocket connected: ${context.sessionId}`)

    socket.on('message', (data) => {
      const received = parseMessage(String(data))

      if (received === undefined) {
        socket.send(JSON.stringify({ type: 'error', error: 'Messages must be JSON' }))
        return
      }

      socket.send(
        JSON.stringify({ type: 'echo', sessionId: context.sessionId, received, timestamp: new Date().toISOString() })
      )
    })

    socket.on('close', () => {
      context.log.info(`WebSocket closed: ${context.sessionId}`)
    })
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
