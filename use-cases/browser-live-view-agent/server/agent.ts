import { Agent, BedrockModel, type JSONValue, type ToolResultBlock } from '@strands-agents/sdk'
import { BrowserTools } from 'bedrock-agentcore/experimental/browser/strands'
import { config } from './config.js'

export interface LogEntry {
  time: string
  text: string
  tool?: string
}

export interface AgentState {
  status: 'idle' | 'running' | 'completed' | 'error'
  liveViewUrl: string | null
  logs: LogEntry[]
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

const systemPrompt = `You are a browser automation agent. Do every task with the browser tools; never answer from memory.
- Start with navigate.
- Read pages with getText and no selector. Use selectors only on pages you have already read.
- To search a site, type into its search box and click its button, or navigate straight to the results URL.
- evaluate takes a JavaScript expression, such as document.title, not a function body.
- As soon as you have what the task asks for, give a short answer in plain text.`

const browserTools = new BrowserTools({ region: config.region, identifier: config.browserIdentifier })
const browser = browserTools.getClient()

const agent = new Agent({
  model: new BedrockModel({ modelId: config.modelId, region: config.region, maxTokens: 8192 }),
  systemPrompt,
  // screenshot is left out: it can write files on this machine, and the live view already shows the page
  tools: [
    browserTools.navigate,
    browserTools.click,
    browserTools.type,
    browserTools.getText,
    browserTools.getHtml,
    browserTools.evaluate,
  ],
  // The tools share one browser session, so they run one at a time
  toolExecutor: 'sequential',
})

let sessionStart: Promise<void> | null = null
let agentRun: Promise<void> | null = null

function log(text: string, tool?: string): void {
  const time = new Date().toLocaleTimeString('en-GB')
  agentState.logs.push(tool ? { time, text, tool } : { time, text })
}

function describeToolInput(input: JSONValue): string {
  if (typeof input !== 'object' || input === null) return ''
  const values = Object.values(input).map((value) => (typeof value === 'string' ? value : JSON.stringify(value)))
  return values.length > 0 ? values.join(' · ').slice(0, 200) : 'whole page'
}

// The SDK's browser tools return { success: false, error } when a browser action fails
function toolError({ status, content: [output] }: ToolResultBlock): string | null {
  if (status === 'error') return output?.type === 'textBlock' ? output.text : 'Unknown error'
  if (output?.type !== 'jsonBlock') return null
  const { success, error } = output.json as { success?: boolean; error?: string }
  return success === false ? (error ?? 'Unknown error') : null
}

async function openSession(): Promise<void> {
  // A new browser session starts a new conversation, so the agent doesn't recall pages from the last one
  agent.messages = []
  agentState.logs = []
  agentState.result = null
  agentState.error = null
  log('Starting the browser session')
  try {
    await browser.startSession({ sessionName: 'live-view-agent', viewport: config.viewport })
  } catch (error) {
    sessionStart = null
    throw error
  }
  log('Browser session started')
}

export async function startSession(): Promise<string> {
  // Concurrent callers share one start, so a second request can't leave an orphaned session
  sessionStart ??= openSession()
  await sessionStart
  // Live view URLs expire after 5 minutes, so every call signs a fresh one
  agentState.liveViewUrl = await browser.generateLiveViewUrl()
  return agentState.liveViewUrl
}

export function hasSession(): boolean {
  return sessionStart !== null
}

async function runAgent(prompt: string): Promise<void> {
  agentState.status = 'running'
  agentState.result = null
  agentState.error = null
  log(`Task: ${prompt}`)

  try {
    for await (const event of agent.stream(prompt)) {
      if (event.type === 'beforeToolCallEvent') {
        log(describeToolInput(event.toolUse.input), event.toolUse.name)
      } else if (event.type === 'afterToolCallEvent') {
        const error = toolError(event.result)
        if (error) log(`${event.toolUse.name} failed: ${error.split('\n')[0]}`)
      } else if (event.type === 'modelMessageEvent' && event.stopReason === 'toolUse') {
        for (const block of event.message.content) {
          if (block.type === 'textBlock') log(block.text)
        }
      } else if (event.type === 'agentResultEvent') {
        if (event.result.stopReason === 'cancelled') {
          agentState.status = 'idle'
          log('Stopped')
          return
        }
        agentState.result = event.result.toString()
        agentState.status = 'completed'
      }
    }
  } catch (error) {
    agentState.error = error instanceof Error ? error.message : String(error)
    agentState.status = 'error'
    log(`Error: ${agentState.error}`)
  }
}

export function startAgent(prompt: string): void {
  agentRun = runAgent(prompt)
}

export async function stopSession(): Promise<void> {
  // A running agent finishes its current tool first, so no later tool call can start a new session
  agent.cancel()
  await agentRun
  try {
    await sessionStart
  } catch {
    return
  }
  if (!sessionStart) return
  sessionStart = null
  agentState.liveViewUrl = null
  await browser.stopSession()
  log('Browser session stopped')
}
