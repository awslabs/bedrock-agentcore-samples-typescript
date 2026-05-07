/**
 * Hosts a Claude Agent SDK agent on Amazon Bedrock AgentCore Runtime.
 *
 * The Claude Agent SDK (@anthropic-ai/claude-agent-sdk) spawns the Claude Code
 * CLI under the hood. Model calls are routed through Amazon Bedrock when the
 * environment variable CLAUDE_CODE_USE_BEDROCK=1 is set, using the model ID
 * from ANTHROPIC_MODEL (a Bedrock cross-region inference profile).
 */
import { query } from '@anthropic-ai/claude-agent-sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

const requestSchema = z.object({
  prompt: z.string(),
})

const SYSTEM_PROMPT = "You're a helpful assistant. Answer the user's question directly and concisely."

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async function* (request, _context) {
      const response = query({
        prompt: request.prompt,
        options: {
          systemPrompt: SYSTEM_PROMPT,
          maxTurns: 5,
          allowedTools: [],
        },
      })

      for await (const message of response) {
        if (message.type === 'assistant') {
          for (const block of message.message.content) {
            if (block.type === 'text') {
              yield { event: 'message', data: { text: block.text } }
            }
          }
        }
      }
    },
  },
})

app.run()
