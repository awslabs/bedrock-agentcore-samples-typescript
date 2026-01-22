/* global fetch */
import express, { Request, Response } from 'express'
import session from 'express-session'
import { BedrockAgentCoreClient, CompleteResourceTokenAuthCommand } from '@aws-sdk/client-bedrock-agentcore'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: string
    userToken: string // Full JWT token for CompleteResourceTokenAuth
  }
}

// Read agent config from .bedrock_agentcore.yaml (created by agentcore deploy)
interface AgentConfig {
  runtimeArn: string | undefined
  region: string | undefined
  clientId: string | undefined
}

function getAgentConfig(): AgentConfig | null {
  const configPath = '.bedrock_agentcore.yaml'
  if (!fs.existsSync(configPath)) {
    console.log('[webapp] No .bedrock_agentcore.yaml found, using localhost')
    return null
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = yaml.load(fs.readFileSync(configPath, 'utf8')) as any
    const defaultAgent = config.default_agent
    const agentConfig = config.agents?.[defaultAgent]

    if (!agentConfig) {
      console.log('[webapp] No agent config found in .bedrock_agentcore.yaml')
      return null
    }

    // Extract clientId from authorizer configuration
    const clientId = agentConfig.authorizer_configuration?.customJWTAuthorizer?.allowedClients?.[0]

    return {
      runtimeArn: agentConfig.bedrock_agentcore?.agent_arn,
      region: agentConfig.aws?.region,
      clientId,
    }
  } catch (error) {
    console.error('[webapp] Error reading .bedrock_agentcore.yaml:', error)
    return null
  }
}

const agentConfig = getAgentConfig()

// DEMO ONLY: Store last user info for callback fallback when testing with curl
// In production, rely on proper session binding only
let lastUserId: string | null = null
let lastUserToken: string | null = null // Full JWT for CompleteResourceTokenAuth

// Build deployed endpoint URL (falls back to localhost if not deployed)
const PORT = parseInt(process.env.WEBAPP_PORT || '9090')
const REGION = agentConfig?.region || process.env.AWS_REGION || 'us-east-1'
const RUNTIME_URL = agentConfig?.runtimeArn
  ? `https://bedrock-agentcore.${REGION}.amazonaws.com/runtimes/${encodeURIComponent(agentConfig.runtimeArn)}/invocations?qualifier=DEFAULT`
  : process.env.RUNTIME_URL || 'http://localhost:8080'

const app = express()
app.use(express.json())

// Session middleware - enables cookie-based session tracking
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
)

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')))

const client = new BedrockAgentCoreClient({ region: REGION })

// Check AWS credentials at startup
const stsClient = new STSClient({ region: REGION })
stsClient.send(new GetCallerIdentityCommand({}))
  .then(identity => {
    console.log('[webapp] AWS credentials OK:', identity.Arn)
  })
  .catch(err => {
    console.error('[webapp] WARNING: AWS credentials not available:', err.message)
    console.error('[webapp] CompleteResourceTokenAuth will fail without valid credentials')
  })

// Health check
app.get('/ping', (_req: Request, res: Response) => {
  console.log('[webapp] Health check')
  res.json({ status: 'success' })
})

// GET /api/config - Return Cognito config for frontend auto-population
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    clientId: agentConfig?.clientId || '',
    region: REGION,
  })
})

