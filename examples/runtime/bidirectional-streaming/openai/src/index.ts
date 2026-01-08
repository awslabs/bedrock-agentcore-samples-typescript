import { BedrockAgentCoreApp, type RequestContext } from 'bedrock-agentcore/runtime'
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime'
import type { WebSocket } from 'ws'

const agent = new RealtimeAgent({
  name: 'assistant',
  instructions: 'You are a helpful assistant.',
})

const app = new BedrockAgentCoreApp({
  handler: async (_request, _context) => {
    return { message: 'Use WebSocket endpoint /ws for realtime audio' }
  },

  websocketHandler: async (socket: WebSocket, context: RequestContext) => {
    console.log(`WebSocket connected: ${context.sessionId}`)

    const session = new RealtimeSession(agent, { transport: 'websocket' })

    await session.connect({ apiKey: process.env['OPENAI_API_KEY'] })

    // Bridge: Client → OpenAI
    socket.on('message', async (data) => {
      const event = JSON.parse(data.toString())
      if (event.type === 'audio') {
        await session.sendAudio(Buffer.from(event.audio, 'base64'))
      }
    })

    // Bridge: OpenAI → Client
    session.on('audio', (audio) => {
      socket.send(
        JSON.stringify({
          type: 'audio',
          audio: audio.toString('base64'),
        })
      )
    })

    session.on('transcript', (transcript) => {
      socket.send(
        JSON.stringify({
          type: 'transcript',
          text: transcript,
        })
      )
    })

    socket.on('close', () => {
      console.log(`WebSocket closed: ${context.sessionId}`)
      session.close()
    })

    socket.on('error', (error) => {
      console.error(`WebSocket error: ${error.message}`)
    })
  },
})

app.run()
