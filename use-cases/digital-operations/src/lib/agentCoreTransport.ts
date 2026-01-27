/* eslint-disable no-undef */
import type { ChatTransport, UIMessage, UIMessageChunk, ChatRequestOptions } from 'ai'
import { getAgentCoreUrl, getAgentCoreHeaders } from './agentCoreClient'

/**
 * Custom transport for AWS Bedrock AgentCore Runtime that handles UI message streams
 * without relying on the x-vercel-ai-ui-message-stream header (which AgentCore doesn't expose)
 */
export class AgentCoreChatTransport implements ChatTransport<UIMessage> {
  async sendMessages(
    options: {
      chatId: string
      messages: UIMessage[]
      trigger: 'submit-message' | 'regenerate-message'
      messageId: string | undefined
      abortSignal: AbortSignal | undefined
    } & ChatRequestOptions
  ): Promise<ReadableStream<UIMessageChunk>> {
    const agentCoreUrl = getAgentCoreUrl()
    const headers = await getAgentCoreHeaders()

    // Type guard for body with chatSessionId
    const body = options.body as { chatSessionId?: string } | undefined

    const response = await fetch(agentCoreUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        // Pass chatSessionId as a custom header if available in body
        // AWS requires custom headers to follow the pattern: X-Amzn-Bedrock-AgentCore-Runtime-Custom-*
        ...(body?.chatSessionId && {
          'X-Amzn-Bedrock-AgentCore-Runtime-Custom-Chat-Session-Id': body.chatSessionId,
        }),
      },
      body: JSON.stringify({
        id: options.chatId,
        messages: options.messages,
        trigger: options.trigger === 'submit-message' ? 'submit' : 'regenerate',
        messageId: options.messageId,
        // Include any additional body parameters (like modelId, chatSessionId)
        ...options.body,
      }),
      signal: options.abortSignal,
    })

    if (!response.ok) {
      throw new Error(`AgentCore request failed: ${response.status} ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    // Parse Server-Sent Events stream into UIMessageChunk objects
    const textStream = response.body.pipeThrough(new TextDecoderStream())

    return new ReadableStream({
      async start(controller) {
        const reader = textStream.getReader()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              controller.close()
              break
            }

            buffer += value
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()

                if (data === '[DONE]') {
                  continue
                }

                try {
                  const chunk = JSON.parse(data) as UIMessageChunk
                  controller.enqueue(chunk)
                } catch (e) {
                  console.error('Failed to parse SSE data:', data, e)
                }
              }
            }
          }
        } catch (error) {
          controller.error(error)
        }
      },
    })
  }

  // Reconnection support (returns null as not supported for AgentCore)
  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    // AgentCore doesn't support reconnection
    return null
  }
}
