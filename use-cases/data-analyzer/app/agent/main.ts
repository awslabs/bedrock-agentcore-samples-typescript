import { Agent, BedrockModel } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { CodeInterpreterTools } from 'bedrock-agentcore/experimental/code-interpreter/strands'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'

const region = process.env['AWS_REGION'] ?? 'us-east-1'
const artifactBucket = process.env['ARTIFACT_BUCKET']
const codeInterpreterId = process.env['CODE_INTERPRETER_ID']

// Uploads travel base64-encoded in the JSON body, so allow more than Fastify's 1 MB default.
const maxRequestBytes = 20 * 1024 * 1024

const requestSchema = z.object({
  prompt: z.string().min(1),
  files: z
    .array(
      z.object({
        name: z
          .string()
          .max(100)
          .regex(/^[\w][\w .-]*$/, 'File names may contain only letters, digits, spaces, dots, dashes and underscores'),
        content: z.base64(),
      })
    )
    .max(5)
    .optional(),
})

const systemPrompt = `You are a data analyst. You write and run Python code in a secure sandbox to answer questions about the
user's data and to create charts, reports and processed files.

- Uploaded files are in the "uploads/" directory.
- Save every file the user should see (charts, reports, processed data) to "outputs/". Create it first with
  os.makedirs('outputs', exist_ok=True). Use unique, descriptive file names and never overwrite a file.
- Save charts as PNG unless the user asks for another format. Use matplotlib and make them clear and good-looking.
- Pre-installed libraries: pandas, numpy, matplotlib, seaborn, plotly, scipy, scikit-learn, openpyxl, xlrd. The sandbox has no internet
  access, so don't install packages or fetch URLs.
- Variables and files persist between turns. Use print() to see results.
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
  publishedArtifacts: Set<string>
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
      model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region }),
      tools: codeInterpreter.tools,
      systemPrompt,
    }),
    codeInterpreter,
    publishedArtifacts: new Set(),
  }
  sessions.set(sessionId, session)
  return session
}

// The sandbox's writeFiles accepts text only, so binary files (.xlsx) are written as base64 and decoded in place.
async function writeUploads(session: Session, files: { name: string; content: string }[]): Promise<void> {
  const client = session.codeInterpreter.getClient()
  const written = await client.writeFiles({
    files: files.map((file) => ({ path: `uploads/${file.name}.b64`, content: file.content })),
  })
  if (written.startsWith('Error')) throw new Error(`Could not upload files: ${written}`)
  await client.executeCommand({
    command: 'cd uploads && for f in *.b64; do base64 -d "$f" > "${f%.b64}" && rm "$f"; done',
  })
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

async function listNewArtifacts(session: Session): Promise<string[]> {
  const listing = await session.codeInterpreter.getClient().executeCommand({ command: 'ls -1 outputs 2>/dev/null' })
  return listing
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((name) => /^[\w][\w .-]*$/.test(name) && !session.publishedArtifacts.has(name))
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, context) {
      const session = getSession(context.sessionId)

      let prompt = request.prompt
      if (request.files?.length) {
        await writeUploads(session, request.files)
        const fileList = request.files.map((file) => `uploads/${file.name}`).join(', ')
        prompt = `Uploaded files: ${fileList}\n\n${request.prompt}`
      }

      for await (const event of session.agent.stream(prompt)) {
        if (
          event.type === 'modelStreamUpdateEvent' &&
          event.event.type === 'modelContentBlockDeltaEvent' &&
          event.event.delta.type === 'textDelta'
        ) {
          yield { event: 'message', data: { text: event.event.delta.text } }
        }
        if (event.type === 'beforeToolCallEvent') {
          const { toolUseId, name, input } = event.toolUse
          yield { event: 'tool', data: { toolUseId, name, input } }
        }
        if (event.type === 'afterToolCallEvent') {
          const { toolUseId, status } = event.result
          const content = event.result.content.map((block) => ('text' in block ? block.text : JSON.stringify(block)))
          yield { event: 'tool_result', data: { toolUseId, status, content: content.join('\n') } }
        }
      }

      if (!artifactBucket) return

      const newArtifacts = await listNewArtifacts(session)
      if (newArtifacts.length) yield { event: 'uploading', data: {} }
      for (const name of newArtifacts) {
        const url = await publishArtifact(session, context.sessionId, name)
        session.publishedArtifacts.add(name)
        yield { event: 'artifact', data: { name, url, mimeType: mimeTypeOf(name) } }
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

async function stopSandboxes(): Promise<void> {
  await Promise.allSettled([...sessions.values()].map((session) => session.codeInterpreter.stopSession()))
  process.exit(0)
}

process.on('SIGTERM', stopSandboxes)
process.on('SIGINT', stopSandboxes)

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
