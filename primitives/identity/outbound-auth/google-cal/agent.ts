/* global fetch */
import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { withAccessToken } from 'bedrock-agentcore/identity'
import { z } from 'zod'

const PROVIDER_NAME = process.env.PROVIDER_NAME || 'google-cal-provider'
const CALLBACK_URL = process.env.CALLBACK_URL || 'http://localhost:9090/oauth2/callback'

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
    console.log('[agent] Auth required - URL received')
    pendingAuthUrl = url
    notifyAuthUrl?.()
    authUrlSignal = createAuthUrlSignal()
  },
})(async (maxResults: number, token: string) => {
  const url =
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?' +
    `maxResults=${maxResults}&timeMin=${encodeURIComponent(new Date().toISOString())}` +
    '&singleEvents=true&orderBy=startTime'

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[agent] Google Calendar API error:', response.status, errorText)
    throw new Error(`Google Calendar API error: ${response.status}`)
  }

  const data = await response.json()
  return {
    events:
      data.items?.map((e: CalendarEvent) => ({
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
    return fetchCalendarEvents(maxResults)
  },
})

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.anthropic.claude-haiku-4-5-20251001-v1:0',
    region: process.env.AWS_REGION ?? 'us-east-1',
  }),
  tools: [getCalendarTool],
  systemPrompt: 'You are a helpful calendar assistant. Use the getCalendar tool to fetch events.',
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, context) {
      if (!context.workloadAccessToken) {
        yield { event: 'error', data: { message: 'No workload access token available' } }
        return
      }

      pendingAuthUrl = null
      authUrlSignal = createAuthUrlSignal()

      const stream = agent.stream(request.prompt)[Symbol.asyncIterator]()

      while (true) {
        const result = await Promise.race([
          stream.next().then((r) => ({ type: 'stream' as const, ...r })),
          authUrlSignal.then(() => ({ type: 'auth' as const })),
        ])

        if (result.type === 'auth') {
          yield { event: 'auth_url', data: { authUrl: pendingAuthUrl } }
          pendingAuthUrl = null
          continue
        }

        if (result.done) break

        if (result.value?.type === 'modelContentBlockDeltaEvent' && result.value.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: result.value.delta.text } }
        }
      }
    },
  },
})

app.run()
