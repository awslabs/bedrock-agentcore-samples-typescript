import { Agent, BedrockModel } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { CodeInterpreterTools } from 'bedrock-agentcore/code-interpreter/strands'
import { z } from 'zod'

const requestSchema = z.object({
  prompt: z.string(),
})

const codeInterpreter = new CodeInterpreterTools({
  region: process.env['AWS_REGION'] || 'us-east-1',
})

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.anthropic.claude-haiku-4-5-20251001-v1:0',
    region: process.env['AWS_REGION'] || 'us-east-1',
  }),
  tools: codeInterpreter.tools,
  systemPrompt: `You are a data analyst with access to a secure sandbox with three tools:
- executeCode: Run Python, JavaScript, or TypeScript code
- fileOperations: Read, write, list, or remove files in the sandbox
- executeCommand: Execute shell commands

Pre-installed libraries: pandas, numpy, matplotlib, seaborn, scipy, scikit-learn.

Session state persists across invocations—variables and files remain available until the session ends. Use print() to return results.`,
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, _context) {
      for await (const event of agent.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }
    },
  },
})

process.on('SIGTERM', async () => {
  await codeInterpreter.stopSession()
  process.exit(0)
})

app.run()
