import { setTimeout } from 'node:timers/promises'
import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const startBackgroundTask = tool({
  name: 'startBackgroundTask',
  description: 'Start a background task that runs for the given number of seconds',
  inputSchema: z.object({
    duration: z.number().int().min(1).max(3600).default(5).describe('Duration in seconds for the background task'),
  }),
  callback: ({ duration }): string => {
    // asyncTask marks the work as running until it settles, so /ping reports HealthyBusy and AgentCore keeps the session
    const backgroundTask = app.asyncTask(async (): Promise<void> => {
      try {
        await setTimeout(duration * 1000)
      } catch (error) {
        console.error('Background task failed:', error)
      }
    })
    void backgroundTask()

    return `Started a background task for ${duration} seconds. The agent reports HealthyBusy until it finishes.`
  },
})

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.anthropic.claude-haiku-5-5',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
    maxTokens: 8192,
  }),
  tools: [startBackgroundTask],
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      for await (const event of agent.stream(request.prompt)) {
        if (
          event.type === 'modelStreamUpdateEvent' &&
          event.event.type === 'modelContentBlockDeltaEvent' &&
          event.event.delta.type === 'textDelta'
        ) {
          yield { event: 'message', data: { text: event.event.delta.text } }
        }
      }
    },
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
