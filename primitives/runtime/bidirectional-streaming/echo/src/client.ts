import { RuntimeClient } from 'bedrock-agentcore/runtime'
import { WebSocket } from 'ws'

const REGION = process.env['AWS_REGION'] ?? 'us-east-1'
const RUNTIME_ARN = process.argv[2]

if (!RUNTIME_ARN) {
  console.error('Usage: npx tsx src/client.ts <runtime-arn>')
  console.error('Example: npx tsx src/client.ts arn:aws:bedrock-agentcore:us-east-1:123456789:runtime/my-runtime-xyz')
  process.exit(1)
}

async function main() {
  console.log('Connecting to:', RUNTIME_ARN)
  console.log('Region:', REGION)

  // Use SDK's RuntimeClient for proper SigV4 signing
  const client = new RuntimeClient({ region: REGION })

  // Generate WebSocket connection with signed headers
  const { url, headers } = await client.generateWsConnection({
    runtimeArn: RUNTIME_ARN,
    endpointName: 'DEFAULT',
  })

  console.log('WebSocket URL:', url)
  console.log('Headers:', Object.keys(headers))

  const ws = new WebSocket(url, { headers })

  ws.on('open', () => {
    console.log('Connected!')
    const testMessage = { msg: 'Hello from TypeScript client!' }
    console.log('Sending:', testMessage)
    ws.send(JSON.stringify(testMessage))
  })

  ws.on('message', (data) => {
    console.log('Received:', data.toString())
  })

  ws.on('error', (error) => {
    console.error('Error:', error.message)
  })

  ws.on('close', (code, reason) => {
    console.log('Closed:', code, reason.toString())
    process.exit(0)
  })

  // Close after 5 seconds
  setTimeout(() => {
    console.log('Closing connection...')
    ws.close()
  }, 5000)
}

main().catch(console.error)
