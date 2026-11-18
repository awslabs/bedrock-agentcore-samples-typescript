export interface UploadFile {
  name: string
  content: string
}

export interface ArtifactFile {
  name: string
  url: string
  mimeType: string
}

// The Code Interpreter tools' inputs: executeCode has code and language, executeCommand a command.
export interface ToolInput {
  code?: string
  language?: string
  command?: string
}

export type AgentEvent =
  | { type: 'message'; data: { text: string } }
  | { type: 'tool'; data: { toolUseId: string; name: string; input: ToolInput } }
  | { type: 'tool_result'; data: { toolUseId: string; status: 'success' | 'error'; content: string } }
  | { type: 'uploading'; data: Record<string, never> }
  | { type: 'artifact'; data: ArtifactFile }
  | { type: 'error'; data: { error: string } }

export interface ToolStep {
  id: string
  name: string
  input: ToolInput
  status?: 'success' | 'error'
  output?: string
}

export type Block =
  | { type: 'text'; text: string }
  | { type: 'steps'; steps: ToolStep[] }
  | ({ type: 'artifact' } & ArtifactFile)
  | { type: 'error'; message: string }

export type Message =
  { role: 'user'; content: string; files: string[] } | { role: 'assistant'; blocks: Block[]; preparingFiles?: boolean }
