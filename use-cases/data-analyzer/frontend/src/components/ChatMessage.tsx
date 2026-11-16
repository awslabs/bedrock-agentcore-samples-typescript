import type { ReactElement } from 'react'
import ReactMarkdown, { type Components, type Options } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ArtifactFile, Message } from '../types'
import ToolSteps from './ToolSteps'

// Models write "~$900K" for "about", which GFM would otherwise read as strikethrough.
const remarkPlugins: Options['remarkPlugins'] = [[remarkGfm, { singleTilde: false }]]

const markdownComponents: Components = {
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  ),
}

function fileExtension(name: string): string {
  return name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toUpperCase() : 'FILE'
}

function OpenIcon(): ReactElement {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  )
}

function Artifact({ artifact }: { artifact: ArtifactFile }): ReactElement {
  if (artifact.mimeType.startsWith('image/')) {
    return (
      <figure className="rounded-xl border border-gray-200 overflow-hidden">
        <a href={artifact.url} target="_blank" rel="noopener noreferrer" className="block bg-white">
          <img src={artifact.url} alt={artifact.name} className="w-full h-auto" />
        </a>
        <figcaption className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 pl-3.5 pr-2 py-1.5 text-xs text-gray-500">
          <span className="truncate">{artifact.name}</span>
          <a
            href={artifact.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-gray-600 hover:bg-gray-200/60 hover:text-gray-900 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <OpenIcon />
            Open
          </a>
        </figcaption>
      </figure>
    )
  }

  return (
    <a
      href={artifact.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-gray-200 px-3.5 py-3 hover:bg-gray-50 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <span className="shrink-0 grid place-items-center h-9 w-9 rounded-lg bg-emerald-50 text-[10px] font-semibold tracking-wide text-emerald-700">
        {fileExtension(artifact.name)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{artifact.name}</span>
      <span className="shrink-0 text-gray-400">
        <OpenIcon />
      </span>
    </a>
  )
}

function UserMessage({ message }: { message: Extract<Message, { role: 'user' }> }): ReactElement {
  return (
    <div className="flex flex-col items-end gap-1.5">
      {message.files.length > 0 && (
        <div className="flex flex-wrap justify-end gap-1.5">
          {message.files.map((fileName, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600"
            >
              <span className="font-semibold text-emerald-700">{fileExtension(fileName)}</span>
              <span className="max-w-48 truncate">{fileName}</span>
            </span>
          ))}
        </div>
      )}
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gray-100 px-4 py-2.5 text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap break-words">
        {message.content}
      </div>
    </div>
  )
}

function Status({ label }: { label: string }): ReactElement {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500" role="status">
      <span className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 border-t-emerald-600 animate-spin" />
      {label}
    </div>
  )
}

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps): ReactElement {
  if (message.role === 'user') return <UserMessage message={message} />

  const lastBlock = message.blocks.at(-1)
  const isWriting = lastBlock?.type === 'text'
  const isRunningStep = lastBlock?.type === 'steps' && lastBlock.steps.some((step) => step.output === undefined)
  let status: string | null = null
  if (isStreaming && message.preparingFiles) status = 'Preparing files…'
  else if (isStreaming && !isWriting && !isRunningStep) status = 'Thinking…'

  return (
    <div className="space-y-4">
      {message.blocks.map((block, index) => {
        if (block.type === 'text') {
          return (
            <div
              key={index}
              className="prose prose-gray max-w-none text-[15px] leading-relaxed prose-p:my-2 prose-headings:mt-5 prose-headings:mb-2 prose-li:my-0.5 prose-table:my-3 prose-th:text-left prose-code:rounded-sm prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.875em] prose-code:font-medium prose-code:before:content-none prose-code:after:content-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            >
              {/* Model output can echo image URLs planted in the analysed data; charts arrive as artifacts. */}
              <ReactMarkdown remarkPlugins={remarkPlugins} components={markdownComponents} disallowedElements={['img']}>
                {block.text}
              </ReactMarkdown>
            </div>
          )
        }
        if (block.type === 'steps') {
          return <ToolSteps key={index} steps={block.steps} isStreaming={isStreaming} />
        }
        if (block.type === 'artifact') {
          return <Artifact key={index} artifact={block} />
        }
        if (block.type === 'error') {
          return (
            <div
              key={index}
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 break-words"
            >
              <p className="font-medium">Something went wrong</p>
              <p className="mt-0.5 text-red-700">{block.message}</p>
            </div>
          )
        }
        return null
      })}
      {status && <Status label={status} />}
    </div>
  )
}
