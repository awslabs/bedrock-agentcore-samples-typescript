import { ToolLoopAgent } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { BrowserTools } from 'bedrock-agentcore/browser/vercel-ai'
import { z } from 'zod'

const requestSchema = z.object({
  prompt: z.string(),
})

const bedrock = createAmazonBedrock({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
})

const browserTools = new BrowserTools({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
})

const agent = new ToolLoopAgent({
  model: bedrock('global.anthropic.claude-haiku-4-5-20251001-v1:0'),
  tools: browserTools.tools,
  instructions: `You are a web automation assistant with access to a browser session.

Available tools:
- navigate: Go to a URL
- click: Click an element (by CSS selector or text)
- type: Enter text into an input field
- getText: Read text content from the page
- screenshot: Capture the current page

Session behavior:
- The browser session persists across invocations
- Cookies, login state, and cart contents remain until the session ends

Best practices:
- Handle cookie consent dialogs when they appear
- Wait for page loads before interacting with elements
- Use descriptive selectors when possible
- Never enter payment or sensitive information—hand off to the user instead`,
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, _context) {
      const stream = await agent.stream({ prompt: request.prompt })
      for await (const chunk of stream.textStream) {
        yield { event: 'message', data: { text: chunk } }
      }
    },
  },
})

const cleanup = async () => {
  await browserTools.stopSession()
  process.exit(0)
}
process.on('SIGTERM', cleanup)
process.on('SIGINT', cleanup)

app.run()
