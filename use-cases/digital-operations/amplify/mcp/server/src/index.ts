import express, { Request, Response } from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { mcpServerCreate } from './server'

const PORT = 8000
const app = express()
app.use(express.json())

// Add this to handle root path invocations
app.all('/', async (req: Request, res: Response) => {
  console.log('Root path invoked')
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Root path invoked. Call the /mcp path',
      },
      id: null,
    })
  )
})

app.post('/mcp', async (req: Request, res: Response) => {
  console.log('mcp path invoked')

  const server = mcpServerCreate()
  try {
    const transport = new StreamableHTTPServerTransport({
      // enableJsonResponse: true
    })
    // transport.onclose = () => void
    await server.connect(transport as Transport)
    await transport.handleRequest(req, res, req.body)
    res.on('close', () => {
      console.log('Request closed')
      transport.close()
      server.close()
    })
  } catch (error) {
    console.error('Error handling MCP request:', error)
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      })
    }
  }
})

app.get('/mcp', async (req: Request, res: Response) => {
  console.log('Received GET MCP request')
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.',
      },
      id: null,
    })
  )
})

// Health check endpoint for AWS Bedrock runtime monitoring
app.get('/health', (req: Request, res: Response) => {
  console.log('Health check request received')
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MCP Server',
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bedrock agentcore Typescript MCP server running on port ${PORT}`)
})
