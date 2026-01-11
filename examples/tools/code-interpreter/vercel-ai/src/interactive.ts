/* global fetch, TextDecoder */
import * as readline from 'readline'

const SERVER_URL = process.env['SERVER_URL'] || 'http://localhost:8080'
const SESSION_ID = `session-${Date.now()}`

async function sendPrompt(prompt: string) {
  const response = await fetch(`${SERVER_URL}/invocations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'x-amzn-bedrock-agentcore-runtime-session-id': SESSION_ID,
    },
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.text) {
            process.stdout.write(data.text)
          }
        } catch {
          // Skip non-JSON data lines
        }
      }
    }
  }
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve))

  console.log('Code Interpreter Agent (type "exit" to quit)')
  console.log(`Connecting to ${SERVER_URL} with session ${SESSION_ID}\n`)

  while (true) {
    const prompt = await ask('> ')
    if (prompt.toLowerCase() === 'exit') break
    if (!prompt.trim()) continue

    try {
      await sendPrompt(prompt)
      console.log('\n')
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}\n`)
    }
  }

  rl.close()
}

main().catch(console.error)
