import { Agent, BedrockModel } from '@strands-agents/sdk'
import { CodeInterpreterTools } from 'bedrock-agentcore/experimental/code-interpreter/strands'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'

const region = process.env['AWS_REGION'] ?? 'us-east-1'
const artifactBucket = process.env['ARTIFACT_BUCKET']
const codeInterpreterId = process.env['CODE_INTERPRETER_ID']

const maxFiles = 5
const maxFileBytes = 10 * 1024 * 1024
// Files travel base64-encoded in the JSON body (a third larger); AgentCore Runtime accepts payloads up to 100 MB.
const maxBase64Length = Math.ceil(maxFileBytes / 3) * 4
const maxRequestBytes = maxFiles * maxBase64Length + 1024 * 1024

const requestSchema = z.object({
  prompt: z.string().min(1),
  files: z
    .array(
      z.object({
        name: z
          .string()
          .max(100)
          .regex(/^[\w][\w .-]*$/, 'File names may contain only letters, digits, spaces, dots, dashes and underscores'),
        content: z.base64().max(maxBase64Length, 'Files may be up to 10 MB'),
      })
    )
    .max(maxFiles)
    .optional(),
})

const systemPrompt = `You are a data analyst. You write and run Python code in a secure sandbox to answer questions
about the user's data and to create charts, reports and processed files.

- Uploaded files are in the "uploads/" directory.
- Save every file the user should see (charts, reports, processed data) to "outputs/". Create it first with
  os.makedirs('outputs', exist_ok=True). Use unique, descriptive file names and never overwrite a file.
- Save charts as PNG unless the user asks for another format. Use matplotlib and make them clear and good-looking.
- Pre-installed libraries: pandas, numpy, matplotlib, seaborn, plotly, scipy, scikit-learn, openpyxl, xlrd. The sandbox
  has no internet access, so don't install packages or fetch URLs.
- Each request runs in a fresh sandbox with the uploaded files in "uploads/", so reload the data you need. Use
  print() to see results.
- Your readers are not engineers: answer briefly and clearly, without code or technical detail unless asked.
- The files you save in "outputs/" are shown to the user automatically below your answer. Never mention file names or
  paths, and never put images or links in your answer.`

const mimeTypes: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  csv: 'text/csv',
  json: 'application/json',
  txt: 'text/plain',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function mimeTypeOf(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  return mimeTypes[extension] ?? 'application/octet-stream'
}

interface Session {
  agent: Agent
  codeInterpreter: CodeInterpreterTools
  // Uploaded files by name, written into every request's sandbox
  files: Map<string, string>
  busy: boolean
}

const s3 = new S3Client({ region })
const sessions = new Map<string, Session>()

function getSession(sessionId: string): Session {
  const existing = sessions.get(sessionId)
  if (existing) return existing

  const codeInterpreter = new CodeInterpreterTools({
    region,
    ...(codeInterpreterId && { identifier: codeInterpreterId }),
  })
  const session: Session = {
    agent: new Agent({
      model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region, maxTokens: 8192 }),
      systemPrompt,
      tools: codeInterpreter.tools,
      // The tools share one sandbox session, so they run one at a time
      toolExecutor: 'sequential',
    }),
    codeInterpreter,
    files: new Map(),
    busy: false,
  }
  sessions.set(sessionId, session)
  return session
}

// The sandbox's writeFiles accepts text only, so binary files (.xlsx) are written as base64 and decoded in place.
async function writeUploads(session: Session): Promise<void> {
  const client = session.codeInterpreter.getClient()
  const written = await client.writeFiles({
    files: [...session.files].map(([name, content]) => ({ path: `uploads/${name}.b64`, content })),
  })
  if (written.startsWith('Error')) throw new Error(`Could not upload files: ${written}`)
  const decodeErrors = await client.executeCommand({
    command: 'cd uploads && for f in *.b64; do base64 -d "$f" > "${f%.b64}" && rm "$f"; done',
  })
  if (decodeErrors.trim()) throw new Error(`Could not upload files: ${decodeErrors.trim()}`)
}

async function publishArtifact(session: Session, sessionId: string, fileName: string): Promise<string> {
  const client = session.codeInterpreter.getClient()
  const base64 = await client.executeCommand({ command: `base64 -w0 'outputs/${fileName}'` })
  const key = `${sessionId}/${fileName}`
  await s3.send(
    new PutObjectCommand({
      Bucket: artifactBucket,
      Key: key,
      Body: Buffer.from(base64.trim(), 'base64'),
      ContentType: mimeTypeOf(fileName),
    })
  )
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: artifactBucket, Key: key }), { expiresIn: 3600 })
}

async function listArtifacts(session: Session): Promise<string[]> {
  const listing = await session.codeInterpreter.getClient().executeCommand({ command: 'ls -1 outputs 2>/dev/null' })
  const isImage = (name: string): boolean => mimeTypeOf(name).startsWith('image/')
  return listing
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((name) => /^[\w][\w .-]*$/.test(name))
    .sort((a, b) => Number(isImage(b)) - Number(isImage(a)))
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, context) {
      const session = getSession(context.sessionId)
      if (session.busy) {
        yield { event: 'error', data: { error: 'The agent is still answering another request in this session' } }
        return
      }
      session.busy = true

      try {
        let prompt = request.prompt
        for (const file of request.files ?? []) session.files.set(file.name, file.content)
        if (request.files?.length) {
          const fileList = request.files.map((file) => `uploads/${file.name}`).join(', ')
          prompt = `Uploaded files: ${fileList}\n\n${request.prompt}`
        }
        if (session.files.size) await writeUploads(session)

        for await (const event of session.agent.stream(prompt)) {
          if (event.type === 'beforeToolCallEvent') {
            const { toolUseId, name, input } = event.toolUse
            yield { event: 'tool', data: { toolUseId, name, input } }
          }
          if (
            event.type === 'modelStreamUpdateEvent' &&
            event.event.type === 'modelContentBlockDeltaEvent' &&
            event.event.delta.type === 'textDelta'
          ) {
            yield { event: 'message', data: { text: event.event.delta.text } }
          }
          if (event.type === 'afterToolCallEvent') {
            const { toolUseId, status } = event.result
            const content = event.result.content.map((block) =>
              block.type === 'textBlock' ? block.text : JSON.stringify(block)
            )
            yield { event: 'tool_result', data: { toolUseId, status, content: content.join('\n') } }
          }
        }

        if (!artifactBucket) return

        const artifacts = await listArtifacts(session)
        if (artifacts.length) yield { event: 'uploading', data: {} }
        for (const name of artifacts) {
          const url = await publishArtifact(session, context.sessionId, name)
          yield { event: 'artifact', data: { name, url, mimeType: mimeTypeOf(name) } }
        }
      } finally {
        // A sandbox ends 15 minutes after it starts, so each request uses its own and stops it when done
        await session.codeInterpreter.stopSession()
        session.busy = false
      }
    },
  },
  config: {
    contentTypeParsers: [
      {
        contentType: 'application/json',
        parseAs: 'string',
        bodyLimit: maxRequestBytes,
        parser: async (_request: unknown, body: string | Buffer): Promise<unknown> => JSON.parse(body.toString()),
      },
    ],
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
