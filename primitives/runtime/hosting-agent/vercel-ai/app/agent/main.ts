import { ToolLoopAgent, tool, type ModelMessage } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const bedrock = createAmazonBedrock({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  credentialProvider: fromNodeProviderChain(),
})

const calculator = tool({
  description: 'Performs basic arithmetic',
  inputSchema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ operation, a, b }): Promise<number> => {
    switch (operation) {
      case 'add':
        return a + b
      case 'subtract':
        return a - b
      case 'multiply':
        return a * b
      case 'divide':
        return a / b
    }
  },
})

const agent = new ToolLoopAgent({
  model: bedrock('global.anthropic.claude-haiku-5-5'),
  tools: { calculator },
})

const messages: ModelMessage[] = []

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      const userMessage: ModelMessage = { role: 'user', content: request.prompt }
      const stream = await agent.stream({ messages: [...messages, userMessage] })

      for await (const chunk of stream.textStream) {
        yield { event: 'message', data: { text: chunk } }
      }
      // The turn joins the history only once it completes, so a failed or abandoned request leaves nothing behind
      messages.push(userMessage, ...(await stream.responseMessages))
    },
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
