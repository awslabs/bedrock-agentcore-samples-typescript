import { useState, useEffect, useRef } from 'react'
import ChatMessage from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import useStreaming from '../hooks/useStreaming'

const LOCAL_ENDPOINT = '/api/invocations'
const RUNTIME_ARN = import.meta.env.VITE_RUNTIME_ARN
const AWS_REGION = import.meta.env.VITE_AWS_REGION
const DEPLOYED_ENDPOINT = RUNTIME_ARN
  ? `https://bedrock-agentcore.${AWS_REGION}.amazonaws.com/runtimes/${encodeURIComponent(RUNTIME_ARN)}/invocations?qualifier=DEFAULT`
  : null

export default function Chat({ getValidAccessToken, onLogout }) {
  const [environment, setEnvironment] = useState('local')
  const useAuth = environment === 'deployed'
  const endpoint = environment === 'local' ? LOCAL_ENDPOINT : DEPLOYED_ENDPOINT

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

  const handleSend = async (message, files = []) => {
    const userMessage = {
      role: 'user',
      content: message,
      files: files.length > 0 ? files.map(f => f.name) : undefined,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    setTimeout(() => scrollToBottom(), 100)

    const assistantMessage = {
      role: 'assistant',
      content: '',
      contentBlocks: [],
      timestamp: new Date().toISOString()
    }
    setCurrentMessage(assistantMessage)

    const orderedBlocks = []
    let currentTextBuffer = ''

    try {
      await streamMessage(
        endpoint,
        message,
        sessionId,
        (event) => {
          switch (event.type) {
            case 'text':
              currentTextBuffer += event.content
              {
                const lastBlock = orderedBlocks[orderedBlocks.length - 1]
                if (lastBlock && lastBlock.type === 'text') {
                  lastBlock.content = currentTextBuffer
                } else {
                  orderedBlocks.push({ type: 'text', content: currentTextBuffer })
                }
              }
              setCurrentMessage(prev => ({ ...prev, contentBlocks: [...orderedBlocks] }))
              break

            case 'tool':
              currentTextBuffer = ''
              orderedBlocks.push({
                type: 'tool',
                toolBlock: { name: event.name, input: event.input, toolUseId: event.toolUseId }
              })
              setCurrentMessage(prev => ({ ...prev, contentBlocks: [...orderedBlocks] }))
              break

            case 'tool_result':
              {
                const toolBlock = orderedBlocks.find(b => b.type === 'tool' && b.toolBlock.toolUseId === event.toolUseId)
                if (toolBlock) {
                  toolBlock.toolBlock.result = event.content
                  toolBlock.toolBlock.status = event.status
                  setCurrentMessage(prev => ({ ...prev, contentBlocks: [...orderedBlocks] }))
                }
              }
              break

            case 'uploading':
              orderedBlocks.push({ type: 'uploading' })
              setCurrentMessage(prev => ({ ...prev, contentBlocks: [...orderedBlocks] }))
              break

            case 'data':
              const uploadingIndex = orderedBlocks.findIndex(b => b.type === 'uploading')
              if (uploadingIndex !== -1) orderedBlocks.splice(uploadingIndex, 1)
              orderedBlocks.push({
                type: 'data',
                dataBlock: { url: event.url, mimeType: event.mimeType, dataType: event.dataType }
              })
              setCurrentMessage(prev => ({ ...prev, contentBlocks: [...orderedBlocks] }))
              break

            case 'result':
              const remainingUploadingIndex = orderedBlocks.findIndex(b => b.type === 'uploading')
              if (remainingUploadingIndex !== -1) orderedBlocks.splice(remainingUploadingIndex, 1)
              setMessages(prev => [...prev, { ...assistantMessage, contentBlocks: [...orderedBlocks], content: currentTextBuffer }])
              setCurrentMessage(null)
              break

            case 'error':
              setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${event.message}`, timestamp: new Date().toISOString() }])
              setCurrentMessage(null)
              break
          }
        },
        useAuth ? getValidAccessToken : null,
        files
      )
    } catch (err) {
      console.error('Streaming error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}`, timestamp: new Date().toISOString() }])
      setCurrentMessage(null)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Data Analyzer</h1>
              <p className="text-sm text-gray-600">Analyze data in a secure sandbox using AgentCore Code Interpreter</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="local">Local (localhost:8080)</option>
                <option value="deployed">Deployed (AgentCore)</option>
              </select>
              <button
                onClick={onLogout}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
          {messages.length === 0 && !currentMessage && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Data Analyzer</h2>
              <p className="text-gray-600 max-w-md mx-auto">Let the agent analyze data in a secure isolated sandbox environment using AgentCore Code Interpreter.</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <ChatMessage
              key={index}
              message={msg}
              isStreaming={false}
            />
          ))}

          {currentMessage && (
            <ChatMessage
              message={currentMessage}
              isStreaming={isStreaming}
            />
          )}

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
