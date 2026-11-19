import { BedrockAgentCoreClient, CompleteResourceTokenAuthCommand } from '@aws-sdk/client-bedrock-agentcore'
import express, { type Request } from 'express'
import path from 'node:path'

const port = parseInt(process.env['PORT'] ?? '9090')
const runtimeUrl = process.env['RUNTIME_URL']
const clientId = process.env['CLIENT_ID']

if (!runtimeUrl || !clientId) {
  console.error('Set RUNTIME_URL and CLIENT_ID to the stack outputs RuntimeUrl and ClientId (see the README).')
  process.exit(1)
}

// The runtime URL names the region the stack is in (https://bedrock-agentcore.<region>.amazonaws.com/...)
const region = new URL(runtimeUrl).hostname.split('.')[1]
const identityClient = new BedrockAgentCoreClient({ region })
const publicDir = path.join(import.meta.dirname, 'public')

function bearerToken(req: Request): string | undefined {
  return req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
}

const app = express()
app.use(express.json())
app.use(express.static(publicDir))

app.get('/api/config', (_req, res) => {
  res.json({ clientId, region })
})

app.post('/api/chat', async (req, res) => {
  const userToken = bearerToken(req)
  const { prompt, sessionId } = req.body as { prompt?: unknown; sessionId?: unknown }
  if (!userToken) {
    res.status(401).json({ error: 'Sign in first' })
    return
  }
  if (typeof prompt !== 'string' || !prompt || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'Request body must be {"prompt": "...", "sessionId": "..."}' })
    return
  }

  // The runtime's JWT authorizer verifies the token, so the web app passes it on unchecked.
  const response = await fetch(runtimeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${userToken}`,
      'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': sessionId,
    },
    body: JSON.stringify({ prompt }),
  })
  if (!response.ok) {
    res.status(response.status).json({ error: await response.text() })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  for await (const chunk of response.body ?? []) {
    res.write(chunk)
  }
  res.end()
})

// AgentCore Identity completes the flow only if this token belongs to the user the authorization URL was issued for.
app.post('/api/complete-auth', async (req, res) => {
  const userToken = bearerToken(req)
  const { sessionUri } = req.body as { sessionUri?: unknown }
  if (!userToken || typeof sessionUri !== 'string') {
    res.status(400).json({ error: 'Sign in first, then open the authorization link again' })
    return
  }

  try {
    await identityClient.send(new CompleteResourceTokenAuthCommand({ sessionUri, userIdentifier: { userToken } }))
    res.json({})
  } catch (error) {
    res.status(403).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

// The web app passes users' tokens on, so only this machine may reach it
app.listen(port, '127.0.0.1', () => {
  console.log(`Web app on http://localhost:${port}, calling ${runtimeUrl}`)
})
