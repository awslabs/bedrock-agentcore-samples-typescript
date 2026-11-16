import { Agent, BedrockModel } from '@strands-agents/sdk'
import { CodeInterpreterTools } from 'bedrock-agentcore/experimental/code-interpreter/strands'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const region = process.env['AWS_REGION'] ?? 'us-east-1'

const codeInterpreter = new CodeInterpreterTools({ region })

const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.anthropic.claude-haiku-5-5', region }),
  tools: codeInterpreter.tools,
  systemPrompt:
    'You are a data analyst. Run Python in the sandbox to answer questions. Variables and files persist between calls.',
  // The tools share one sandbox session, which starts on the first call
  toolExecutor: 'sequential',
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
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
    },
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
