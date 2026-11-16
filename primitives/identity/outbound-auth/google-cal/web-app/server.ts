import { BedrockAgentCoreClient, CompleteResourceTokenAuthCommand } from '@aws-sdk/client-bedrock-agentcore'
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation'
import express, { type Request, type Response } from 'express'
import session from 'express-session'
import { randomBytes, randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

declare module 'express-session' {
  interface SessionData {
    userId: string
    userToken: string
    runtimeSessionId: string
  }
}

const PORT = parseInt(process.env['PORT'] ?? '9090')
const REGION = process.env['AWS_REGION'] ?? 'us-east-1'
const STACK_NAME = 'AgentCore-OutboundAuthGoogleCal-default'
const LOCAL_RUNTIME_URL = process.env['RUNTIME_URL'] ?? 'http://localhost:8080/invocations'

const chatRequestSchema = z.object({ prompt: z.string().min(1) })

const identityClient = new BedrockAgentCoreClient({ region: REGION })

async function readStackOutputs(): Promise<Record<string, string>> {
  try {
    const cloudFormation = new CloudFormationClient({ region: REGION })
    const { Stacks } = await cloudFormation.send(new DescribeStacksCommand({ StackName: STACK_NAME }))
    return Object.fromEntries((Stacks?.[0]?.Outputs ?? []).map((output) => [output.OutputKey, output.OutputValue]))
  } catch (error) {
    console.log(`[webapp] Stack ${STACK_NAME} not readable (${error instanceof Error ? error.message : error})`)
    return {}
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

function resultPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
  <head><title>${escapeHtml(title)}</title></head>
  <body style="font-family: sans-serif; text-align: center; padding: 50px;">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </body>
</html>`
}

function userIdFromJwt(jwt: string): string | undefined {
  try {
    const claims = JSON.parse(Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString()) as { sub?: string }
    return claims.sub
  } catch {
    return undefined
  }
}

async function main(): Promise<void> {
  const outputs = await readStackOutputs()
  const runtimeUrl = outputs['InvocationUrl'] ?? LOCAL_RUNTIME_URL

  const app = express()
  app.use(express.json())
  // The session cookie only binds the OAuth callback to the user who started the flow; API calls use Bearer tokens.
  app.use(
    session({
      secret: process.env['SESSION_SECRET'] ?? randomBytes(32).toString('hex'),
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 },
    })
  )
  app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public')))

  app.get('/api/config', (_req: Request, res: Response): void => {
    res.json({ clientId: outputs['UserPoolClientId'] ?? '', region: REGION })
  })

  app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
    const jwt = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
    const userId = jwt && userIdFromJwt(jwt)
    if (!jwt || !userId) {
      res.status(401).json({ error: 'Missing or invalid Bearer token' })
      return
    }

    const body = chatRequestSchema.safeParse(req.body)
    if (!body.success) {
      res.status(400).json({ error: 'Request body must be {"prompt": "..."}' })
      return
    }

    // AgentCore verifies the JWT; the web app keeps it to prove who completes the OAuth flow in /oauth2/callback.
    req.session.userId = userId
    req.session.userToken = jwt
    req.session.runtimeSessionId ??= `${userId}-${randomUUID()}`
    // Saved now, not when the response ends: the callback arrives while the agent is still streaming.
    await new Promise<void>((resolve, reject) => req.session.save((error) => (error ? reject(error) : resolve())))

    try {
      const response = await fetch(runtimeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: `Bearer ${jwt}`,
          'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': req.session.runtimeSessionId,
        },
        body: JSON.stringify(body.data),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('[webapp] Runtime error:', response.status, error)
        res.status(response.status).json({ error: `Runtime error: ${error}` })
        return
      }

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      for await (const chunk of response.body ?? []) {
        res.write(chunk)
      }
      res.end()
    } catch (error) {
      console.error('[webapp] Runtime invocation error:', error)
      if (res.headersSent) {
        res.end()
        return
      }
      res.status(500).json({ error: `Failed to invoke runtime: ${error instanceof Error ? error.message : error}` })
    }
  })

  app.get('/oauth2/callback', async (req: Request, res: Response): Promise<void> => {
    const sessionUri = req.query['session_id']
    const { userId, userToken } = req.session

    if (typeof sessionUri !== 'string') {
      res.status(400).send(resultPage('Authorization failed', 'The callback URL is missing session_id.'))
      return
    }
    if (!userToken) {
      res.status(400).send(resultPage('Authorization failed', 'No signed-in user in this browser session.'))
      return
    }

    try {
      await identityClient.send(new CompleteResourceTokenAuthCommand({ sessionUri, userIdentifier: { userToken } }))
      console.log('[webapp] OAuth completed for user:', userId)
      res.send(resultPage('Authorization complete', 'You can close this window and return to the app.'))
    } catch (error) {
      console.error('[webapp] OAuth completion error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(500).send(resultPage('Authorization failed', message))
    }
  })

  app.listen(PORT, () => {
    console.log(`[webapp] Listening on http://localhost:${PORT}`)
    console.log(`[webapp] Runtime: ${runtimeUrl}`)
  })
}

await main()
