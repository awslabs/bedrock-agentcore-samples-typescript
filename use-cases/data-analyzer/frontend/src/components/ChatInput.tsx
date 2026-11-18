import { useState, useRef, type ChangeEvent, type DragEvent, type FormEvent, type ReactElement } from 'react'
import type { UploadFile } from '../types'

const allowedExtensions = ['.csv', '.xlsx', '.xls', '.json', '.txt']
const maxFiles = 5
const maxFileSizeMb = 10
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024

type SelectedFile = (UploadFile & { valid: true }) | { name: string; valid: false; error: 'type' | 'size' }

interface ChatInputProps {
  onSend: (prompt: string, files: UploadFile[]) => void
  disabled: boolean
}

// The agent accepts only plain file names, so replace anything else (brackets, accents, ...) with underscores.
function toSafeFileName(filename: string): string {
  return filename.replace(/[^\w .-]/g, '_').replace(/^[^\w]+/, '')
}

function isValidFileType(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return allowedExtensions.includes(ext)
}

export default function ChatInput({ onSend, disabled }: ChatInputProps): ReactElement {
  const [input, setInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = (files: FileList): void => {
    Array.from(files)
      .slice(0, maxFiles - selectedFiles.length)
      .forEach((file) => {
        const validType = isValidFileType(file.name)
        const validSize = file.size <= maxFileSizeBytes

        if (!validType || !validSize) {
          setSelectedFiles((prev) => [
            ...prev,
            {
              name: file.name,
              valid: false,
              error: !validType ? 'type' : 'size',
            },
          ])
          return
        }

        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          setSelectedFiles((prev) => [...prev, { name: toSafeFileName(file.name), content: base64, valid: true }])
        }
        reader.readAsDataURL(file)
      })
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (!input.trim() || disabled) return

    const validFiles = selectedFiles.filter((f) => f.valid)
    onSend(input, validFiles)
    setInput('')
    setSelectedFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files?.length) processFiles(e.target.files)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files)
  }

  const removeFile = (index: number): void => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div
      className="px-3 sm:px-6 pt-2 pb-3 sm:pb-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <form
        onSubmit={handleSubmit}
        className={`rounded-2xl border bg-white shadow-xs transition-colors focus-within:border-gray-400 ${
          isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'
        }`}
      >
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {selectedFiles.map((file, index) => (
              <span
                key={index}
                className={`inline-flex items-center gap-1.5 rounded-lg border py-1 pl-2.5 pr-1 text-xs ${
                  file.valid ? 'border-gray-200 text-gray-700' : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                <span className="max-w-40 truncate">{file.name}</span>
                {!file.valid && (
                  <span className="font-medium">
                    {file.error === 'size' ? `over ${maxFileSizeMb} MB` : 'unsupported type'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${file.name}`}
                  className="rounded-sm p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 p-1.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept={allowedExtensions.join(',')}
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={selectedFiles.length >= maxFiles}
            aria-label="Attach files"
            title={
              selectedFiles.length >= maxFiles
                ? `Up to ${maxFiles} files per message`
                : `Attach up to ${maxFiles} files of ${maxFileSizeMb} MB`
            }
            className="shrink-0 grid place-items-center h-10 w-10 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data…"
            aria-label="Message"
            className="flex-1 min-w-0 bg-transparent px-1.5 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            aria-label="Send"
            className="shrink-0 grid place-items-center h-10 w-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out disabled:bg-gray-100 disabled:text-gray-400 disabled:active:scale-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-6 6m6-6l6 6" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
