import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { Worker } from 'worker_threads'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { z } from 'zod'

const getTaskStatus = tool({
  name: 'get_task_status',
  description: 'Get information about currently running background tasks and agent status',
  inputSchema: z.object({}),
  callback: async (): Promise<string> => {
    const taskStatus = app.getAsyncTaskInfo()

    if (taskStatus.activeCount === 0) {
      return 'No background tasks are currently running. Agent status is Healthy.'
    }

    const taskList = taskStatus.runningJobs
      .map((job, index) => {
        return `Task ${index + 1}:
  - Name: ${job.name}
  - Duration: ${job.duration} seconds`
      })
      .join('\n\n')

    return `Currently running background tasks (${taskStatus.activeCount}):

${taskList}

Agent status: HealthyBusy`
  },
})

const startBackgroundWorker = tool({
  name: 'start_background_worker',
  description: 'Start a background worker that performs CPU-intensive processing without blocking',
  inputSchema: z.object({
    duration: z.number().default(5).describe('Duration in seconds for CPU-intensive processing'),
  }),
  callback: async (input: { duration: number }): Promise<string> => {
    const duration = input.duration
    const taskId = app.addAsyncTask('background_worker_processing', { duration })

    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const workerPath = join(__dirname, 'worker.js')

    const worker = new Worker(workerPath)

    console.log(`Submitting ${duration}s CPU-intensive task to background worker...`)
    worker.postMessage({ duration })

    // Set up event handlers for when worker completes (fire and forget)
    worker.on('message', (message) => {
      console.log('Worker completed:', message)
      app.completeAsyncTask(taskId)
      worker.terminate()
    })

    worker.on('error', (error) => {
      console.error('Worker error:', error)
      app.completeAsyncTask(taskId)
      worker.terminate()
    })

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`)
      }
    })

    // Return immediately without waiting for worker to complete
    return `Background worker started (Task ID: ${taskId}) for ${duration} seconds of CPU-intensive processing.

The worker is now processing in the background. The agent is immediately available to handle new requests.
Check the /ping endpoint to monitor status: it will show HealthyBusy while the worker processes, then return to Healthy when complete.`
  },
})

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  tools: [startBackgroundWorker, getTaskStatus],
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, _context) {
      const response = await agent.invoke(request.prompt)
      yield { event: 'message', data: { text: response.lastMessage } }
    },
  },
})

app.run()
