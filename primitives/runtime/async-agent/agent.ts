import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const startBackgroundTask = tool({
  name: 'start_background_task',
  description: 'Start a simple background task that runs for specified duration',
  inputSchema: z.object({
    duration: z.number().default(5).describe('Duration in seconds for the background task'),
  }),
  callback: async (input: { duration: number }): Promise<string> => {
    const duration = input.duration
    const taskId = app.addAsyncTask('background_processing', { duration })

    setTimeout(() => {
      app.completeAsyncTask(taskId)
    }, duration * 1000)

    return `Started background task (ID: ${taskId}) for ${duration} seconds. Agent status is now BUSY.`
  },
})

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  tools: [startBackgroundTask],
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, _context) {
      for await (const event of agent.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }
    },
  },
})

app.run()
