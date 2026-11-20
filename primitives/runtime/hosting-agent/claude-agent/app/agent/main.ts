import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

type Operation = 'add' | 'subtract' | 'multiply' | 'divide'

function calculate(operation: Operation, a: number, b: number): number {
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
}

const calculator = tool(
  'calculator',
  'Performs basic arithmetic',
  {
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  },
  async ({ operation, a, b }): Promise<CallToolResult> => ({
    content: [{ type: 'text', text: String(calculate(operation, a, b)) }],
  })
)

const tools = createSdkMcpServer({ name: 'tools', tools: [calculator] })

let sessionId: string | undefined

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      const messages = query({
        prompt: request.prompt,
        options: {
          model: 'global.anthropic.claude-haiku-5-5',
          env: {
            ...process.env,
            CLAUDE_CODE_USE_BEDROCK: '1',
            AWS_REGION: process.env['AWS_REGION'] ?? 'us-east-1',
          },
          tools: [],
          mcpServers: { tools },
          allowedTools: ['mcp__tools__calculator'],
          settingSources: [],
          includePartialMessages: true,
          resume: sessionId,
        },
      })

      for await (const message of messages) {
        if (
          message.type === 'stream_event' &&
          message.event.type === 'content_block_delta' &&
          message.event.delta.type === 'text_delta'
        ) {
          yield { event: 'message', data: { text: message.event.delta.text } }
        }
        if (message.type === 'result' && message.subtype === 'success') {
          sessionId = message.session_id
        }
      }
    },
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
