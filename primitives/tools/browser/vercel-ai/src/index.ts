import { ToolLoopAgent, type ModelMessage } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { BrowserTools } from 'bedrock-agentcore/browser/vercel-ai'
import { z } from 'zod'

const region = process.env['AWS_REGION'] ?? 'us-east-1'
const bedrock = createAmazonBedrock({ region, credentialProvider: fromNodeProviderChain() })

const instructions = `You are a web automation assistant with access to a browser session.

Available tools:
- navigate: Go to a URL
- click: Click an element by CSS selector
- type: Enter text into an input field
- getText: Read text content from the page
- getHtml: Read the HTML of the page or an element
- screenshot: Capture the current page (pass a path to save it as a file)
- evaluate: Run JavaScript in the page

Session behavior:
- The browser session persists across invocations
- Cookies, login state, and cart contents remain until the session ends

Best practices:
- Handle cookie consent dialogs when they appear
- Wait for page loads before interacting with elements
- Use descriptive selectors when possible
- Never enter payment or sensitive information—hand off to the user instead`

interface Conversation {
  agent: ToolLoopAgent<never, BrowserTools['tools']>
  browser: BrowserTools
  messages: ModelMessage[]
}

const conversations = new Map<string, Conversation>()

function createConversation(): Conversation {
  const browser = new BrowserTools({ region })
  const agent = new ToolLoopAgent({
    model: bedrock('global.anthropic.claude-haiku-5-5'),
    tools: browser.tools,
    instructions,
    // Tools share one browser session; running them in parallel would race to start it
    toolCallConcurrency: 1,
  })
  return { agent, browser, messages: [] }
}

async function browserStatus(browser: BrowserTools): Promise<string> {
  try {
    const session = await browser.getClient().getSession()
    return session.status
  } catch {
    // The browser starts on the first tool call; until then there is no session to look up
    return 'NOT_STARTED'
  }
}

async function getConversation(sessionId: string): Promise<Conversation> {
  const existing = conversations.get(sessionId)
  // A browser session that timed out can't be resumed, so the conversation starts over with a new one
  if (existing && (await browserStatus(existing.browser)) !== 'TERMINATED') {
    return existing
  }
  const conversation = createConversation()
  conversations.set(sessionId, conversation)
  return conversation
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, context) {
      const conversation = await getConversation(context.sessionId)
      const userMessage: ModelMessage = { role: 'user', content: request.prompt }

      const stream = await conversation.agent.stream({ messages: [...conversation.messages, userMessage] })
      for await (const chunk of stream.textStream) {
        yield { event: 'message', data: { text: chunk } }
      }
      conversation.messages.push(userMessage, ...(await stream.responseMessages))
    },
  },
})

async function stopBrowsersAndExit(): Promise<void> {
  const browsers = [...conversations.values()].map(({ browser }) => browser.stopSession())
  await Promise.allSettled(browsers)
  process.exit(0)
}
process.on('SIGTERM', stopBrowsersAndExit)
process.on('SIGINT', stopBrowsersAndExit)

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
