import { ToolLoopAgent, tool } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const bedrock = createAmazonBedrock({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  credentialProvider: fromNodeProviderChain(),
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
  invocationHandler: {
    requestSchema,
    process: async function* (request, _context) {
      const stream = await agent.stream({ prompt: request.prompt })

      for await (const chunk of stream.textStream) {
        yield { event: 'message', data: { text: chunk } }
      }
    },
  },
})

app.run()
