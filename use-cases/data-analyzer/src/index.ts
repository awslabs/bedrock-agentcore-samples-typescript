import 'dotenv/config'
import { Agent, BedrockModel } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { CodeInterpreterTools } from 'bedrock-agentcore/experimental/code-interpreter/strands'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'

// Request schema
const requestSchema = z.object({
  prompt: z.string(),
  files: z.array(z.object({ name: z.string(), content: z.string() })).optional(),
})
type Request = z.infer<typeof requestSchema>

// Configuration
const BEDROCK_REGION = process.env['BEDROCK_REGION'] ?? 'us-east-1'
const BEDROCK_MODEL_ID = process.env['BEDROCK_MODEL_ID'] ?? 'global.anthropic.claude-haiku-4-5-20251001-v1:0'
const ARTIFACT_BUCKET = process.env['ARTIFACT_BUCKET']

// Clients
const s3 = new S3Client({})
const codeInterpreter = new CodeInterpreterTools({
  ...(process.env['AWS_REGION'] && { region: process.env['AWS_REGION'] }),
  ...(process.env['CODE_INTERPRETER_ID'] && { identifier: process.env['CODE_INTERPRETER_ID'] }),
})

// Track artifacts to avoid duplicate uploads and exclude user-uploaded files from output
const uploadedArtifacts = new Set<string>()
const userUploadedFiles = new Set<string>()

// Agent
const agent = new Agent({
  model: new BedrockModel({ modelId: BEDROCK_MODEL_ID, region: BEDROCK_REGION }),
  tools: codeInterpreter.tools,
  systemPrompt: `## Instructions
You are a helpful data analyst with access to a secure sandbox with internet access and three tools:
- executeCode: Run Python, JavaScript, or TypeScript code
- fileOperations: Read, write, list, or remove files in the sandbox
- executeCommand: Execute shell commands

You write and execute code on data to help users create artifacts, answer questions etc. 

## Info
- Pre-installed libraries: pandas, numpy, matplotlib, plotly, scipy, scikit-learn.
- Internet access: Fetch data from URLs using requests or urllib.
- Use matplotlib to create appealing visualizations. Prefer using pre-installed libraries—avoid installing additional packages unless necessary.
- Session state persists across invocations—variables and files remain available. Use print() to return results.
- User-uploaded files are stored in the "artifacts/" directory. When creating output artifacts (visualizations, reports, processed data), also save them to "artifacts/". The directory may not exist by default—create it first with os.makedirs('artifacts', exist_ok=True).

## Rules
- Always save charts and visualizations as PNG unless the user requests a different format.
- Always use unique, descriptive names for output files (e.g., sales_bar_chart.png, monthly_revenue.png). Never overwrite existing files—always create new files with different names. When modifying data, save to a new file with a descriptive name.
- Never mention the location of the stored artefacts to the user.
- Responses should clear and to the point - no overly long and complex answers
- The users are not engineers, so avoid technical and code-related information in the responses unless the user requests differently.
- Keep the code simple.`,
})

// Upload new/changed artifacts from sandbox to S3
async function uploadArtifacts(sessionId: string): Promise<string[]> {
  if (!ARTIFACT_BUCKET) return []

  const client = codeInterpreter.getClient()
  const listing = await client.executeCommand({ command: 'ls -1 artifacts/ 2>/dev/null || true' })
  const files = listing
    .trim()
    .split(/\r?\n/)
    .map((f) => f.trim())
    .filter(Boolean)
  if (!files.length) return []

  const uploaded: string[] = []
  for (const file of files) {
    if (userUploadedFiles.has(file)) continue
    if (uploadedArtifacts.has(file)) continue

    let content = await client.readFiles({ paths: [`artifacts/${file}`] })

    // Workaround: readFiles may fail for newly created files, use executeCode as fallback
    if (content.startsWith('Error')) {
      const result = await client.executeCode({
        code: `import base64\nwith open('artifacts/${file}', 'rb') as f: print(base64.b64encode(f.read()).decode())`,
        language: 'python',
      })
      if (result.startsWith('Error') || !result.trim()) continue
      content = JSON.stringify({ blob: result.trim() })
    }

    // Parse content (JSON with blob/text, or plain text)
    let buffer: Buffer
    try {
      const parsed = JSON.parse(content)
      buffer = parsed.blob ? Buffer.from(parsed.blob, 'base64') : Buffer.from(parsed.text ?? content, 'utf-8')
    } catch {
      buffer = Buffer.from(content, 'utf-8')
    }

    await s3.send(new PutObjectCommand({ Bucket: ARTIFACT_BUCKET, Key: `${sessionId}/${file}`, Body: buffer }))
    uploadedArtifacts.add(file)
    uploaded.push(`${sessionId}/${file}`)
  }
  return uploaded
}

