import { useState, useRef } from 'react'

const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.json', '.txt']
const MAX_FILE_SIZE_MB = 50
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

function isValidFileType(filename) {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return ALLOWED_EXTENSIONS.includes(ext)
}

export default function ChatInput({ onSend, disabled }) {
  const [input, setInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const processFiles = (files) => {
    Array.from(files).forEach((file) => {
      const validType = isValidFileType(file.name)
      const validSize = file.size <= MAX_FILE_SIZE_BYTES

      if (!validType || !validSize) {
        setSelectedFiles((prev) => [...prev, {
          name: file.name,
          content: null,
          valid: false,
          error: !validType ? 'type' : 'size'
        }])
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        setSelectedFiles((prev) => [...prev, { name: file.name, content: base64, valid: true }])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || disabled) return

    // Only send valid files
    const validFiles = selectedFiles.filter((f) => f.valid)
    onSend(input, validFiles)
    setInput('')
    setSelectedFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files?.length) processFiles(e.target.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files)
  }

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div
      className={`px-6 pt-4 pb-8 transition-all ${isDragging ? 'bg-emerald-50 border-2 border-dashed border-emerald-400 rounded-lg' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {selectedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className={`group relative flex items-center gap-1.5 text-sm rounded-full px-3 py-1.5 ${
                file.valid
                  ? 'text-gray-600 bg-gray-100'
                  : 'text-red-600 bg-red-50 border border-red-200'
              }`}
            >
              <svg
                className={`w-3.5 h-3.5 ${file.valid ? 'text-emerald-600' : 'text-red-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {file.valid ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                )}
              </svg>
              <span className="max-w-32 truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className={`ml-0.5 ${file.valid ? 'text-gray-400 hover:text-gray-600' : 'text-red-400 hover:text-red-600'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {!file.valid && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {file.error === 'size'
                    ? `File too large. Max size: ${MAX_FILE_SIZE_MB}MB`
                    : `Unsupported file type. Use: ${ALLOWED_EXTENSIONS.join(', ')}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".csv,.xlsx,.xls,.json,.txt"
          multiple
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-3 rounded-full
                   disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="Upload file"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "Agent is thinking..." : "Type your message..."}
          className="flex-1 bg-white text-gray-900 rounded-full px-5 py-3 border border-gray-300
                   focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 placeholder-gray-400
                   transition-all"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600
                   text-white px-8 py-3 rounded-full font-medium shadow-md hover:shadow-lg
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md
                   transition-all duration-200"
        >
          {disabled ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Thinking...</span>
            </span>
          ) : (
            'Send'
          )}
        </button>
      </form>
    </div>
  )
}
