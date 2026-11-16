import { useState } from 'react'

function parseEventData(eventType, data) {
  try {
    return JSON.parse(data)
  } catch {
    console.error(`Could not parse "${eventType}" event:`, data)
    return null
  }
}

async function readErrorMessage(response) {
  const body = await response.text()
  try {
    const parsed = JSON.parse(body)
    return parsed.error ?? parsed.message ?? body
  } catch {
    return body || response.statusText
  }
}

export default function useStreaming() {
  const [isStreaming, setIsStreaming] = useState(false)

  const streamMessage = async ({ endpoint, prompt, files, sessionId, getAccessToken, onEvent }) => {
    setIsStreaming(true)
    try {
      const headers = {
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

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      // An event's lines can arrive in different network chunks, so its state lives outside the read loop.
      let eventType = 'message'
      let dataLines = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const rawLine of lines) {
          const line = rawLine.replace(/\r$/, '')
          if (line === '') {
            if (dataLines.length > 0) {
              const data = parseEventData(eventType, dataLines.join('\n'))
              if (data) onEvent(eventType, data)
            }
            eventType = 'message'
            dataLines = []
          } else if (line.startsWith('event:')) {
            eventType = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart())
          }
        }
      }
    } finally {
      setIsStreaming(false)
    }
  }

  return { streamMessage, isStreaming }
}
