import { useId, useState, type ReactElement } from 'react'
import type { ToolStep } from '../types'

interface ParsedOutput {
  printed: string
  error: string | null
  traceback?: string
}

const languages: Record<string, string> = { python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript' }

function stepLabel({ name, input }: ToolStep): string {
  if (name === 'executeCode') return languages[input.language ?? 'python'] ?? 'code'
  if (name === 'executeCommand') return 'a shell command'
  if (name === 'fileOperations') return 'file operations'
  return name
}

function stepSource({ name, input }: ToolStep): string {
  if (name === 'executeCode') return input.code ?? ''
  if (name === 'executeCommand') return input.command ?? ''
  return JSON.stringify(input, null, 2)
}

// Code Interpreter returns failed runs as text with status "success": an SDK "Error: …" or a Python exception.
// IPython prints a traceback after a line of dashes; what comes before it is the code's own output.
function parseOutput({ status, output = '' }: ToolStep): ParsedOutput {
  const text = output.trim()
  const lastLine = text.split('\n').at(-1) ?? ''
  const failed = status === 'error' || text.startsWith('Error:') || /^[A-Z]\w*(Error|Exception)\b/.test(lastLine)
  const tracebackStart = text.search(/^-{20,}\n.*Traceback \(most recent call last\)/m)
  if (!failed || tracebackStart === -1) return { printed: text, error: failed ? lastLine : null }
  return {
    printed: text.slice(0, tracebackStart).trim(),
    error: lastLine,
    traceback: text.slice(tracebackStart).replace(/^-+\n/, ''),
  }
}

function Step({ step }: { step: ToolStep }): ReactElement {
  const { printed, error, traceback } = parseOutput(step)
  const isDone = step.output !== undefined

  return (
    <li className="rounded-xl border border-gray-200 overflow-hidden">
      <pre className="px-3.5 py-3 bg-gray-50 text-gray-800 text-xs leading-5 font-mono overflow-auto max-h-72">
        {stepSource(step)}
      </pre>
      {isDone && (
        <div className="border-t border-gray-200 px-3.5 py-2.5 space-y-1.5 text-xs">
          <p className={`font-medium ${error ? 'text-red-700' : 'text-gray-500'}`}>{error ?? 'Output'}</p>
          {(printed || !error) && (
            <pre className="text-gray-600 leading-5 font-mono overflow-auto max-h-72">{printed || 'No output'}</pre>
          )}
          {traceback && (
            <details>
              <summary className="text-gray-500 hover:text-gray-800 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500">
                Traceback
              </summary>
              <pre className="mt-1.5 text-gray-600 leading-5 font-mono overflow-auto max-h-72">{traceback}</pre>
            </details>
          )}
        </div>
      )}
    </li>
  )
}

interface ToolStepsProps {
  steps: ToolStep[]
  isStreaming: boolean
}

export default function ToolSteps({ steps, isStreaming }: ToolStepsProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  const runningStep = isStreaming && steps.find((step) => step.output === undefined)
  const failedCount = steps.filter((step) => parseOutput(step).error).length
  const summary = runningStep
    ? `Running ${stepLabel(runningStep)}…`
    : `Ran ${[...new Set(steps.map(stepLabel))].join(' and ')}`
  const details = [steps.length > 1 && `${steps.length} steps`, failedCount > 0 && `${failedCount} failed`]
    .filter(Boolean)
    .join(' · ')

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        {runningStep ? (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 border-t-emerald-600 animate-spin" />
        ) : (
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l-3 3 3 3m8-6l3 3-3 3m-5 4l2-14"
            />
          </svg>
        )}
        <span className="font-medium">{summary}</span>
        {details && <span className={failedCount > 0 ? 'text-red-700' : 'text-gray-500'}>{details}</span>}
        <svg
          className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ease-out motion-reduce:transition-none ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {isOpen && (
        <ol id={panelId} className="mt-2 space-y-2">
          {steps.map((step) => (
            <Step key={step.id} step={step} />
          ))}
        </ol>
      )}
    </div>
  )
}
