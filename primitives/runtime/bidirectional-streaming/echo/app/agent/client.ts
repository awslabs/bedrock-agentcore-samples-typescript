import { randomUUID } from 'node:crypto'
import { RuntimeClient } from 'bedrock-agentcore/runtime'
import { WebSocket } from 'ws'

const target = process.argv[2]

if (!target) {
  console.error('Usage: npm run client -- <ws://localhost:8080/ws | runtime-arn>')
  process.exit(1)
}

async function connect(urlOrArn: string): Promise<WebSocket> {
  if (urlOrArn.startsWith('ws://')) {
    return new WebSocket(urlOrArn, { headers: { 'x-amzn-bedrock-agentcore-runtime-session-id': randomUUID() } })
  }

  const region = urlOrArn.split(':')[3]
  const { url, headers } = await new RuntimeClient({ region }).generateWsConnection({ runtimeArn: urlOrArn })
  return new WebSocket(url, { headers })
}

const ws = await connect(target)

ws.on('open', () => {
  console.log('Connected')
  ws.send(JSON.stringify({ message: 'hello' }))
  ws.send('not json')
  setTimeout(() => ws.close(), 3000)
})

ws.on('message', (data) => {
  console.log('Received:', String(data))
})

ws.on('error', (error) => {
  console.error('Error:', error.message)
})

ws.on('close', () => {
  console.log('Closed')
})
