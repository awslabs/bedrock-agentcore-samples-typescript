import { useState, useEffect, useRef } from 'react'
import ChatMessage from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import useStreaming from '../hooks/useStreaming'

export default function Chat({ endpoint, getAccessToken, onSignOut }) {
  const { streamMessage, isStreaming } = useStreaming()

  const [messages, setMessages] = useState([])
  const [currentMessage, setCurrentMessage] = useState(null)
  const [sessionId] = useState(() => crypto.randomUUID())

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  useEffect(() => {
    scrollToBottomIfNeeded()
  }, [messages, currentMessage])

  const isNearBottom = () => {
    if (!chatContainerRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    return scrollHeight - scrollTop - clientHeight < 100
  }

  const scrollToBottomIfNeeded = () => {
    if (isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async (prompt, files = []) => {
    const userMessage = {
      role: 'user',
      content: prompt,
      files: files.length > 0 ? files.map((f) => f.name) : undefined,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setTimeout(() => scrollToBottom(), 100)

    const assistantMessage = { role: 'assistant', contentBlocks: [], timestamp: new Date().toISOString() }
    setCurrentMessage(assistantMessage)

    const blocks = []
    const render = () => setCurrentMessage((prev) => ({ ...prev, contentBlocks: [...blocks] }))
    const removeUploadingBlock = () => {
      const index = blocks.findIndex((b) => b.type === 'uploading')
      if (index !== -1) blocks.splice(index, 1)
    }

    const handleEvent = (eventType, data) => {
      switch (eventType) {
        case 'message': {
          const lastBlock = blocks[blocks.length - 1]
          if (lastBlock?.type === 'text') {
            blocks[blocks.length - 1] = { ...lastBlock, content: lastBlock.content + data.text }
          } else {
            blocks.push({ type: 'text', content: data.text })
          }
          break
        }
        case 'tool':
          blocks.push({ type: 'tool', toolBlock: { name: data.name, input: data.input, toolUseId: data.toolUseId } })
          break
        case 'tool_result': {
          const index = blocks.findIndex((b) => b.type === 'tool' && b.toolBlock.toolUseId === data.toolUseId)
          if (index !== -1) {
            const toolBlock = { ...blocks[index].toolBlock, result: data.content, status: data.status }
            blocks[index] = { type: 'tool', toolBlock }
          }
          break
        }
        case 'uploading':
          blocks.push({ type: 'uploading' })
          break
        case 'artifact':
          removeUploadingBlock()
          blocks.push({ type: 'artifact', artifact: { name: data.name, url: data.url, mimeType: data.mimeType } })
          break
        case 'error':
          removeUploadingBlock()
          blocks.push({ type: 'error', content: data.error })
          break
      }
      render()
    }

    try {
      await streamMessage({ endpoint, prompt, files, sessionId, getAccessToken, onEvent: handleEvent })
    } catch (err) {
      console.error('Streaming error:', err)
      blocks.push({ type: 'error', content: err.message })
    }
    removeUploadingBlock()
    setMessages((prev) => [...prev, { ...assistantMessage, contentBlocks: [...blocks] }])
    setCurrentMessage(null)
  }

  return (
    <div className="flex flex-col h-dvh bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Data Analyzer</h1>
              <p className="hidden sm:block text-sm text-gray-600">
                Analyze data in a secure sandbox using AgentCore Code Interpreter
              </p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                {onSignOut ? 'AgentCore Runtime' : 'Local agent'}
              </span>
              {onSignOut && (
                <button onClick={onSignOut} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {messages.length === 0 && !currentMessage && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Data Analyzer</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Upload a CSV, Excel, JSON or text file and ask a question. The agent analyzes it in an isolated sandbox
                using AgentCore Code Interpreter.
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <ChatMessage key={index} message={msg} isStreaming={false} />
          ))}

          {currentMessage && <ChatMessage message={currentMessage} isStreaming={isStreaming} />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-5xl mx-auto">
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
      </div>
    </div>
  )
}
