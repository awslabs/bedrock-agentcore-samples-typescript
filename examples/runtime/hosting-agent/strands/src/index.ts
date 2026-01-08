import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp, type RequestContext } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

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
  name: 'calculator',
  description: 'Performs basic arithmetic',
  inputSchema: calculatorSchema,
  callback: (input: z.infer<typeof calculatorSchema>): number => {
    const { operation, a, b } = input
    switch (operation) {
      case 'add':
        return a + b
      case 'subtract':
        return a - b
      case 'multiply':
        return a * b
      case 'divide':
        return a / b
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  },
})

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  tools: [calculator],
})

const app = new BedrockAgentCoreApp({
  handler: async function* (request: unknown, _context: RequestContext) {
    const { prompt } = requestSchema.parse(request)

    for await (const event of agent.stream(prompt)) {
      if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
        yield { event: 'message', data: { text: event.delta.text } }
      }
    }
  },
})

app.run()
