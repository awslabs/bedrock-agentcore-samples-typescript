import { Sha256 } from '@aws-crypto/sha256-js'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import type { Message, SendMessageRequest, Task } from '@a2a-js/sdk'
import { Role, TaskState } from '@a2a-js/sdk'
import {
  ClientFactory,
  ClientFactoryOptions,
  DefaultAgentCardResolver,
  JsonRpcTransportFactory,
} from '@a2a-js/sdk/client'
import { HttpRequest } from '@smithy/protocol-http'
import { SignatureV4 } from '@smithy/signature-v4'
import { buildRuntimeUrl } from 'bedrock-agentcore/runtime/a2a'

const DEFAULT_LOCAL_URL = 'http://127.0.0.1:9000'

function parseArgs(argv: string[]): { baseUrl: string; prompt: string } {
  let url: string | undefined
  let runtimeArn: string | undefined
  let prompt = 'What is 25 * 4?'

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = argv[i + 1]
    if (arg === '--url' && next) {
      url = next
      i += 1
    } else if (arg === '--runtime-arn' && next) {
      runtimeArn = next
      i += 1
    } else if ((arg === '--prompt' || arg === '--payload') && next) {
      prompt = next
      i += 1
    } else if (arg && !arg.startsWith('--')) {
      prompt = arg
    }
  }

  const baseUrl = runtimeArn
    ? buildRuntimeUrl(runtimeArn, process.env['AWS_REGION'] ?? 'us-east-1')
    : (url ?? process.env['AGENT_URL'] ?? DEFAULT_LOCAL_URL)
  return { baseUrl, prompt }
}

function isAgentCoreRuntimeUrl(url: string): boolean {
  return /^https:\/\/bedrock-agentcore(?:-[a-z0-9]+)?\.[a-z0-9-]+\.amazonaws\.com\//.test(url)
}

function createSigV4Fetch(options: { service: string; region: string }): typeof fetch {
  const signer = new SignatureV4({
    service: options.service,
    region: options.region,
    sha256: Sha256,
    credentials: fromNodeProviderChain(),
  })

  return async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })
    const body = request.body ? Buffer.from(await request.arrayBuffer()) : undefined
    const signed = await signer.sign(
      new HttpRequest({
        method: request.method,
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : undefined,
        path: `${url.pathname}${url.search}`,
        headers: { ...headers, host: url.host },
        body,
      })
    )
    return fetch(request.url, { method: signed.method, headers: signed.headers, body })
  }
}

function createClientFactory(baseUrl: string, sessionId: string): ClientFactory {
  const region = process.env['AWS_REGION'] ?? 'us-east-1'
  const baseFetch: typeof fetch = isAgentCoreRuntimeUrl(baseUrl)
    ? createSigV4Fetch({ service: 'bedrock-agentcore', region })
    : (input, init) => fetch(input, init)

  const fetchWithSession: typeof fetch = (input, init) => {
    const request = new Request(input, init)
    const headers = new Headers(request.headers)
    headers.set('X-Amzn-Bedrock-AgentCore-Runtime-Session-Id', sessionId)
    return baseFetch(new Request(request, { headers }))
  }

  return new ClientFactory(
    ClientFactoryOptions.createFrom(ClientFactoryOptions.default, {
      transports: [new JsonRpcTransportFactory({ fetchImpl: fetchWithSession })],
      cardResolver: new DefaultAgentCardResolver({
        fetchImpl: fetchWithSession,
        legacyCompat: { enabled: true },
      }),
    })
  )
}

function textFromMessage(message: Message | undefined): string {
  if (!message) {
    return ''
  }
  return message.parts
    .map((part) => (part.content?.$case === 'text' ? part.content.value : ''))
    .join('')
    .trim()
}

function finalText(result: Message | Task): string {
  if ('parts' in result) {
    return textFromMessage(result)
  }
  if (result.status?.state === TaskState.TASK_STATE_FAILED) {
    throw new Error(textFromMessage(result.status.message) || 'The agent task failed')
  }
  const artifact = result.artifacts.at(-1)
  if (artifact) {
    const text = textFromMessage({ parts: artifact.parts } as Message)
    if (text) {
      return text
    }
  }
  return textFromMessage(result.status?.message)
}

async function main(): Promise<void> {
  const { baseUrl, prompt } = parseArgs(process.argv.slice(2))
  const sessionId = crypto.randomUUID()
  const client = await createClientFactory(baseUrl, sessionId).createFromUrl(baseUrl)
  const card = await client.getAgentCard()

  console.log('Agent card:')
  console.log(JSON.stringify(card, null, 2))

  const request: SendMessageRequest = {
    tenant: '',
    metadata: {},
    message: {
      messageId: crypto.randomUUID(),
      role: Role.ROLE_USER,
      parts: [
        {
          content: { $case: 'text', value: prompt },
          metadata: undefined,
          filename: '',
          mediaType: 'text/plain',
        },
      ],
      taskId: '',
      contextId: '',
      extensions: [],
      metadata: {},
      referenceTaskIds: [],
    },
    configuration: undefined,
  }

  console.log(`\nSending task: ${prompt}`)
  const result = await client.sendMessage(request)
  console.log('\nAgent reply:')
  console.log(finalText(result))
}

void main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
