import { ToolLoopAgent } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { CodeInterpreterTools } from 'bedrock-agentcore/code-interpreter/vercel-ai'
import { z } from 'zod'

const requestSchema = z.object({
  prompt: z.string(),
})

const bedrock = createAmazonBedrock({
  region: process.env['AWS_REGION'] || 'us-east-1',
})

const codeInterpreter = new CodeInterpreterTools({
  region: process.env['AWS_REGION'] || 'us-east-1',
})

const agent = new ToolLoopAgent({
  model: bedrock('global.anthropic.claude-haiku-4-5-20251001-v1:0'),
  tools: codeInterpreter.tools,
  instructions: `You are a data analyst with access to a secure sandbox with three tools:
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
      const stream = await agent.stream({ prompt: request.prompt })
      for await (const chunk of stream.textStream) {
        yield { event: 'message', data: { text: chunk } }
      }
    },
  },
})

process.on('SIGTERM', async () => {
  await codeInterpreter.stopSession()
  process.exit(0)
})

app.run()
