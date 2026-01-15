import { useState } from 'react'

export default function ToolTag({ toolBlock }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasInput = toolBlock.input && Object.keys(toolBlock.input).length > 0
  const hasResult = toolBlock.result !== undefined

  return (
    <div className="flex flex-col my-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors text-sm w-fit ${
          toolBlock.status === 'error'
            ? 'bg-red-50 border border-red-200'
            : 'bg-amber-50 border border-amber-200'
        }`}
      >
        <span className={toolBlock.status === 'error' ? 'text-red-700' : 'text-amber-700'}>
          🔧
        </span>
        <span className={`font-medium ${toolBlock.status === 'error' ? 'text-red-900' : 'text-amber-900'}`}>
          {toolBlock.name}
        </span>
        {hasResult && (
          <span className={`text-xs ${toolBlock.status === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {toolBlock.status === 'error' ? '✗' : '✓'}
          </span>
        )}
        <span className={`text-xs ${toolBlock.status === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 ml-4 space-y-2">
          {hasInput && (
            <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
              <div className="text-gray-500 mb-1">Input:</div>
              <pre className="text-gray-700 overflow-x-auto">
                {JSON.stringify(toolBlock.input, null, 2)}
              </pre>
            </div>
          )}
          {hasResult && (
            <div className={`p-2 border rounded text-xs ${
              toolBlock.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
            }`}>
              <div className={`mb-1 ${toolBlock.status === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                Result:
              </div>
              <pre className={`overflow-x-auto whitespace-pre-wrap ${
                toolBlock.status === 'error' ? 'text-red-700' : 'text-green-700'
              }`}>
                {toolBlock.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
