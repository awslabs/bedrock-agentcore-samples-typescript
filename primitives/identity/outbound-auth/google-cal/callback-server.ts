import express, { Request, Response } from 'express'
import { BedrockAgentCoreClient, CompleteResourceTokenAuthCommand } from '@aws-sdk/client-bedrock-agentcore'

const PORT = parseInt(process.env.CALLBACK_PORT || '9090')
const REGION = process.env.AWS_REGION || 'us-east-1'

const app = express()
app.use(express.json())

const client = new BedrockAgentCoreClient({ region: REGION })

// Store user identifier (in production, use proper session storage)
let storedUserIdentifier: { userId?: string; userToken?: string } | null = null

// Health check
app.get('/ping', (_req: Request, res: Response) => {
  console.log('[callback] Health check')
  res.json({ status: 'success' })
})

// Store user identifier before OAuth flow
app.post('/userIdentifier/token', (req: Request, res: Response) => {
  console.log('[callback] Storing user identifier:', JSON.stringify(req.body))
  storedUserIdentifier = req.body
  res.json({ status: 'stored' })
})

// OAuth callback from Google
app.get('/oauth2/callback', async (req: Request, res: Response) => {
  const sessionId = req.query.session_id as string

  console.log('[callback] ========================================')
  console.log('[callback] OAuth callback received')
  console.log('[callback] session_id:', sessionId)
  console.log('[callback] All query params:', req.query)
  console.log('[callback] Stored user identifier:', storedUserIdentifier)
  console.log('[callback] ========================================')

  if (!sessionId) {
    console.error('[callback] ERROR: Missing session_id')
    res.status(400).send('Missing session_id parameter')
    return
  }

  if (!storedUserIdentifier) {
    console.error('[callback] ERROR: No user identifier stored')
    res.status(500).send('No user identifier stored. Did you start the OAuth flow correctly?')
    return
  }

  try {
    console.log('[callback] Calling CompleteResourceTokenAuth...')

    const command = new CompleteResourceTokenAuthCommand({
      sessionUri: sessionId,
      userIdentifier: storedUserIdentifier,
    })

    await client.send(command)

    console.log('[callback] SUCCESS: Token auth completed!')

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Complete</title>
          <style>
            body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; }
            .success { color: #10b981; font-size: 48px; }
          </style>
        </head>
        <body>
          <div class="success">✓</div>
          <h1>Authorization Complete</h1>
          <p>You can close this window and return to the agent.</p>
          <p style="color: #666; font-size: 12px;">Session: ${sessionId.substring(0, 20)}...</p>
        </body>
      </html>
    `)
  } catch (error) {
    console.error('[callback] ERROR completing auth:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authorization Failed</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #ef4444;">Authorization Failed</h1>
          <p>${errorMessage}</p>
          <pre style="text-align: left; background: #f3f4f6; padding: 20px; overflow: auto;">${JSON.stringify(error, null, 2)}</pre>
        </body>
      </html>
    `)
  }
})

app.listen(PORT, () => {
  console.log('[callback] ========================================')
  console.log('[callback] OAuth Callback Server Started')
  console.log(`[callback] Listening on http://localhost:${PORT}`)
  console.log(`[callback] Callback URL: http://localhost:${PORT}/oauth2/callback`)
  console.log('[callback] ========================================')
})
