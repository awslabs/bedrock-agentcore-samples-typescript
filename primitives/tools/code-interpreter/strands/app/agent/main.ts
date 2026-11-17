import { Agent, BedrockModel } from '@strands-agents/sdk'
import { CodeInterpreterTools } from 'bedrock-agentcore/experimental/code-interpreter/strands'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const region = process.env['AWS_REGION'] ?? 'us-east-1'

const codeInterpreter = new CodeInterpreterTools({ region })

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region, maxTokens: 8192 }),
  systemPrompt:
    'You are a data analyst. Run Python in the sandbox to answer questions. Each request gets a fresh sandbox.',
  tools: codeInterpreter.tools,
  // The tools share one sandbox session, so they run one at a time
  toolExecutor: 'sequential',
})

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
      try {
        for await (const event of agent.stream(request.prompt)) {
          if (event.type === 'beforeToolCallEvent') {
            yield { event: 'tool', data: { name: event.toolUse.name, input: event.toolUse.input } }
          }
          if (
            event.type === 'modelStreamUpdateEvent' &&
            event.event.type === 'modelContentBlockDeltaEvent' &&
            event.event.delta.type === 'textDelta'
          ) {
            yield { event: 'message', data: { text: event.event.delta.text } }
          }
        }
      } finally {
        // A sandbox ends 15 minutes after it starts, so each request uses its own and stops it when done
        await codeInterpreter.stopSession()
        busy = false
      }
    },
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
