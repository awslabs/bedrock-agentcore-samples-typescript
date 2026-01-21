import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { withAccessToken } from 'bedrock-agentcore/identity'

import { z } from 'zod'

// Request schema
const requestSchema = z.object({
  prompt: z.string(),
})

function getWorkloadIdentityToken(): string {
  console.log('WORKLOAD_IDENTITY_TOKEN:', process.env.WORKLOAD_IDENTITY_TOKEN)
  return process.env.WORKLOAD_IDENTITY_TOKEN || ''
}

const getCalendar = tool({
  name: 'getCalendar',
  description: 'Get my calendar events',
  inputSchema: z.object({
    maxResults: z.number().optional().describe('Maximum number of events to return (default: 10)'),
    timeMin: z.string().optional().describe('Lower bound for event start time (ISO 8601 format)'),
    timeMax: z.string().optional().describe('Upper bound for event start time (ISO 8601 format)'),
  }),
  callback: withAccessToken({
    providerName: 'google-cal-provider',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    authFlow: 'USER_FEDERATION',
    onAuthUrl: () => {
      // This is where you would redirect the user to the Google OAuth consent screen
      // For now, we'll just log the URL
      console.log('Please visit this URL to authorize the application:')
      eventQueue.push({ event: 'authUrl', data: { url: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' } })
    },
    callbackUrl: process.env.CALLBACK_URL || 'http://localhost:8080',
    workloadIdentityToken: getWorkloadIdentityToken() || '',
  })(async (input: { maxResults?: number; timeMin?: string; timeMax?: string }, token: string) => {
    const maxResults = input.maxResults || 10
    const timeMin = input.timeMin || new Date().toISOString()

    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      timeMin,
      singleEvents: 'true',
      orderBy: 'startTime',
    })

    if (input.timeMax) {
      params.append('timeMax', input.timeMax)
    }

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    return {
      events:
        data.items?.map((event: any) => ({
          id: event.id,
          summary: event.summary,
          description: event.description,
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          location: event.location,
          attendees: event.attendees?.map((a: any) => a.email),
        })) || [],
      nextPageToken: data.nextPageToken,
    }
  }),
})

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  tools: [getCalendar],
  systemPrompt:
    'You are a helpful calendar assistant. You can help users view and manage their Google Calendar events.',
})

// Queue to store agent events
interface QueuedEvent {
  event: string
  data: any
}

const eventQueue: QueuedEvent[] = []

const app = new BedrockAgentCoreApp({
  config: {
    logging: {
      options: { level: 'warn' },
    },
  },
  invocationHandler: {
    requestSchema,
    process: async function* (request, _context) {
      console.log('Received request:', request)
      const testTokenFunction = withAccessToken({
        providerName: 'google-cal-provider',
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        authFlow: 'USER_FEDERATION',
        onAuthUrl: (url: string) => {
          console.log('Authorization URL:', url)
        },
        callbackUrl: process.env.CALLBACK_URL || 'http://localhost:8080',
        workloadIdentityToken: _context.workloadAccessToken ?? '',
      })(async (input: { message: string }, token: string) => {
        console.log('=== Access Token Test ===')
        console.log('Input:', input)
        console.log('Token:', token)
        console.log('Token length:', token.length)
        console.log('Token prefix:', token.substring(0, 20) + '...')
        console.log('========================')

        return {
          success: true,
          message: input.message,
          tokenReceived: !!token,
        }
      })
      process.env.WORKLOAD_IDENTITY_TOKEN = _context.workloadAccessToken
      console.log(_context)
      console.log(process.env)
      let isStreamComplete = false
      let streamError: Error | null = null
      // try {
      //   await testTokenFunction({ message: 'Hello' })
      // } catch (error) {
      //   console.error('Error in testTokenFunction:', error)
      //   yield { event: 'error', data: { message: 'Failed to get access token' } }
      //   return
      // }
      console.log('Calling agent')
      // Push all agent events to the queue asynchronously (non-blocking)
      ;(async () => {
        console.log('Start agent loop')
        try {
          for await (const event of agent.stream(request.prompt)) {
            if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
              eventQueue.push({ event: 'message', data: { text: event.delta.text } })
            }
          }
        } catch (error) {
          console.log(error)
          streamError = error as Error
        } finally {
          console.log('Stream complete')
          isStreamComplete = true
        }
      })()

      // Pull events from the queue and yield them to the caller
      while (!isStreamComplete || eventQueue.length > 0) {
        if (eventQueue.length > 0) {
          const queuedEvent = eventQueue.shift()
          if (queuedEvent) {
            yield queuedEvent
          }
        } else {
          // Wait a bit before checking again if queue is empty but stream not complete
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      }

      // If there was an error during streaming, throw it
      if (streamError) {
        yield streamError
      }

      console.log('All events processed from queue')
    },
  },
})

app.run()
