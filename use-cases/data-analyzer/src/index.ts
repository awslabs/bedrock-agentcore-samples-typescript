import 'dotenv/config'
import { Agent, BedrockModel } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { CodeInterpreterTools } from 'bedrock-agentcore/code-interpreter/strands'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { z } from 'zod'

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

// Agent
const agent = new Agent({
  model: new BedrockModel({ modelId: BEDROCK_MODEL_ID, region: BEDROCK_REGION }),
  tools: codeInterpreter.tools,
  systemPrompt: `You are a data analyst with a secure sandbox that has internet access.

Tools: executeCode (Python/JS/TS), fileOperations (read/write/list/remove), executeCommand (shell).
Libraries: pandas, numpy, matplotlib, seaborn, scipy, scikit-learn.
Internet: Fetch data using requests or urllib.

Save artifacts to "output/" (create with os.makedirs('output', exist_ok=True)).
Keep code simple. Prefer seaborn for visualizations.`,
})

// Upload artifacts from sandbox to S3
async function uploadArtifacts(sessionId: string): Promise<string[]> {
  if (!ARTIFACT_BUCKET) return []

  const client = codeInterpreter.getClient()
  const listing = await client.executeCommand({ command: 'ls -1 output/ 2>/dev/null || true' })
  const files = listing.trim().split('\n').filter(Boolean)
  if (!files.length) return []

  const uploaded: string[] = []
  for (const file of files) {
    let content = await client.readFiles({ paths: [`output/${file}`] })

    // Workaround: readFiles may fail for newly created files, use executeCode as fallback
    if (content.startsWith('Error')) {
      const result = await client.executeCode({
        code: `import base64\nwith open('output/${file}', 'rb') as f: print(base64.b64encode(f.read()).decode())`,
        language: 'python',
      })
      if (result.startsWith('Error') || !result.trim()) continue
      content = JSON.stringify({ blob: result.trim() })
    }

    // Parse content (JSON with blob/text, or plain text)
    let buffer: Buffer
    try {
      const parsed = JSON.parse(content)
      buffer = parsed.blob
        ? Buffer.from(parsed.blob, 'base64')
        : Buffer.from(parsed.text ?? content, 'utf-8')
    } catch {
      buffer = Buffer.from(content, 'utf-8')
    }

    await s3.send(new PutObjectCommand({ Bucket: ARTIFACT_BUCKET, Key: `${sessionId}/${file}`, Body: buffer }))
    uploaded.push(`${sessionId}/${file}`)
  }
  return uploaded
}

// App
const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, context) {
      for await (const event of agent.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }

      const uploaded = await uploadArtifacts(context.sessionId)
      if (uploaded.length) {
        yield { event: 'message', data: { text: `\n\nArtifacts: ${uploaded.join(', ')}` } }
      }
    },
  },
})

// Cleanup on shutdown
process.on('SIGTERM', async () => { await codeInterpreter.stopSession(); process.exit(0) })
process.on('SIGINT', async () => { await codeInterpreter.stopSession(); process.exit(0) })

app.run()
