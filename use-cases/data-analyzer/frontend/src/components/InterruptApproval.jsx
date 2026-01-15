import { useState } from 'react'

export default function InterruptApproval({ interrupt, onApprove, onReject, responseType: parentResponseType }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [localResponseType, setLocalResponseType] = useState(null) // 'approved' or 'rejected'

  // Use parent response type if available (for finalized messages), otherwise use local state
  const responseType = parentResponseType || localResponseType

  const handleApprove = async () => {
    if (responseType) return
    setIsProcessing(true)
    setLocalResponseType('approved')
    await onApprove(interrupt.interrupt_id)
    // Parent component will clear interrupt state
  }

  const handleReject = async () => {
    if (responseType) return
    setIsProcessing(true)
    setLocalResponseType('rejected')
    await onReject(interrupt.interrupt_id)
    // Parent component will clear interrupt state
  }

  const toolName = interrupt.reason?.tool || 'Unknown'
  const message = interrupt.reason?.message || 'Approval required'
  const hasDetails = interrupt.reason && Object.keys(interrupt.reason).length > 0

  return (
    <div className="my-3 bg-amber-50 border-2 border-amber-400 rounded-lg p-4 shadow-sm">
      {/* Main message */}
      <div className="flex items-start gap-4">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <p className="text-amber-900 font-medium mb-3">{message}</p>

          {/* Tool details toggle */}
          {hasDetails && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-amber-700 hover:text-amber-900 mb-2 flex items-center gap-1"
            >
              <span>{isExpanded ? '▼' : '▶'}</span>
              <span>Details</span>
            </button>
          )}

          {/* Expanded details */}
          {isExpanded && hasDetails && (
            <div className="mb-3 p-2 bg-white border border-amber-200 rounded text-xs">
              <div className="font-semibold text-amber-900 mb-1">Tool: {toolName}</div>
              <pre className="text-gray-700 overflow-x-auto">
                {JSON.stringify(interrupt.reason, null, 2)}
              </pre>
            </div>
          )}

          {/* Action buttons or status */}
          {responseType ? (
            <div className={`px-4 py-2.5 rounded-lg font-medium text-sm inline-flex items-center gap-2 ${
              responseType === 'approved'
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}>
              <span>{responseType === 'approved' ? '✓' : '✕'}</span>
              <span>{responseType === 'approved' ? 'Approved' : 'Rejected'}</span>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  isProcessing
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  isProcessing
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Reject'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
