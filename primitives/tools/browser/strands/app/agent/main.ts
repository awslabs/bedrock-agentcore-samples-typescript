import { Agent, BedrockModel } from '@strands-agents/sdk'
import { BrowserTools } from 'bedrock-agentcore/experimental/browser/strands'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const region = process.env['AWS_REGION'] ?? 'us-east-1'

const browser = new BrowserTools({ region })

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region }),
  tools: browser.tools,
  systemPrompt:
    'You are a web assistant with a cloud browser. Each request starts with a fresh browser, so navigate first. ' +
    'Never enter payment or other sensitive details; hand off to the user instead.',
  // The tools share one browser page, which starts on the first call
  toolExecutor: 'sequential',
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      try {
        for await (const event of agent.stream(request.prompt)) {
          if (event.type === 'beforeToolCallEvent') {
            yield { event: 'tool', data: { name: event.toolUse.name, input: event.toolUse.input } }
          }
          if (
            event.type === 'modelStreamUpdateEvent' &&
            event.event.type === 'modelContentBlockDeltaEvent' &&
            event.event.delta.type === 'textDelta'
          ) {
            yield { event: 'message', data: { text: event.event.delta.text } }
          }
        }
      } finally {
        // A browser session outlives the runtime session, so stop it rather than let it run until its timeout
        await browser.stopSession()
      }
    },
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