// Generate presigned URL for S3 object
async function getPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: ARTIFACT_BUCKET, Key: key })
  return getSignedUrl(s3, command, { expiresIn: 3600 })
}

// App
const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request: Request, context) {
      // Write uploaded files to artifacts/ and prepend filenames to prompt
      let prompt = request.prompt
      if (request.files?.length) {
        const client = codeInterpreter.getClient()
        await client.writeFiles({
          files: request.files.map((f) => ({
            path: `artifacts/${f.name}`,
            content: Buffer.from(f.content, 'base64').toString('utf-8'),
          })),
        })
        // Track uploaded filenames so we don't return them as output artifacts
        request.files.forEach((f) => userUploadedFiles.add(f.name))
        const filenames = request.files.map((f) => `artifacts/${f.name}`).join(', ')
        prompt = `Files uploaded to artifacts/ directory: ${filenames}\n\n${request.prompt}`
      }

      try {
        for await (const event of agent.stream(prompt)) {
          // Text streaming
          if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
            yield { event: 'text', data: { content: event.delta.text } }
          }

          // Tool starting
          if (event.type === 'beforeToolCallEvent') {
            yield {
              event: 'tool',
              data: {
                name: event.toolUse.name,
                input: event.toolUse.input,
                toolUseId: event.toolUse.toolUseId,
              },
            }
          }

          // Tool completed
          if (event.type === 'afterToolCallEvent') {
            const content = event.result.content
              .map((c) => ('text' in c && c.text ? c.text : JSON.stringify(c)))
              .join('\n')
            yield {
              event: 'tool_result',
              data: {
                toolUseId: event.result.toolUseId,
                status: event.result.status,
                content,
              },
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[Agent Error]', message)
        yield { event: 'error', data: { message } }
        return
      }

      // Check for new artifacts and upload to S3
      if (ARTIFACT_BUCKET) {
        const client = codeInterpreter.getClient()
        const listing = await client.executeCommand({ command: 'ls -1 artifacts/ 2>/dev/null || true' })
        const files = listing
          .trim()
          .split(/\r?\n/)
          .map((f) => f.trim())
          .filter(Boolean)
        const newFiles = files.filter((f) => !userUploadedFiles.has(f) && !uploadedArtifacts.has(f))

        if (newFiles.length > 0) {
          yield { event: 'uploading', data: { status: 'started' } }
          const uploaded = await uploadArtifacts(context.sessionId)
          for (const key of uploaded) {
            const url = await getPresignedUrl(key)
            const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(key)

            let mimeType = 'application/octet-stream'
            if (key.endsWith('.png')) mimeType = 'image/png'
            else if (key.endsWith('.jpg') || key.endsWith('.jpeg')) mimeType = 'image/jpeg'

            yield { event: 'data', data: { type: isImage ? 'image' : 'file', url, mimeType } }
          }
        }
      }

      yield { event: 'result', data: {} }
    },
  },
})

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await codeInterpreter.stopSession()
  process.exit(0)
})
process.on('SIGINT', async () => {
  await codeInterpreter.stopSession()
  process.exit(0)
})

app.run()
