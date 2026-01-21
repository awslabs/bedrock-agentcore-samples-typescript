/* global fetch */
import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { withAccessToken } from 'bedrock-agentcore/identity'
import { z } from 'zod'

const requestSchema = z.object({
  prompt: z.string(),
})

const PROVIDER_NAME = process.env.PROVIDER_NAME || 'google-cal-provider'
const CALLBACK_URL = process.env.CALLBACK_URL || 'http://localhost:9090/oauth2/callback'

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, context) {
      console.log('[agent] === New Request ===')
      console.log('[agent] Prompt:', request.prompt)
      console.log('[agent] Session ID:', context.sessionId)
      console.log(
        '[agent] Workload Access Token:',
        context.workloadAccessToken ? `${context.workloadAccessToken.substring(0, 30)}...` : 'MISSING'
      )

      if (!context.workloadAccessToken) {
        console.error('[agent] ERROR: No workloadAccessToken in context!')
        yield { event: 'error', data: { message: 'No workload access token available' } }
        return
      }

      // Function that fetches calendar events with the OAuth token
      async function fetchCalendarEvents(maxResults: number, token: string) {
        console.log('[agent] Got access token:', token.substring(0, 30) + '...')

        const timeMin = new Date().toISOString()
        const url =
          'https://www.googleapis.com/calendar/v3/calendars/primary/events?' +
          `maxResults=${maxResults}&timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime`

        console.log('[agent] Calling Google Calendar API:', url)

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const error = await response.text()
          console.error('[agent] Google Calendar API error:', response.status, error)
          throw new Error(`Google Calendar API error: ${response.status}`)
        }

        const data = await response.json()
        console.log('[agent] Got', data.items?.length || 0, 'events')

        return {
          events:
            data.items?.map(
              (event: {
                summary?: string
                start?: { dateTime?: string; date?: string }
                end?: { dateTime?: string; date?: string }
              }) => ({
                summary: event.summary || null,
                start: event.start?.dateTime || event.start?.date || null,
                end: event.end?.dateTime || event.end?.date || null,
              })
            ) || [],
        }
      }

      // Wrap the function with withAccessToken - token is injected as last argument
      const fetchCalendarWithAuth = withAccessToken({
        providerName: PROVIDER_NAME,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        authFlow: 'USER_FEDERATION',
        workloadIdentityToken: context.workloadAccessToken,
        callbackUrl: CALLBACK_URL,
        customParameters: {
          access_type: 'offline',
          prompt: 'consent',
        },
        onAuthUrl: (url) => {
          console.log('[agent] ========================================')
          console.log('[agent] AUTHORIZATION REQUIRED')
          console.log('[agent] User must visit this URL to authorize:')
          console.log('[agent]', url)
          console.log('[agent] ========================================')
        },
      })(fetchCalendarEvents as (...args: [...unknown[], string]) => Promise<unknown>)

      // Create the tool that uses our authenticated fetcher
      const getCalendar = tool({
        name: 'getCalendar',
        description: 'Get upcoming calendar events from Google Calendar',
        inputSchema: z.object({
          maxResults: z.number().optional().describe('Maximum events to return (default: 10)'),
        }),
        callback: async (input) => {
          const maxResults = input.maxResults || 10
          const result = await fetchCalendarWithAuth(maxResults)
          return result as { events: { summary: string | null; start: string | null; end: string | null }[] }
        },
      })

      const agent = new Agent({
        model: new BedrockModel({
          modelId: 'us.amazon.nova-lite-v1:0',
          region: process.env.AWS_REGION ?? 'us-east-1',
        }),
        tools: [getCalendar],
        systemPrompt: 'You are a helpful calendar assistant. Use the getCalendar tool to fetch events.',
      })

      console.log('[agent] Starting agent stream...')

      for await (const event of agent.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }

      console.log('[agent] Stream complete')
    },
  },
})

app.run()
