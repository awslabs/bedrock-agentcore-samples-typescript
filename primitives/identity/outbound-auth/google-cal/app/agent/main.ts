import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { withAccessToken } from 'bedrock-agentcore/identity'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

// `agentcore deploy` sets CREDENTIAL_GOOGLE_CAL_NAME to the provider created by `agentcore add credentials`.
const providerName = process.env['CREDENTIAL_GOOGLE_CAL_NAME'] ?? 'google-cal'
const callbackUrl = 'http://localhost:9090/oauth2/callback'

interface GoogleCalendarEvent {
  summary?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

type CalendarEvent = { summary: string | null; start: string | null; end: string | null }

async function listUpcomingEvents(maxResults: number, token: string): Promise<CalendarEvent[]> {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.search = new URLSearchParams({
    maxResults: String(maxResults),
    timeMin: new Date().toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  }).toString()

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.status} ${await response.text()}`)
  }

  const body = (await response.json()) as { items?: GoogleCalendarEvent[] }
  return (body.items ?? []).map((event) => ({
    summary: event.summary ?? null,
    start: event.start?.dateTime ?? event.start?.date ?? null,
    end: event.end?.dateTime ?? event.end?.date ?? null,
  }))
}

const getCalendar = tool({
  name: 'getCalendar',
  description: "Get upcoming events from the user's Google Calendar",
  inputSchema: z.object({
    maxResults: z.number().default(10).describe('Maximum number of events to return'),
  }),
  // Until the user has consented, withAccessToken reports an authorization URL and then waits for the token.
  // The URL is yielded as a tool stream event so the caller can show it while the tool keeps waiting.
  callback: async function* ({ maxResults }): AsyncGenerator<{ authUrl: string }, CalendarEvent[], never> {
    let resolveAuthUrl: (url: string) => void = () => {}
    const authUrl = new Promise<string>((resolve) => {
      resolveAuthUrl = resolve
    })

    const events = withAccessToken({
      providerName,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      authFlow: 'USER_FEDERATION',
      callbackUrl,
      customParameters: { access_type: 'offline', prompt: 'consent' },
      onAuthUrl: resolveAuthUrl,
    })(listUpcomingEvents)(maxResults)

    const first = await Promise.race([events, authUrl])
    if (typeof first === 'string') {
      yield { authUrl: first }
    }
    return await events
  },
})

// One agent per runtime session: a Strands agent keeps the conversation and runs one invocation at a time.
const agentsBySession = new Map<string, Agent>()

function getAgent(sessionId: string): Agent {
  let agent = agentsBySession.get(sessionId)
  if (!agent) {
    agent = new Agent({
      model: new BedrockModel({
        modelId: 'global.anthropic.claude-haiku-5-5',
        region: process.env['AWS_REGION'] ?? 'us-east-1',
        maxTokens: 8192,
      }),
      systemPrompt: 'You are a helpful calendar assistant. Use the getCalendar tool to fetch events.',
      tools: [getCalendar],
    })
    agentsBySession.set(sessionId, agent)
  }
  return agent
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, context) {
      if (!context.workloadAccessToken) {
        yield {
          event: 'error',
          data: { error: 'No workload access token: invoke the deployed runtime with a user JWT.' },
        }
        return
      }

      for await (const event of getAgent(context.sessionId).stream(request.prompt)) {
        if (event.type === 'toolStreamUpdateEvent') {
          yield { event: 'auth_url', data: event.event.data }
        }
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

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
