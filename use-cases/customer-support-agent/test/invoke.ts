#!/usr/bin/env npx tsx

import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from '@aws-sdk/client-bedrock-agentcore'
import { randomUUID } from 'crypto'

const RUNTIME_ARN = process.argv[2]
const REGION = process.env.AWS_REGION ?? 'us-east-1'

if (!RUNTIME_ARN) {
  console.log('Usage: npx tsx test/invoke.ts <runtime-arn>')
  console.log('Get ARN with: make outputs')
  process.exit(1)
}

const client = new BedrockAgentCoreClient({ region: REGION })

async function invoke(prompt: string, sessionId: string): Promise<string> {
  const response = await client.send(
    new InvokeAgentRuntimeCommand({
      runtimeSessionId: sessionId,
      agentRuntimeArn: RUNTIME_ARN,
      qualifier: 'DEFAULT',
      contentType: 'application/json',
      accept: 'text/event-stream',
      payload: Buffer.from(JSON.stringify({ prompt })),
    })
  )

  const text = await response.response!.transformToString()
  let output = ''
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6))
        if (data.text) output += data.text
      } catch {
        /* ignore parse errors */
      }
    }
  }
  return output
}

const tests = [
  'Check warranty for serial number MNO33333333',
  'I have overheating issues with my Gaming Console Pro, help me debug',
  'Can you schedule a support call for warranty renewal?',
]

for (let i = 0; i < tests.length; i++) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`QUERY: ${tests[i]}`)
  console.log('='.repeat(60))
  console.log(await invoke(tests[i], randomUUID()))
}
