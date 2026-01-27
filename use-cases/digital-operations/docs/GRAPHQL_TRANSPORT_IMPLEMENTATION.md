# GraphQL Transport Implementation Plan

## Overview

This document outlines the implementation plan for replacing HTTP streaming with GraphQL subscriptions to enable `useChat` functionality on AWS Amplify Hosting, which does not support HTTP streaming for Next.js API routes.

## Problem Statement

- AWS Amplify Hosting has a 30-second timeout for Lambda functions backing Next.js API routes
- AWS Amplify does not support HTTP streaming (ReadableStream) for Next.js API routes
- Current implementation using `streamText()` with HTTP streaming fails after 30 seconds
- Need real-time streaming without HTTP streaming constraints

## Solution Architecture

### High-Level Flow

```
1. Client calls GraphQL mutation: startChatStream(chatSessionId, messages, modelId)
   ↓
2. Mutation returns immediately with streamId (< 1 second)
   ↓
3. Client subscribes to GraphQL subscription: onChatChunk(streamId)
   ↓
4. Lambda processes AI request asynchronously:
   - Calls streamText() with MCP tools
   - Publishes each chunk to AppSync subscription
   - No timeout issues (can run up to 15 minutes)
   ↓
5. Client receives real-time updates via WebSocket
   ↓
6. Custom transport converts GraphQL chunks to AI SDK format
   ↓
7. useChat processes as normal (all features work!)
```

### Components to Implement

1. **GraphQL Schema Updates** (`amplify/data/resource.ts`)
2. **Lambda Function** (`amplify/functions/chat-stream/`)
3. **Custom Transport** (`src/lib/graphql-chat-transport.ts`)
4. **Client Integration** (`src/components/ChatBox.tsx`)

## Detailed Implementation

### 1. GraphQL Schema (`amplify/data/resource.ts`)

#### New Custom Types

```typescript
ChatStreamChunk: a.customType({
  streamId: a.string().required(),
  chunkType: a.string().required(), // 'text-delta', 'tool-call', 'tool-result', 'finish', 'error'
  textDelta: a.string(),
  toolCallId: a.string(),
  toolName: a.string(),
  toolArgs: a.json(),
  toolResult: a.json(),
  finishReason: a.string(),
  usage: a.json(),
  error: a.string(),
  timestamp: a.datetime().required(),
})
```

#### New Mutation

```typescript
.mutation('startChatStream', {
  input: {
    chatSessionId: a.string().required(),
    messages: a.json().required(),
    modelId: a.string().required(),
    systemPrompt: a.string(),
  },
  output: {
    streamId: a.string().required(),
  },
  handler: a.handler.function(chatStreamFunction),
  authorization: [allow.authenticated()],
})
```

#### New Subscription

```typescript
.subscription('onChatChunk', {
  for: ['startChatStream'],
  input: {
    streamId: a.string().required(),
  },
  output: a.ref('ChatStreamChunk'),
  authorization: [allow.owner()],
})
```

### 2. Lambda Function (`amplify/functions/chat-stream/`)

#### File Structure

```
amplify/functions/chat-stream/
├── resource.ts          # Function definition
├── handler.ts          # Main handler
├── stream-processor.ts # Stream processing logic
└── appsync-publisher.ts # AppSync publishing utilities
```

#### resource.ts

```typescript
import { defineFunction } from '@aws-amplify/backend'

export const chatStreamFunction = defineFunction({
  name: 'chat-stream',
  entry: './handler.ts',
  timeoutSeconds: 300, // 5 minutes
  memoryMB: 2048,
  environment: {
    APPSYNC_ENDPOINT: process.env.APPSYNC_ENDPOINT,
  },
})
```

#### handler.ts

```typescript
import { v4 as uuid } from 'uuid'
import { processStream } from './stream-processor'

export const handler = async (event: any) => {
  const { chatSessionId, messages, modelId, systemPrompt } = event.arguments
  const streamId = uuid()

  console.log(`Starting chat stream ${streamId} for session ${chatSessionId}`)

  // Start async processing (don't await)
  processStream({
    streamId,
    chatSessionId,
    messages,
    modelId,
    systemPrompt,
  }).catch((error) => {
    console.error(`Stream ${streamId} error:`, error)
    // Error will be published to subscription in processStream
  })

  // Return immediately
  return { streamId }
}
```

#### stream-processor.ts

