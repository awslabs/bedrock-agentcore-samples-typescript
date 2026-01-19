import { Agent, BedrockModel } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'
import { specialistTools } from './agents.js'

const requestSchema = z.object({
  prompt: z.string(),
  actor_id: z.string().optional(),
})

const orchestrator = new Agent({
  name: 'customer_support_orchestrator',
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  systemPrompt: `You are a customer support orchestrator. Your job is to understand customer requests and delegate to the appropriate specialist.

You have access to these specialists:
- warranty_specialist: For warranty checks, warranty status, and warranty policy questions
- tech_support_specialist: For technical issues, troubleshooting, device problems
- scheduling_specialist: For booking appointments and support calls

Guidelines:
- Analyze the customer's request to determine which specialist to use
- You can use multiple specialists if needed
- Always be helpful and professional
- If unclear, ask clarifying questions before delegating`,
  tools: specialistTools,
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, _context) {
      for await (const event of orchestrator.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }
    },
  },
})

app.run()
