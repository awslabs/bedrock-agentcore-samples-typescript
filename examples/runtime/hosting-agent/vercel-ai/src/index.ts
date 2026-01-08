import { ToolLoopAgent, tool } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { BedrockAgentCoreApp, type RequestContext } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const bedrock = createAmazonBedrock({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
})

// Request schema
const requestSchema = z.object({
  prompt: z.string(),
})

const calculatorSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
  a: z.number(),
  b: z.number(),
})

const calculator = tool({
  description: 'Performs basic arithmetic',
  inputSchema: calculatorSchema,
  execute: async ({ operation, a, b }) => {
    switch (operation) {
      case 'add':
        return { result: a + b }
      case 'subtract':
        return { result: a - b }
      case 'multiply':
        return { result: a * b }
      case 'divide':
        return { result: a / b }
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  },
})

const agent = new ToolLoopAgent({
  model: bedrock('global.amazon.nova-2-lite-v1:0'),
  tools: { calculator },
})

const app = new BedrockAgentCoreApp({
  handler: async function* (request: unknown, _context: RequestContext) {
    const { prompt } = requestSchema.parse(request)

    const stream = await agent.stream({ prompt })

    for await (const chunk of stream.textStream) {
      yield { event: 'message', data: { text: chunk } }
    }
  },
})

app.run()