```typescript
import { streamText, convertToModelMessages } from 'ai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { getMcpClientAndTools } from '@/lib/mcpCache'
import { publishChunk } from './appsync-publisher'

const SYSTEM_PROMPT = `...` // Your existing system prompt

export async function processStream(options: {
  streamId: string
  chatSessionId: string
  messages: any[]
  modelId: string
  systemPrompt?: string
}) {
  const { streamId, chatSessionId, messages, modelId, systemPrompt } = options

  try {
    // Initialize Bedrock
    const bedrock = createAmazonBedrock({
      region: process.env.AWS_REGION,
    })

    const model = bedrock(modelId)

    // Get MCP tools
    const { mcpTools } = await getMcpClientAndTools(/* tokens */)

    // Stream text with AI SDK
    const result = streamText({
      model,
      messages: convertToModelMessages(messages),
      system: systemPrompt || SYSTEM_PROMPT,
      tools: mcpTools,
      maxSteps: 5, // Reduced from 20 for faster responses
    })

    // Process stream and publish chunks
    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          await publishChunk(streamId, {
            chunkType: 'text-delta',
            textDelta: part.textDelta,
            timestamp: new Date().toISOString(),
          })
          break

        case 'tool-call':
          await publishChunk(streamId, {
            chunkType: 'tool-call',
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            toolArgs: part.args,
            timestamp: new Date().toISOString(),
          })
          break

        case 'tool-result':
          await publishChunk(streamId, {
            chunkType: 'tool-result',
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            toolResult: part.result,
            timestamp: new Date().toISOString(),
          })
          break

        case 'finish':
          await publishChunk(streamId, {
            chunkType: 'finish',
            finishReason: part.finishReason,
            usage: part.usage,
            timestamp: new Date().toISOString(),
          })
          break
      }
    }

    console.log(`Stream ${streamId} completed successfully`)
  } catch (error) {
    console.error(`Stream ${streamId} failed:`, error)

    // Publish error to subscription
    await publishChunk(streamId, {
      chunkType: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  }
}
```

#### appsync-publisher.ts

```typescript
import { AppSyncClient, EvaluateCodeCommand } from '@aws-sdk/client-appsync'

const client = new AppSyncClient({ region: process.env.AWS_REGION })

export async function publishChunk(streamId: string, chunk: any) {
  const mutation = `
    mutation PublishChunk($input: ChatStreamChunkInput!) {
      publishChatChunk(input: $input) {
        streamId
      }
    }
  `

  await client.send(
    new EvaluateCodeCommand({
      runtime: {
        name: 'APPSYNC_JS',
        runtimeVersion: '1.0.0',
      },
      code: mutation,
      context: JSON.stringify({
        arguments: {
          input: {
            streamId,
            ...chunk,
          },
        },
      }),
    })
  )
}
```

### 3. Custom Transport (`src/lib/graphql-chat-transport.ts`)

```typescript
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '@/amplify/data/resource'

export class GraphQLChatTransport {
  private client = generateClient<Schema>()

  async sendMessages({ id, messages, body }: { id: string; messages: any[]; body: any }): Promise<Response> {
    // Start the stream
    const { data } = await this.client.mutations.startChatStream({
      chatSessionId: id,
      messages: JSON.stringify(messages),
      modelId: body.modelId,
      systemPrompt: body.systemPrompt,
    })

    const streamId = data.streamId

    // Create ReadableStream from GraphQL subscription
    const stream = new ReadableStream({
      start: async (controller) => {
        const subscription = this.client.subscriptions
          .onChatChunk({
            streamId,
          })
          .subscribe({
            next: ({ data }) => {
              // Convert GraphQL chunk to AI SDK stream format
              const encoded = this.encodeChunk(data)
              controller.enqueue(encoded)

              if (data.chunkType === 'finish' || data.chunkType === 'error') {
                controller.close()
                subscription.unsubscribe()
              }
            },
            error: (error) => {
              console.error('Subscription error:', error)
              controller.error(error)
              subscription.unsubscribe()
            },
          })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  private encodeChunk(chunk: any): Uint8Array {
    const encoder = new TextEncoder()

    // AI SDK stream protocol format
    // See: https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol
    let streamPart: any

    switch (chunk.chunkType) {
      case 'text-delta':
        streamPart = { type: 'text-delta', textDelta: chunk.textDelta }
        break

      case 'tool-call':
        streamPart = {
          type: 'tool-call',
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          args: chunk.toolArgs,
        }
        break

      case 'tool-result':
        streamPart = {
          type: 'tool-result',
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          result: chunk.toolResult,
        }
        break

      case 'finish':
        streamPart = {
          type: 'finish',
          finishReason: chunk.finishReason,
          usage: chunk.usage,
        }
        break

      case 'error':
        streamPart = {
          type: 'error',
          error: chunk.error,
        }
        break
    }

    // AI SDK format: "0:{json}\n"
    return encoder.encode(`0:${JSON.stringify(streamPart)}\n`)
  }
}
```

