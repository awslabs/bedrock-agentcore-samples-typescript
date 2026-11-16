import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const calculator = tool({
  name: 'calculator',
  description: 'Performs basic arithmetic',
  inputSchema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  callback: ({ operation, a, b }): number => {
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

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.anthropic.claude-haiku-5-5',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  tools: [calculator],
})

// AgentCore Runtime has already verified the token's signature, issuer and client, so reading its claims is safe.
function usernameFromAuthorization(authorization: string | undefined): string {
  const payload = authorization?.split('.')[1]
  if (!payload) return 'anonymous'
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { username?: string }
  return claims.username ?? 'unknown'
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, context) {
      console.log(`Invoked by ${usernameFromAuthorization(context.headers['authorization'])}`)

      for await (const event of agent.stream(request.prompt)) {
        if (
          event.type === 'modelStreamUpdateEvent' &&
          event.event.type === 'modelContentBlockDeltaEvent' &&
          event.event.delta.type === 'textDelta'
        ) {
          yield { event: 'message', data: { text: event.event.delta.text } }
        }
      }
    },
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
