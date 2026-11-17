import { ToolLoopAgent, type ModelMessage } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { BrowserTools } from 'bedrock-agentcore/browser/vercel-ai'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const region = process.env['AWS_REGION'] ?? 'us-east-1'
const bedrock = createAmazonBedrock({ region, credentialProvider: fromNodeProviderChain() })

const browser = new BrowserTools({ region })

const agent = new ToolLoopAgent({
  model: bedrock('global.anthropic.claude-haiku-5-5'),
  instructions:
    'You are a web assistant with a cloud browser. Each request starts with a fresh browser, so navigate first. ' +
    'Never enter payment or other sensitive details; hand off to the user instead.',
  tools: browser.tools,
  // The tools share one browser session, so they run one at a time
  toolCallConcurrency: 1,
})

const messages: ModelMessage[] = []

// The agent and its browser serve one request at a time; an overlapping request must not stop the browser in use
let busy = false

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      if (busy) {
        yield { event: 'error', data: { error: 'The agent is still answering another request' } }
        return
      }
      busy = true
      const userMessage: ModelMessage = { role: 'user', content: request.prompt }
      try {
        const stream = await agent.stream({ messages: [...messages, userMessage] })

        for await (const part of stream.fullStream) {
          if (part.type === 'tool-call') {
            yield { event: 'tool', data: { name: part.toolName, input: part.input } }
          }
          if (part.type === 'text-delta') {
            yield { event: 'message', data: { text: part.text } }
          }
        }
        // The turn joins the history only once it completes, so a failed or abandoned request leaves nothing behind
        messages.push(userMessage, ...(await stream.responseMessages))
      } finally {
        // A browser session outlives the runtime session, so stop it rather than let it run until its timeout
        await browser.stopSession()
        busy = false
      }
    },
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