### 4. Client Integration (`src/components/ChatBox.tsx`)

```typescript
import { useChat } from '@ai-sdk/react'
import { GraphQLChatTransport } from '@/lib/graphql-chat-transport'

export const ChatBox = ({ chatSessionId }: ChatBoxProps) => {
  const [model, setModel] = useState<string>(models[0].id)

  const { messages, setMessages, sendMessage, status, error } = useChat({
    id: chatSessionId,
    transport: new GraphQLChatTransport(),
    onFinish: async ({ messages }) => {
      if (chatSessionId) {
        const newMessages = messages.filter((msg) => !savedMessages.current.some((savedMsg) => savedMsg.id === msg.id))
        await saveChat({ chatSessionId, messages: newMessages })
        savedMessages.current = messages
      }
    },
  })

  const handleSubmit = (message: PromptInputMessage) => {
    sendMessage(
      {
        text: message.text || 'Sent with attachments',
        files: message.files,
      },
      {
        body: {
          modelId: model,
          chatSessionId,
        },
      }
    )
  }

  // Rest of component stays the same...
}
```

## Implementation Steps

### Phase 1: Schema & Infrastructure

1. ✅ Update `amplify/data/resource.ts` with new types, mutation, and subscription
2. ✅ Create `amplify/functions/chat-stream/` directory structure
3. ✅ Implement Lambda function with stream processing
4. ✅ Deploy and test GraphQL API independently

### Phase 2: Transport Layer

5. ✅ Create `src/lib/graphql-chat-transport.ts`
6. ✅ Implement `ChatTransport` interface
7. ✅ Add stream format conversion logic
8. ✅ Test transport with mock data

### Phase 3: Integration

9. ✅ Update `ChatBox.tsx` to use new transport
10. ✅ Test end-to-end flow
11. ✅ Verify all useChat features work (tool calls, etc.)
12. ✅ Remove old API route (`src/app/api/chat/route.ts`)

### Phase 4: Testing & Optimization

13. ✅ Test on AWS Amplify (deploy)
14. ✅ Verify no timeout issues
15. ✅ Monitor performance and optimize
16. ✅ Add error handling and edge cases

## Benefits

- ✅ **No HTTP streaming required** - Uses WebSocket subscriptions
- ✅ **No timeout issues** - Mutation returns immediately
- ✅ **Keep all useChat features** - Tool calls, error handling, etc.
- ✅ **Works on AWS Amplify** - Compatible with Amplify Hosting
- ✅ **Real-time streaming** - Via GraphQL subscriptions
- ✅ **Scalable** - AppSync handles connection management

## Testing Checklist

- [ ] GraphQL mutation returns streamId quickly (< 1 second)
- [ ] Subscription receives all chunks in order
- [ ] Text streaming works correctly
- [ ] Tool calls are processed correctly
- [ ] Tool results are received and displayed
- [ ] Error handling works
- [ ] Multiple concurrent streams work
- [ ] Stream cleanup happens on completion/error
- [ ] Works in production on AWS Amplify
- [ ] No memory leaks in subscriptions

## Migration Notes

### Breaking Changes

- Old API route (`/api/chat`) will be deprecated
- Transport layer is completely replaced
- No changes needed to UI components (thanks to transport abstraction)

### Backward Compatibility

- Can run both systems in parallel during transition
- Old chats can be migrated or continue using old system
- Feature flag to switch between transports

## Future Enhancements

1. **Resume capability** - Store stream state for reconnection
2. **Chunk batching** - Combine multiple small chunks
3. **Compression** - Compress large tool results
4. **Monitoring** - Add CloudWatch metrics for stream performance
5. **Rate limiting** - Prevent abuse of streaming API

## References

- [AI SDK Transport Documentation](https://sdk.vercel.ai/docs/ai-sdk-ui/transport)
- [AI SDK Stream Protocol](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol)
- [AWS AppSync Subscriptions](https://docs.aws.amazon.com/appsync/latest/devguide/real-time-data.html)
- [Amplify Data Schema](https://docs.amplify.aws/nextjs/build-a-backend/data/set-up-data/)
