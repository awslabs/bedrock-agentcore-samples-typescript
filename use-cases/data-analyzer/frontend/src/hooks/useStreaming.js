import { useState } from 'react'

export default function useStreaming() {
  const [isStreaming, setIsStreaming] = useState(false)

  const streamMessage = async (endpoint, message, sessionId, onEvent, getValidAccessToken, files = []) => {
    setIsStreaming(true)

    try {
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      }

      if (getValidAccessToken) {
        const token = await getValidAccessToken()
        headers['Authorization'] = `Bearer ${token}`
      }

      if (sessionId) {
        headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'] = sessionId
      }

      const body = { prompt: message }
      if (files.length > 0) {
        body.files = files
      }

      let response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (response.status === 401 && getValidAccessToken) {
        const freshToken = await getValidAccessToken()
        if (!freshToken) throw new Error('Authentication failed')
        headers['Authorization'] = `Bearer ${freshToken}`
        response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let currentEventType = 'message'
        for (const line of lines) {
          if (!line.trim()) continue

          if (line.startsWith('event:')) {
            currentEventType = line.slice(6).trim()
            continue
          }

          if (line.startsWith('data:')) {
            try {
              const json = line.slice(5).trim()
              const data = JSON.parse(json)

              switch (currentEventType) {
                case 'text':
                  onEvent({ type: 'text', content: data.content })
                  break
                case 'tool':
                  onEvent({ type: 'tool', name: data.name, input: data.input, toolUseId: data.toolUseId })
                  break
                case 'tool_result':
                  onEvent({
                    type: 'tool_result',
                    toolUseId: data.toolUseId,
                    status: data.status,
                    content: data.content,
                  })
                  break
                case 'data':
                  onEvent({ type: 'data', dataType: data.type, url: data.url, mimeType: data.mimeType })
                  break
                case 'uploading':
                  onEvent({ type: 'uploading', status: data.status })
                  break
                case 'result':
                  onEvent({ type: 'result' })
                  break
                case 'error':
                  onEvent({ type: 'error', message: data.message })
                  break
              }
            } catch (err) {
              console.error('Failed to parse event:', line, err)
            }
          }
        }
      }

      setIsStreaming(false)
    } catch (error) {
      console.error('Streaming error:', error)
      setIsStreaming(false)
      throw error
    }
  }

  return { streamMessage, isStreaming }
}