// POST /api/chat - Invoke agent with JWT authentication
app.post('/api/chat', async (req: Request, res: Response) => {
  console.log('[webapp] ========================================')
  console.log('[webapp] POST /api/chat')

  // Extract JWT from Authorization header
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[webapp] ERROR: Missing or invalid Authorization header')
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  const jwt = authHeader.replace('Bearer ', '')

  // Decode JWT to extract userId (we decode, don't verify - Runtime handles verification)
  let userId: string
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString())
    userId = payload.sub
    console.log('[webapp] Decoded JWT, userId:', userId)
  } catch (error) {
    console.error('[webapp] ERROR: Invalid JWT format')
    res.status(401).json({ error: 'Invalid JWT format' })
    return
  }

  // Store userId and full JWT in session for the OAuth callback
  req.session.userId = userId
  req.session.userToken = jwt // Full JWT needed for CompleteResourceTokenAuth
  lastUserId = userId // DEMO: fallback for curl testing
  lastUserToken = jwt // DEMO: fallback for curl testing
  console.log('[webapp] Stored userId in session:', userId)
  console.log('[webapp] Stored full JWT in session (length):', jwt.length)

  // Get prompt from request body
  const { prompt } = req.body
  if (!prompt) {
    res.status(400).json({ error: 'Missing prompt in request body' })
    return
  }

  console.log('[webapp] Prompt:', prompt)

  try {
    // Generate a session ID for the runtime (must be >= 33 chars)
    // Use a UUID which is 36 characters
    const runtimeSessionId = `${userId}-${randomUUID()}`

    // Invoke AgentCore Runtime with required headers
    console.log('[webapp] Invoking Runtime at:', RUNTIME_URL)
    console.log('[webapp] Runtime Session ID:', runtimeSessionId)
    const response = await fetch(RUNTIME_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${jwt}`, // Forward JWT to deployed runtime
        'x-amzn-bedrock-agentcore-runtime-session-id': runtimeSessionId,
        'X-Amzn-Bedrock-AgentCore-Runtime-User-Id': userId,
      },
      body: JSON.stringify({ prompt }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[webapp] Runtime error:', response.status, error)
      res.status(response.status).json({ error: `Runtime error: ${error}` })
      return
    }

    // Stream response back to client
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const reader = response.body?.getReader()
    if (!reader) {
      res.status(500).json({ error: 'No response body from runtime' })
      return
    }

    const decoder = new TextDecoder()
    let done = false

    while (!done) {
      const result = await reader.read()
      done = result.done

      if (result.value) {
        const chunk = decoder.decode(result.value, { stream: true })
        res.write(chunk)
      }
    }

    res.end()
    console.log('[webapp] Response stream complete')
  } catch (error) {
    console.error('[webapp] ERROR invoking runtime:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: `Failed to invoke runtime: ${errorMessage}` })
  }
})

// GET /oauth2/callback - Complete OAuth binding using session
app.get('/oauth2/callback', async (req: Request, res: Response) => {
  const sessionUri = req.query.session_id as string

  // DEMO: Use fallbacks when testing with curl (different session than browser)
  const userId = req.session.userId || lastUserId
  const userToken = req.session.userToken || lastUserToken

  console.log('[webapp] ========================================')
  console.log('[webapp] OAuth callback received')
  console.log('[webapp] Full URL:', req.protocol + '://' + req.get('host') + req.originalUrl)
  console.log('[webapp] session_id (from query):', sessionUri)
  console.log('[webapp] error (from query):', req.query.error)
  console.log('[webapp] error_description:', req.query.error_description)
  console.log('[webapp] userId (from session):', req.session.userId)
  console.log('[webapp] userId (fallback):', lastUserId)
  console.log('[webapp] userId (using):', userId)
  console.log('[webapp] userToken (from session):', req.session.userToken ? `${req.session.userToken.substring(0, 30)}...` : 'undefined')
  console.log('[webapp] userToken (fallback):', lastUserToken ? `${lastUserToken.substring(0, 30)}...` : 'null')
  console.log('[webapp] userToken (using):', userToken ? `${userToken.substring(0, 30)}...` : 'MISSING')
  console.log('[webapp] All query params:', req.query)
  console.log('[webapp] ========================================')

  if (!sessionUri) {
    console.error('[webapp] ERROR: Missing session_id in query params')
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authorization Failed</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #ef4444;">Missing session_id</h1>
          <p>The OAuth callback URL is missing the session_id parameter.</p>
        </body>
      </html>
    `)
    return
  }

  if (!userToken) {
    console.error('[webapp] ERROR: No userToken available - user must call /api/chat first')
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authorization Failed</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #ef4444;">Session Not Found</h1>
          <p>No user token found. Please call the /api/chat endpoint first.</p>
          <p style="color: #666; font-size: 12px;">This ensures proper session binding for security.</p>
        </body>
      </html>
    `)
    return
  }

  try {
    console.log('[webapp] Calling CompleteResourceTokenAuth...')
    console.log('[webapp]   sessionUri:', sessionUri)
    console.log('[webapp]   userToken:', userToken.substring(0, 30) + '...')

    const command = new CompleteResourceTokenAuthCommand({
      sessionUri,
      userIdentifier: { userToken },  // Use full JWT, not just userId
    })

    await client.send(command)

    console.log('[webapp] SUCCESS: Token auth completed!')

    const usingFallback = !req.session.userId && lastUserId
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Complete</title>
          <style>
            body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; }
            .success { color: #10b981; font-size: 48px; }
            .warning { color: #f59e0b; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="success">&#10003;</div>
          <h1>Authorization Complete</h1>
          <p>You can close this window and retry your request.</p>
          <p style="color: #666; font-size: 12px;">Session bound to user: ${userId}</p>
          ${usingFallback ? '<p class="warning">Note: Used fallback userId (curl testing mode). In production, use browser-based flow for proper session binding.</p>' : ''}
        </body>
      </html>
    `)
  } catch (error) {
    console.error('[webapp] ERROR completing auth:', error)
    // Log more details about the error
    if (error && typeof error === 'object') {
      const e = error as Record<string, unknown>
      console.error('[webapp] Error details:')
      console.error('[webapp]   name:', e.name)
      console.error('[webapp]   message:', e.message)
      console.error('[webapp]   $fault:', e['$fault'])
      console.error('[webapp]   $metadata:', JSON.stringify(e['$metadata']))
    }
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
  console.log('[webapp] ========================================')
  console.log('[webapp] Web App with Session Management Started')
  console.log(`[webapp] Listening on http://localhost:${PORT}`)
  console.log('[webapp]')
  console.log(`[webapp] Frontend: http://localhost:${PORT}`)
  console.log(`[webapp] API endpoint: POST http://localhost:${PORT}/api/chat`)
  console.log(`[webapp] OAuth callback: http://localhost:${PORT}/oauth2/callback`)
  console.log('[webapp]')
  if (agentConfig?.runtimeArn) {
    console.log('[webapp] Using DEPLOYED runtime:')
    console.log(`[webapp]   Region: ${REGION}`)
    console.log(`[webapp]   ARN: ${agentConfig.runtimeArn}`)
  } else {
    console.log('[webapp] Using LOCAL runtime (agentcore dev):')
    console.log(`[webapp]   URL: ${RUNTIME_URL}`)
    console.log('[webapp]   Note: Deploy with "agentcore deploy" to use deployed runtime')
  }
  console.log('[webapp] ========================================')
})
