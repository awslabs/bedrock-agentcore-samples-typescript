import { ToolLoopAgent, type ModelMessage } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { CodeInterpreterTools } from 'bedrock-agentcore/code-interpreter/vercel-ai'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const region = process.env['AWS_REGION'] ?? 'us-east-1'
const bedrock = createAmazonBedrock({ region, credentialProvider: fromNodeProviderChain() })

const codeInterpreter = new CodeInterpreterTools({ region })

const agent = new ToolLoopAgent({
  model: bedrock('global.anthropic.claude-haiku-5-5'),
  instructions:
    'You are a data analyst. Run Python in the sandbox to answer questions. Each request gets a fresh sandbox.',
  tools: codeInterpreter.tools,
  // The tools share one sandbox session, so they run one at a time
  toolCallConcurrency: 1,
})

const messages: ModelMessage[] = []

// The agent and its sandbox serve one request at a time; an overlapping request must not stop the sandbox in use
let busy = false

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      if (busy) {
        yield { event: 'error', data: { error: 'The agent is still answering another request' } }
        return
      }
      busy = true
      const userMessage: ModelMessage = { role: 'user', content: request.prompt }
      try {
        const stream = await agent.stream({ messages: [...messages, userMessage] })

        for await (const part of stream.fullStream) {
          if (part.type === 'tool-call') {
            yield { event: 'tool', data: { name: part.toolName, input: part.input } }
          }
          if (part.type === 'text-delta') {
            yield { event: 'message', data: { text: part.text } }
          }
        }
        // The turn joins the history only once it completes, so a failed or abandoned request leaves nothing behind
        messages.push(userMessage, ...(await stream.responseMessages))
      } finally {
        // A sandbox ends 15 minutes after it starts, so each request uses its own and stops it when done
        await codeInterpreter.stopSession()
        busy = false
      }
    },
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
