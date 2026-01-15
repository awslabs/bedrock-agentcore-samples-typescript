import ToolTag from './ToolTag'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ChatMessage({ message, isStreaming }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
            : 'bg-white text-gray-800 rounded-bl-none border border-gray-200 shadow-sm'
        }`}
      >
        {/* Content */}
        <div className="text-sm leading-relaxed">
          {/* Render ordered content blocks for assistant */}
          {!isUser && message.contentBlocks && message.contentBlocks.length > 0 ? (
            <div className="space-y-2">
              {message.contentBlocks.map((block, index) => {
                if (block.type === 'text') {
                  const isLastBlock = index === message.contentBlocks.length - 1
                  return (
                    <div key={`text-${index}`} className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-table:my-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
                      {isStreaming && isLastBlock && (
                        <span className="inline-block ml-0.5 text-emerald-600 animate-cursor-blink">
                          ▋
                        </span>
                      )}
                    </div>
                  )
                } else if (block.type === 'sub_text') {
                  return (
                    <div key={`sub-text-${index}`} className="ml-8 relative">
                      <div className="absolute left-[-1rem] top-0 bottom-0 w-px bg-blue-300"></div>
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-table:my-2 text-gray-700">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
                      </div>
                    </div>
                  )
                } else if (block.type === 'tool') {
                  if (block.toolBlock.isSubAgent) {
                    return (
                      <div key={`tool-${block.toolBlock.toolUseId}`} className="ml-8 relative">
                        <div className="absolute left-[-1rem] top-0 bottom-0 w-px bg-blue-300"></div>
                        <ToolTag toolBlock={block.toolBlock} />
                      </div>
                    )
                  }
                  return (
                    <ToolTag
                      key={`tool-${block.toolBlock.toolUseId}`}
                      toolBlock={block.toolBlock}
                    />
                  )
                } else if (block.type === 'uploading') {
                  return (
                    <div key={`uploading-${index}`} className="my-2 flex items-center gap-2 text-sm text-gray-500">
                      <svg className="animate-spin h-4 w-4 text-emerald-600" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Preparing artifacts...</span>
                    </div>
                  )
                } else if (block.type === 'data') {
                  if (block.dataBlock.dataType === 'image') {
                    return (
                      <div key={`data-${index}`} className="my-2">
                        <img
                          src={block.dataBlock.url}
                          alt="Generated visualization"
                          className="max-w-full rounded-lg shadow-md"
                        />
                      </div>
                    )
                  }
                  // Non-image files as download links
                  return (
                    <div key={`data-${index}`} className="my-2">
                      <a
                        href={block.dataBlock.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span>📄</span>
                        <span className="text-sm text-gray-700">Download file</span>
                      </a>
                    </div>
                  )
                }
                return null
              })}
            </div>
          ) : (
            <>
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
              {message.files?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.files.map((filename, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 text-xs bg-emerald-700/50 text-emerald-100 rounded-full px-2 py-0.5"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="max-w-24 truncate">{filename}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-[10px] mt-1.5 ${isUser ? 'text-emerald-100' : 'text-gray-400'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
