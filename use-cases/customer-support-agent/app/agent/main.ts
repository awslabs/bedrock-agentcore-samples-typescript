import { Agent, BedrockModel } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'
import { createSpecialists } from './specialists.js'

const SYSTEM_PROMPT = `You are a customer support orchestrator. Understand each customer request and delegate it to the right specialist:
- warranty_specialist: warranty checks, warranty status and warranty policy questions
- tech_support_specialist: technical issues, troubleshooting and device problems
- scheduling_specialist: available slots and booking support appointments

Use several specialists when a request needs them, pass along details the customer gave earlier in the conversation,
and ask a clarifying question when the request is unclear.`

const agentsBySession = new Map<string, Agent>()

function getAgent(sessionId: string): Agent {
  let agent = agentsBySession.get(sessionId)
  if (!agent) {
    agent = new Agent({
      model: new BedrockModel({
        modelId: 'global.anthropic.claude-haiku-5-5',
        region: process.env['AWS_REGION'] ?? 'us-east-1',
      }),
      systemPrompt: SYSTEM_PROMPT,
      tools: createSpecialists(),
    })
    agentsBySession.set(sessionId, agent)
  }
  return agent
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, context) {
      for await (const event of getAgent(context.sessionId).stream(request.prompt)) {
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
