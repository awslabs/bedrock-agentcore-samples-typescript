import { ToolLoopAgent, type ModelMessage } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { CodeInterpreterTools } from 'bedrock-agentcore/code-interpreter/vercel-ai'
import { z } from 'zod'
import * as fs from 'fs'
import * as path from 'path'

const region = process.env['AWS_REGION'] ?? 'us-east-1'
const outputDir = path.join(process.cwd(), 'output')
const bedrock = createAmazonBedrock({ region, credentialProvider: fromNodeProviderChain() })

const instructions = `You are a data analyst with access to a secure sandbox with three tools:
- executeCode: Run Python, JavaScript, or TypeScript code
- fileOperations: Read, write, list, or remove files in the sandbox
- executeCommand: Execute shell commands

Pre-installed libraries: pandas, numpy, matplotlib, seaborn, scipy, scikit-learn.

Session state persists across invocations—variables and files remain available until the session ends. Use print() to return results.

When creating output artifacts (visualizations, reports, processed data), save them to the "output/" directory. The directory does not exist by default—create it first with os.makedirs('output', exist_ok=True). Example: plt.savefig('output/chart.png')`

interface Conversation {
  agent: ToolLoopAgent<never, CodeInterpreterTools['tools']>
  codeInterpreter: CodeInterpreterTools
  messages: ModelMessage[]
}

const conversations = new Map<string, Conversation>()

function createConversation(): Conversation {
  const codeInterpreter = new CodeInterpreterTools({ region })
  const agent = new ToolLoopAgent({
    model: bedrock('global.anthropic.claude-haiku-5-5'),
    tools: codeInterpreter.tools,
    instructions,
    // Tools share one sandbox session; running them in parallel would race to start it
    toolCallConcurrency: 1,
  })
  return { agent, codeInterpreter, messages: [] }
}

async function sandboxStatus(codeInterpreter: CodeInterpreterTools): Promise<string> {
  try {
    const session = await codeInterpreter.getClient().getSession()
    return session.status
  } catch {
    // The sandbox starts on the first tool call; until then there is no session to look up
    return 'NOT_STARTED'
  }
}

async function getConversation(sessionId: string): Promise<Conversation> {
  const existing = conversations.get(sessionId)
  // A sandbox that timed out can't be resumed, so the conversation starts over with a new one
  if (existing && (await sandboxStatus(existing.codeInterpreter)) !== 'TERMINATED') {
    return existing
  }
  const conversation = createConversation()
  conversations.set(sessionId, conversation)
  return conversation
}

function decodeFile(content: string): Buffer {
  try {
    const { blob } = JSON.parse(content) as { blob?: string }
    if (blob) return Buffer.from(blob, 'base64')
  } catch {
    // Text files come back as their plain contents
  }
  return Buffer.from(content, 'utf-8')
}

async function downloadArtifacts(codeInterpreter: CodeInterpreterTools): Promise<string[]> {
  // The client returns failures as text starting with "Error" instead of throwing
  const client = codeInterpreter.getClient()
  const command = "find output -maxdepth 1 -type f -printf '%f\\n' 2>/dev/null || true"
  const listing = await client.executeCommand({ command })
  if (listing.startsWith('Error')) throw new Error(`Listing artifacts failed: ${listing}`)

  // The sandbox shell runs in a terminal, so lines end with \r\n
  const files = listing.split(/\r?\n/).filter(Boolean)
  if (files.length === 0) return []

  fs.mkdirSync(outputDir, { recursive: true })
  for (const file of files) {
    const content = await client.readFiles({ paths: [`output/${file}`] })
    if (content.startsWith('Error')) throw new Error(`Reading output/${file} failed: ${content}`)
    fs.writeFileSync(path.join(outputDir, file), decodeFile(content))
  }
  return files
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, context) {
      const conversation = await getConversation(context.sessionId)
      const userMessage: ModelMessage = { role: 'user', content: request.prompt }

      const stream = await conversation.agent.stream({ messages: [...conversation.messages, userMessage] })
      for await (const chunk of stream.textStream) {
        yield { event: 'message', data: { text: chunk } }
      }
      conversation.messages.push(userMessage, ...(await stream.responseMessages))

      const steps = await stream.steps
      const usedSandbox = steps.some((step) => step.toolCalls.length > 0)
      const artifacts = usedSandbox ? await downloadArtifacts(conversation.codeInterpreter) : []
      if (artifacts.length > 0) {
        yield { event: 'message', data: { text: `\n\n--- Artifacts saved to ./output/: ${artifacts.join(', ')} ---` } }
      }
    },
  },
})

async function stopSandboxesAndExit(): Promise<void> {
  const sandboxes = [...conversations.values()].map(({ codeInterpreter }) => codeInterpreter.stopSession())
  await Promise.allSettled(sandboxes)
  process.exit(0)
}
process.on('SIGTERM', stopSandboxesAndExit)
process.on('SIGINT', stopSandboxesAndExit)

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
