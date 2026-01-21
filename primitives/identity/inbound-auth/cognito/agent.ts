import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
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
  invocationHandler: {
    requestSchema,
    process: async function* (request, context) {
      const authHeader = context.headers?.authorization ?? 'none'
      console.log(`Authorization: ${authHeader.substring(0, 20)}...`)

      for await (const event of agent.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }
    },
  },
})

app.run()
