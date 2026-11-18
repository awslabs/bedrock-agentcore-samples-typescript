import Fastify from 'fastify'
import { config } from './config.js'
import { agentState, hasSession, startAgent, startSession, stopSession } from './agent.js'

const app = Fastify({ logger: { level: 'warn' } })

const clientOrigins = new Set([`http://localhost:${config.clientPort}`, `http://127.0.0.1:${config.clientPort}`])
const loopbackHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/

// The API acts with your AWS credentials, so only the local Vite client may call it:
// foreign Origins (other websites) and non-loopback Host headers (DNS rebinding) are refused
app.addHook('onRequest', async (request, reply) => {
  const origin = request.headers.origin
  if (!loopbackHost.test(request.headers.host ?? '') || (origin !== undefined && !clientOrigins.has(origin))) {
    return reply.code(403).send({ error: 'Forbidden' })
  }
})

app.post('/api/start', async () => {
  const liveViewUrl = await startSession()
  return { liveViewUrl }
})

app.post<{ Body: { prompt: string } }>(
  '/api/run-agent',
  {
    schema: {
      body: {
        type: 'object',
        required: ['prompt'],
        properties: { prompt: { type: 'string', minLength: 1, maxLength: 4000 } },
      },
    },
  },
  async (request, reply) => {
    if (!hasSession()) {
      return reply.code(409).send({ error: 'Start a browser session first' })
    }
    if (agentState.status === 'running') {
      return reply.code(409).send({ error: 'Agent is already running' })
    }
    // The client polls /api/status for the agent's progress
    startAgent(request.body.prompt)
    return { status: 'started' }
  }
)

app.get('/api/status', async () => {
  return { ...agentState, region: config.region, viewport: config.viewport }
})

app.post('/api/stop', async () => {
  await stopSession()
  return { status: 'stopped' }
})

// Stop the browser session on exit so it doesn't keep running (and billing) until its timeout
async function shutdown(): Promise<void> {
  try {
    await stopSession()
  } finally {
    await app.close()
    process.exit(0)
  }
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

await app.listen({ port: config.serverPort, host: '127.0.0.1' })
console.log(`\n  Agent server running at http://127.0.0.1:${config.serverPort}`)
console.log(`  Open the app at http://localhost:${config.clientPort}\n`)
