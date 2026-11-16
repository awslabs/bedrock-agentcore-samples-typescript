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
    'You are a data analyst. Run Python in the sandbox to answer questions. Variables and files persist between calls.',
  tools: codeInterpreter.tools,
  // The tools share one sandbox session, so they run one at a time
  toolCallConcurrency: 1,
})

const messages: ModelMessage[] = []

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      messages.push({ role: 'user', content: request.prompt })
      const stream = await agent.stream({ messages })

      for await (const part of stream.fullStream) {
        if (part.type === 'tool-call') {
          yield { event: 'tool', data: { name: part.toolName, input: part.input } }
        }
        if (part.type === 'text-delta') {
          yield { event: 'message', data: { text: part.text } }
        }
      }
      messages.push(...(await stream.responseMessages))
    },
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
