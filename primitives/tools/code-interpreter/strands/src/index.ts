import { Agent, BedrockModel } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { CodeInterpreterTools } from 'bedrock-agentcore/experimental/code-interpreter/strands'
import { z } from 'zod'
import * as fs from 'fs'
import * as path from 'path'

const requestSchema = z.object({
  prompt: z.string(),
})

const codeInterpreter = new CodeInterpreterTools({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
})

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.anthropic.claude-haiku-4-5-20251001-v1:0',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  tools: codeInterpreter.tools,
  systemPrompt: `You are a data analyst with access to a secure sandbox with three tools:
- executeCode: Run Python, JavaScript, or TypeScript code
- fileOperations: Read, write, list, or remove files in the sandbox
- executeCommand: Execute shell commands

Pre-installed libraries: pandas, numpy, matplotlib, seaborn, scipy, scikit-learn.

Session state persists across invocations—variables and files remain available until the session ends. Use print() to return results.

When creating output artifacts (visualizations, reports, processed data), save them to the "output/" directory. The directory does not exist by default—create it first with os.makedirs('output', exist_ok=True). Example: plt.savefig('output/chart.png')`,
})

async function* retrieveArtifacts() {
  const client = codeInterpreter.getClient()
  const listing = await client.executeCommand({ command: 'ls -1 output/ 2>/dev/null || true' })

  const files = listing.trim().split('\n').filter(Boolean)
  if (files.length === 0) return

  const outputDir = path.join(process.cwd(), 'output')
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

  const saved: string[] = []
  for (const file of files) {
    const content = await client.readFiles({ paths: [`output/${file}`] })

    // readFiles returns JSON with uri, mimeType, and blob (base64) for binary files
    let buffer: Buffer
    try {
      const parsed = JSON.parse(content)
      if (parsed.blob) {
        buffer = Buffer.from(parsed.blob, 'base64')
      } else if (parsed.text) {
        buffer = Buffer.from(parsed.text, 'utf-8')
      } else {
        buffer = Buffer.from(content, 'utf-8')
      }
    } catch {
      // Not JSON - treat as plain text
      buffer = Buffer.from(content, 'utf-8')
    }

    fs.writeFileSync(path.join(outputDir, file), buffer)
    saved.push(file)
  }

  if (saved.length > 0) {
    yield { event: 'message', data: { text: `\n\n--- Artifacts saved to ./output/: ${saved.join(', ')} ---` } }
  }
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, _context) {
      for await (const event of agent.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }

      yield* retrieveArtifacts()
    },
  },
})

const cleanup = async () => {
  await codeInterpreter.stopSession()
  process.exit(0)
}
process.on('SIGTERM', cleanup)
process.on('SIGINT', cleanup)

app.run()
