import { useState, useEffect, useRef } from 'react'
import ChatMessage from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import useStreaming from '../hooks/useStreaming'

export default function Chat({ endpoint, getAccessToken, onSignOut }) {
  const { streamMessage, isStreaming } = useStreaming()

  const [messages, setMessages] = useState([])
  const [currentMessage, setCurrentMessage] = useState(null)
  const [sessionId] = useState(() => crypto.randomUUID())

  const scrollContainerRef = useRef(null)
  const contentRef = useRef(null)
  const followOutput = useRef(true)

  // Stay at the bottom while text streams in and charts load, unless the reader has scrolled up.
  useEffect(() => {
    const container = scrollContainerRef.current
    const observer = new ResizeObserver(() => {
      if (followOutput.current) container.scrollTop = container.scrollHeight
    })
    observer.observe(contentRef.current)
    return () => observer.disconnect()
  }, [])

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    followOutput.current = scrollHeight - scrollTop - clientHeight < 80
  }

  const handleSend = async (prompt, files = []) => {
    followOutput.current = true
    setMessages((prev) => [...prev, { role: 'user', content: prompt, files: files.map((file) => file.name) }])

    // Consecutive tool calls are grouped into one "steps" block, so the answer isn't broken up by the agent's work.
    const blocks = []
    let preparingFiles = false
    const render = () => setCurrentMessage({ role: 'assistant', blocks: [...blocks], preparingFiles })
    render()

    const handleEvent = (eventType, data) => {
      const lastBlock = blocks.at(-1)
      switch (eventType) {
        case 'message':
          if (lastBlock?.type === 'text') lastBlock.text += data.text
          else blocks.push({ type: 'text', text: data.text })
          break
        case 'tool': {
          const step = { id: data.toolUseId, name: data.name, input: data.input }
          if (lastBlock?.type === 'steps') lastBlock.steps.push(step)
          else blocks.push({ type: 'steps', steps: [step] })
          break
        }
        case 'tool_result': {
          const step = blocks.flatMap((block) => block.steps ?? []).find((s) => s.id === data.toolUseId)
          if (step) Object.assign(step, { status: data.status, output: data.content })
          break
        }
        case 'uploading':
          preparingFiles = true
          break
        case 'artifact':
          blocks.push({ type: 'artifact', name: data.name, url: data.url, mimeType: data.mimeType })
          break
        case 'error':
          blocks.push({ type: 'error', message: data.error })
          break
      }
      render()
    }

    try {
      await streamMessage({ endpoint, prompt, files, sessionId, getAccessToken, onEvent: handleEvent })
    } catch (err) {
      console.error('Streaming error:', err)
      blocks.push({ type: 'error', message: err.message })
    }
    if (blocks.length > 0) setMessages((prev) => [...prev, { role: 'assistant', blocks }])
    setCurrentMessage(null)
  }

  return (
    <div className="flex flex-col h-dvh bg-white">
      <header className="shrink-0 border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-baseline gap-3">
            <h1 className="text-base font-semibold text-gray-900">Data Analyzer</h1>
            <p className="hidden sm:block text-sm text-gray-500 truncate">
              Python in an AgentCore Code Interpreter sandbox
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
              {onSignOut ? 'AgentCore Runtime' : 'Local agent'}
            </span>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-sm text-gray-600 hover:text-gray-900 rounded-md px-2 py-1 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <div ref={contentRef} className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
          {messages.length === 0 && !currentMessage && (
            <div className="pt-16 sm:pt-24 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">What would you like to know?</h2>
              <p className="mt-3 text-gray-600 max-w-md mx-auto leading-relaxed">
                Attach a CSV, Excel, JSON or text file and ask a question. The agent answers by running Python in an
                isolated AgentCore Code Interpreter sandbox.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}

          {currentMessage && <ChatMessage message={currentMessage} isStreaming />}
        </div>
      </main>

      <footer className="shrink-0">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
      </footer>
    </div>
  )
}
