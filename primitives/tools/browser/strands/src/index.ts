import { Agent, BedrockModel } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { BrowserTools } from 'bedrock-agentcore/experimental/browser/strands'
import { z } from 'zod'

const region = process.env['AWS_REGION'] ?? 'us-east-1'

const systemPrompt = `You are a web automation assistant with access to a browser session.

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
  agent: Agent
  browser: BrowserTools
}

const conversations = new Map<string, Conversation>()

function createConversation(): Conversation {
  const browser = new BrowserTools({ region })
  const agent = new Agent({
    model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region }),
    tools: browser.tools,
    systemPrompt,
    // Tools share one browser session; running them in parallel would race to start it
    toolExecutor: 'sequential',
  })
  return { agent, browser }
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
      const { agent } = await getConversation(context.sessionId)

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

async function stopBrowsersAndExit(): Promise<void> {
  const browsers = [...conversations.values()].map(({ browser }) => browser.stopSession())
  await Promise.allSettled(browsers)
  process.exit(0)
}
process.on('SIGTERM', stopBrowsersAndExit)
process.on('SIGINT', stopBrowsersAndExit)

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
