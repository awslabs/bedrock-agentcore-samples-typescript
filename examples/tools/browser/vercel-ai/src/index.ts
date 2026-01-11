import { ToolLoopAgent } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { BrowserTools } from 'bedrock-agentcore/browser/vercel-ai'
import { z } from 'zod'

const requestSchema = z.object({
  prompt: z.string(),
})

const bedrock = createAmazonBedrock({
  region: process.env['AWS_REGION'] || 'us-east-1',
})

const browserTools = new BrowserTools({
  region: process.env['AWS_REGION'] || 'us-east-1',
})

const agent = new ToolLoopAgent({
  model: bedrock('global.anthropic.claude-haiku-4-5-20251001-v1:0'),
  tools: browserTools.tools,
  instructions: `You are a grocery shopping assistant for willys.se (Swedish grocery store).

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
      const stream = await agent.stream({ prompt: request.prompt })
      for await (const chunk of stream.textStream) {
        yield { event: 'message', data: { text: chunk } }
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
