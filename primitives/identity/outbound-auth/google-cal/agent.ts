/* global fetch */
import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { withAccessToken } from 'bedrock-agentcore/identity'
import { z } from 'zod'

const PROVIDER_NAME = process.env.PROVIDER_NAME || 'google-cal-provider'
const CALLBACK_URL = process.env.CALLBACK_URL || 'http://localhost:9090/oauth2/callback'

console.log('[agent] Starting with PROVIDER_NAME:', PROVIDER_NAME)
console.log('[agent] CALLBACK_URL:', CALLBACK_URL)

interface CalendarEvent {
  summary?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

// Signaling mechanism to stream auth URLs to the client immediately
let pendingAuthUrl: string | null = null
let notifyAuthUrl: (() => void) | null = null
let authUrlSignal = createAuthUrlSignal()

function createAuthUrlSignal() {
  return new Promise<void>((resolve) => {
    notifyAuthUrl = resolve
  })
}

const fetchCalendarEvents = withAccessToken({
  providerName: PROVIDER_NAME,
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  authFlow: 'USER_FEDERATION',
  callbackUrl: CALLBACK_URL,
  customParameters: { access_type: 'offline', prompt: 'consent' },
  onAuthUrl: (url) => {
    console.log('[agent] onAuthUrl called with:', url?.substring(0, 80) + '...')
    pendingAuthUrl = url
    notifyAuthUrl?.()
    authUrlSignal = createAuthUrlSignal()
  },
})(async (maxResults: number, token: string) => {
  console.log('[agent] fetchCalendarEvents called, maxResults:', maxResults)
  console.log('[agent] Got token:', token?.substring(0, 20) + '...')

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    `maxResults=${maxResults}&timeMin=${encodeURIComponent(new Date().toISOString())}` +
    `&singleEvents=true&orderBy=startTime`

  console.log('[agent] Fetching from Google Calendar API...')
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  console.log('[agent] Google API response status:', response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[agent] Google API error body:', errorText)
    throw new Error(`Google Calendar API error: ${response.status}`)
  }

  const data = await response.json()
  console.log('[agent] Got', data.items?.length ?? 0, 'events from Google')

  return {
    events: data.items?.map((e: CalendarEvent) => ({
      summary: e.summary ?? null,
      start: e.start?.dateTime ?? e.start?.date ?? null,
      end: e.end?.dateTime ?? e.end?.date ?? null,
    })) ?? [],
  }
})

const getCalendarTool = tool({
  name: 'getCalendar',
  description: 'Get upcoming calendar events from Google Calendar',
  inputSchema: z.object({
    maxResults: z.number().default(10).describe('Maximum number of events to return'),
  }),
  callback: async ({ maxResults }) => {
    console.log('[agent] === getCalendar tool invoked ===')
    console.log('[agent] maxResults:', maxResults)
    try {
      const result = await fetchCalendarEvents(maxResults)
      console.log('[agent] getCalendar completed successfully')
      console.log('[agent] Result events count:', result.events?.length)
      return result
    } catch (error) {
      console.error('[agent] getCalendar ERROR:', error)
      console.error('[agent] Error stack:', error instanceof Error ? error.stack : 'no stack')
      throw error
    }
  },
})

console.log('[agent] Creating agent...')

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.anthropic.claude-haiku-4-5-20251001-v1:0',
    region: process.env.AWS_REGION ?? 'us-east-1',
  }),
  tools: [getCalendarTool],
  systemPrompt: 'You are a helpful calendar assistant. Use the getCalendar tool to fetch events.',
})

console.log('[agent] Agent created, setting up BedrockAgentCoreApp...')

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, context) {
      console.log('[agent] === New invocation ===')
      console.log('[agent] Prompt:', request.prompt)
      console.log('[agent] Session ID:', context.sessionId)
      console.log('[agent] Has workloadAccessToken:', !!context.workloadAccessToken)

      if (!context.workloadAccessToken) {
        console.error('[agent] ERROR: No workloadAccessToken!')
        yield { event: 'error', data: { message: 'No workload access token available' } }
        return
      }

      console.log('[agent] Resetting auth URL state...')
      pendingAuthUrl = null
      authUrlSignal = createAuthUrlSignal()

      console.log('[agent] Starting agent stream...')
      const stream = agent.stream(request.prompt)[Symbol.asyncIterator]()

      let iteration = 0
      while (true) {
        iteration++
        console.log('[agent] Stream iteration:', iteration)

        const result = await Promise.race([
          stream.next().then((r) => ({ type: 'stream' as const, ...r })),
          authUrlSignal.then(() => ({ type: 'auth' as const })),
        ])

        console.log('[agent] Promise.race resolved with type:', result.type)

        if (result.type === 'auth') {
          console.log('[agent] Auth URL received, yielding immediately')
          yield { event: 'auth_url', data: { authUrl: pendingAuthUrl } }
          pendingAuthUrl = null
          continue
        }

        if (result.done) {
          console.log('[agent] Stream done')
          break
        }

        if (result.value?.type === 'modelContentBlockDeltaEvent' && result.value.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: result.value.delta.text } }
        }
      }

      console.log('[agent] Invocation complete')
    },
  },
})

console.log('[agent] Starting app...')
app.run()
