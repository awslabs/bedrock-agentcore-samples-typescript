import { useState } from 'react'
import type { AgentEvent, UploadFile } from '../types'

interface StreamOptions {
  endpoint: string
  prompt: string
  files: UploadFile[]
  sessionId: string
  getAccessToken?: () => Promise<string | null>
  onEvent: (event: AgentEvent) => void
}

interface Streaming {
  streamMessage: (options: StreamOptions) => Promise<void>
  isStreaming: boolean
}

// One server-sent event: "event: tool\ndata: {...}". Other lines (keep-alive comments) are ignored.
function parseEvent(rawEvent: string): AgentEvent | null {
  let type = 'message'
  const dataLines: string[] = []
  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event:')) type = line.slice(6).trim()
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
  }
  if (dataLines.length === 0) return null
  try {
    const data: unknown = JSON.parse(dataLines.join('\n'))
    return { type, data } as AgentEvent
  } catch {
    console.error(`Could not parse "${type}" event:`, rawEvent)
    return null
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const body = await response.text()
  try {
    const parsed: { error?: string; message?: string } = JSON.parse(body)
    return parsed.error ?? parsed.message ?? body
  } catch {
    return body || response.statusText
  }
}

export default function useStreaming(): Streaming {
  const [isStreaming, setIsStreaming] = useState(false)

  const streamMessage = async ({
    endpoint,
    prompt,
    files,
    sessionId,
    getAccessToken,
    onEvent,
  }: StreamOptions): Promise<void> => {
    setIsStreaming(true)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': sessionId,
      }
      if (getAccessToken) {
        const token = await getAccessToken()
        if (!token) return
        headers['Authorization'] = `Bearer ${token}`
      }

      const body = files.length > 0 ? { prompt, files } : { prompt }
      const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) })
      if (!response.ok) {
        throw new Error(`The agent returned ${response.status}: ${await readErrorMessage(response)}`)
      }
      if (!response.body) throw new Error('The agent returned an empty response')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Events end with a blank line and can be split across network chunks: keep the unfinished one for later.
        buffer += decoder.decode(value, { stream: true }).replaceAll('\r', '')
        const rawEvents = buffer.split('\n\n')
        buffer = rawEvents.pop() ?? ''

        for (const rawEvent of rawEvents) {
          const event = parseEvent(rawEvent)
          if (event) onEvent(event)
        }
      }
    } finally {
      setIsStreaming(false)
    }
  }

  return { streamMessage, isStreaming }
}
