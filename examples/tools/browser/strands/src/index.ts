import { Agent, BedrockModel } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { BrowserTools } from 'bedrock-agentcore/browser/strands'
import { z } from 'zod'

const requestSchema = z.object({
  prompt: z.string(),
})

const browserTools = new BrowserTools({
  region: process.env['AWS_REGION'] || 'us-east-1',
})

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.anthropic.claude-haiku-4-5-20251001-v1:0',
    region: process.env['AWS_REGION'] || 'us-east-1',
  }),
  tools: browserTools.tools,
  systemPrompt: `You are a grocery shopping assistant for willys.se (Swedish grocery store).

Shopping workflow:
1. Navigate to https://www.willys.se
2. Handle cookie consent dialogs
3. Search for each ingredient
4. Add items to cart
5. Navigate to cart to verify
6. Stop before checkout and provide Live View URL

Swedish terms: Sök=Search, Lägg i varukorg=Add to cart, Varukorg=Cart, Till kassan=Checkout

NEVER enter payment information - hand off to user for checkout.`,
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, _context) {
      for await (const event of agent.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }

      const session = await browserTools.getClient().getSession()
      if (session?.streams?.liveViewStream?.streamEndpoint) {
        yield {
          event: 'message',
          data: {
            text: `\n\n---\n**Live View URL:** ${session.streams.liveViewStream.streamEndpoint}\n\nOpen this URL to take control and complete checkout.\n`,
          },
        }
      }
    },
  },
})

process.on('SIGTERM', async () => {
  await browserTools.stopSession()
  process.exit(0)
})

app.run()
