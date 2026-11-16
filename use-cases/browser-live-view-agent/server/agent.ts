import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type ContentBlock,
  type ToolConfiguration,
  type ToolResultContentBlock,
} from '@aws-sdk/client-bedrock-runtime'
import { PlaywrightBrowser } from 'bedrock-agentcore/browser/playwright'
import { config } from './config.js'

export interface AgentState {
  status: 'idle' | 'starting' | 'running' | 'completed' | 'error'
  liveViewUrl: string | null
  logs: string[]
  result: string | null
  error: string | null
}

export const agentState: AgentState = {
  status: 'idle',
  liveViewUrl: null,
  logs: [],
  result: null,
  error: null,
}

let browser: PlaywrightBrowser | null = null

function log(message: string): void {
  const now = new Date()
  const timestamp = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const entry = `${timestamp} ${message}`
  agentState.logs.push(entry)
  console.log(`[agent] ${entry}`)
}

const TOOL_CONFIG: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: 'navigate',
        description: 'Navigate the browser to a URL.',
        inputSchema: {
          json: {
            type: 'object',
            properties: { url: { type: 'string', description: 'URL to navigate to' } },
            required: ['url'],
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'click',
        description: 'Click an element by CSS selector.',
        inputSchema: {
          json: {
            type: 'object',
            properties: { selector: { type: 'string', description: 'CSS selector' } },
            required: ['selector'],
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'type',
        description: 'Type text into an input element.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector' },
              text: { type: 'string', description: 'Text to type' },
            },
            required: ['selector', 'text'],
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'getText',
        description: 'Get text content of the page or a specific element.',
        inputSchema: {
          json: {
            type: 'object',
            properties: { selector: { type: 'string', description: 'CSS selector (omit for full page)' } },
            required: [],
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'getHtml',
        description: 'Get HTML content of the page or a specific element.',
        inputSchema: {
          json: {
            type: 'object',
            properties: { selector: { type: 'string', description: 'CSS selector (omit for full page)' } },
            required: [],
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'pressKey',
        description: 'Press a keyboard key, e.g. "Enter", "Tab".',
        inputSchema: {
          json: { type: 'object', properties: { key: { type: 'string', description: 'Key name' } }, required: ['key'] },
        },
      },
    },
  ],
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  if (!browser) throw new Error('No browser session')
  try {
    switch (name) {
      case 'navigate':
        await browser.navigate({ url: input.url as string })
        return `Navigated to ${input.url}`
      case 'click':
        await browser.click({ selector: input.selector as string })
        return `Clicked: ${input.selector}`
      case 'type':
        await browser.type({ selector: input.selector as string, text: input.text as string })
        return `Typed "${input.text}" into ${input.selector}`
      case 'getText': {
        const text = await browser.getText(input.selector ? { selector: input.selector as string } : {})
        return text.length > 4000 ? text.slice(0, 4000) + '\n... [truncated]' : text
      }
      case 'getHtml': {
        const html = await browser.getHtml(input.selector ? { selector: input.selector as string } : {})
        return html.length > 4000 ? html.slice(0, 4000) + '\n... [truncated]' : html
      }
      case 'pressKey':
        await browser.pressKey(input.key as string)
        return `Pressed: ${input.key}`
      default:
        return `Unknown tool: ${name}`
    }
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : 'Tool execution failed'}`
  }
}

let liveViewUrlPromise: Promise<string> | null = null

async function createSession(): Promise<string> {
  agentState.status = 'starting'
  agentState.logs = []
  agentState.result = null
  agentState.error = null
  log('Creating browser session...')

  const session = new PlaywrightBrowser({ region: config.region, identifier: config.browser.identifier })
  try {
    await session.startSession({
      sessionName: 'liveview-demo',
      timeout: config.browser.sessionTimeout,
      viewport: config.browser.viewport,
    })
    log(`Session started: ${config.browser.identifier}`)

    const liveViewUrl = await session.generateLiveViewUrl()
    browser = session
    agentState.liveViewUrl = liveViewUrl
    agentState.status = 'idle'
    log('Live view URL generated')
    return liveViewUrl
  } catch (err) {
    liveViewUrlPromise = null
    agentState.status = 'error'
    agentState.error = err instanceof Error ? err.message : 'Failed to start browser session'
    log(`Session error: ${agentState.error}`)
    await session.stopSession()
    throw err
  }
}

// Concurrent callers share one in-flight start, so a second request can't orphan a session
export async function startSession(): Promise<string> {
  if (browser) {
    // Presigned live view URLs expire after 5 minutes, so an existing session gets a fresh one
    agentState.liveViewUrl = await browser.generateLiveViewUrl()
    return agentState.liveViewUrl
  }
  liveViewUrlPromise ??= createSession()
  return liveViewUrlPromise
}

export async function stopSession(): Promise<void> {
  try {
    await liveViewUrlPromise
  } catch {
    return
  }
  const session = browser
  if (!session) return
  browser = null
  liveViewUrlPromise = null
  agentState.status = 'idle'
  agentState.liveViewUrl = null
  log('Stopping session...')
  await session.stopSession()
  log('Session stopped')
}

export function hasSession(): boolean {
  return browser !== null
}

const SYSTEM_PROMPT = `You are a browser automation agent. You MUST use the provided tools to browse websites. You CANNOT answer from memory.
Workflow:
1. Call navigate to go to the URL
2. Call getText to read page content (no selector = full page text, which is usually best)
3. Call type and click to interact with search boxes and links
4. Call pressKey with "Enter" to submit forms
5. Once you have read the page content with getText, IMMEDIATELY provide your final summary
IMPORTANT:
- Always start with navigate
- Prefer getText with NO selector to get the full page text — do NOT try to target specific CSS selectors on unfamiliar pages
- After you have read page content, summarize it RIGHT AWAY — do not keep clicking around for more sections
- When you have enough information, respond with your final answer as plain text (no tool call)`

export async function runAgent(prompt: string): Promise<void> {
  agentState.status = 'running'
  agentState.result = null
  agentState.error = null
  log(`Agent starting with prompt: "${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}"`)

  try {
    const bedrockClient = new BedrockRuntimeClient({ region: config.region })

    const messages: Message[] = [{ role: 'user', content: [{ text: prompt }] }]
    let step = 0

    while (step < 40) {
      if (!browser) {
        log('Agent cancelled: session stopped')
        return
      }
      step++
      log(`Step ${step}/40`)

      const response = await bedrockClient.send(
        new ConverseCommand({
          modelId: config.modelId,
          system: [{ text: SYSTEM_PROMPT }],
          messages,
          toolConfig: TOOL_CONFIG,
        })
      )

      const outputContent = response.output?.message?.content || []
      messages.push({ role: 'assistant', content: outputContent })

      if (response.stopReason === 'tool_use') {
        const toolResultBlocks: ContentBlock[] = []

        for (const block of outputContent) {
          if (block.toolUse) {
            const name = block.toolUse.name!
            const input = (block.toolUse.input as Record<string, unknown>) || {}
            log(`Tool: ${name}(${JSON.stringify(input).slice(0, 120)})`)

            const result = await executeTool(name, input)
            log(`Result: ${result.slice(0, 100)}${result.length > 100 ? '...' : ''}`)

            toolResultBlocks.push({
              toolResult: {
                toolUseId: block.toolUse.toolUseId!,
                content: [{ text: result } as ToolResultContentBlock],
              },
            })
          }
        }

        messages.push({ role: 'user', content: toolResultBlocks })
      } else {
        const finalText = outputContent
          .filter((b) => b.text)
          .map((b) => b.text)
          .join('\n')
        agentState.result = finalText || 'Agent completed.'
        agentState.status = 'completed'
        log('Agent completed successfully')
        return
      }
    }

    agentState.result = 'Reached maximum steps.'
    agentState.status = 'completed'
    log('Max steps reached')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    agentState.error = message
    agentState.status = 'error'
    log(`Agent error: ${message}`)
    console.error('Full error:', err)
  }
}
