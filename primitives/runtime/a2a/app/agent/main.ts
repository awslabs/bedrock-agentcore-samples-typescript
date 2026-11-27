import type { Message } from '@a2a-js/sdk'
import { Role, TaskState } from '@a2a-js/sdk'
import type { AgentExecutor, ExecutionEventBus, RequestContext } from '@a2a-js/sdk/server'
import { AgentEvent } from '@a2a-js/sdk/server'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { ToolLoopAgent, tool } from 'ai'
import { buildAgentCard, serveA2A } from 'bedrock-agentcore/runtime/a2a'
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

function textFromMessage(message: Message): string {
  return message.parts
    .map((part) => (part.content?.$case === 'text' ? part.content.value : ''))
    .join('')
    .trim()
}

function textPart(text: string): Message['parts'][number] {
  return {
    content: { $case: 'text', value: text },
    metadata: undefined,
    filename: '',
    mediaType: 'text/plain',
  }
}

async function collectAgentText(prompt: string): Promise<string> {
  const stream = await agent.stream({ messages: [{ role: 'user', content: prompt }] })
  let text = ''
  for await (const chunk of stream.textStream) {
    text += chunk
  }
  return text
}

class CalculatorAgentExecutor implements AgentExecutor {
  private readonly cancelledTasks = new Set<string>()

  cancelTask = async (taskId: string, _eventBus: ExecutionEventBus): Promise<void> => {
    this.cancelledTasks.add(taskId)
  }

  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const { taskId, contextId, userMessage, task: existingTask } = requestContext
    const now = (): string => new Date().toISOString()

    try {
      eventBus.publish(
        AgentEvent.task(
          existingTask ?? {
            id: taskId,
            contextId,
            status: {
              state: TaskState.TASK_STATE_SUBMITTED,
              timestamp: now(),
              message: undefined,
            },
            artifacts: [],
            history: [userMessage],
            metadata: userMessage.metadata,
          }
        )
      )

      eventBus.publish(
        AgentEvent.statusUpdate({
          taskId,
          contextId,
          status: {
            state: TaskState.TASK_STATE_WORKING,
            timestamp: now(),
            message: {
              role: Role.ROLE_AGENT,
              messageId: crypto.randomUUID(),
              parts: [textPart('Working on your request')],
              taskId,
              contextId,
              extensions: [],
              metadata: {},
              referenceTaskIds: [],
            },
          },
          metadata: {},
        })
      )

      if (this.cancelledTasks.has(taskId)) {
        eventBus.publish(
          AgentEvent.statusUpdate({
            taskId,
            contextId,
            status: {
              state: TaskState.TASK_STATE_CANCELED,
              timestamp: now(),
              message: undefined,
            },
            metadata: {},
          })
        )
        return
      }

      const prompt = textFromMessage(userMessage)
      const reply = prompt ? await collectAgentText(prompt) : 'Send a text message, for example "What is 25 * 4?"'

      if (this.cancelledTasks.has(taskId)) {
        eventBus.publish(
          AgentEvent.statusUpdate({
            taskId,
            contextId,
            status: {
              state: TaskState.TASK_STATE_CANCELED,
              timestamp: now(),
              message: undefined,
            },
            metadata: {},
          })
        )
        return
      }

      eventBus.publish(
        AgentEvent.artifactUpdate({
          taskId,
          contextId,
          artifact: {
            artifactId: crypto.randomUUID(),
            name: 'Result',
            description: 'The agent response',
            parts: [textPart(reply)],
            metadata: undefined,
            extensions: [],
          },
          lastChunk: true,
          append: false,
          metadata: undefined,
        })
      )

      eventBus.publish(
        AgentEvent.statusUpdate({
          taskId,
          contextId,
          status: {
            state: TaskState.TASK_STATE_COMPLETED,
            timestamp: now(),
            message: undefined,
          },
          metadata: undefined,
        })
      )
    } finally {
      this.cancelledTasks.delete(taskId)
    }
  }
}

const port = Number(process.env['A2A_PORT'] ?? process.env['PORT'] ?? 9000)

void serveA2A({
  executor: new CalculatorAgentExecutor(),
  agentCard: buildAgentCard({
    name: 'Calculator agent',
    description: 'A Vercel AI SDK agent with a calculator tool, served over the A2A protocol on AgentCore Runtime.',
    skills: [
      {
        id: 'calculator',
        name: 'Calculator',
        description: 'Answers questions that need basic arithmetic, using a calculator tool when needed.',
        tags: ['calculator', 'math'],
        examples: ['What is 25 * 4?'],
      },
    ],
    port,
  }),
  port,
  // AgentCore Runtime (CodeZip) does not create /.dockerenv, and the platform
  // health-checks 0.0.0.0:9000. agentcore dev also expects that address.
  host: '0.0.0.0',
}).catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
