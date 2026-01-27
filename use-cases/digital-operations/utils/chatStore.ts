import { UIMessage } from 'ai'

import { generateClient } from 'aws-amplify/data'
import { type Schema } from '@/../amplify/data/resource'

const amplifyClient = generateClient<Schema>()

export async function createChat(): Promise<string> {
  const { data: newChatSessionData, errors: newChatSessionErrors } = await amplifyClient.models.ChatSession.create({})
  console.log(`Created chat session with id ${newChatSessionData?.id}`)
  if (newChatSessionData) return newChatSessionData.id
  else throw new Error(JSON.stringify(newChatSessionErrors?.map((error) => JSON.stringify(error))))
}

export async function listChats(): Promise<
  Array<{ id: string; name?: string; createdAt?: string; firstMessage?: string }>
> {
  console.log('Loading all chat sessions')
  const { data: chatSessionData, errors: chatSessionErrors } = await amplifyClient.models.ChatSession.list()

  if (chatSessionData) {
    // Fetch the first message for each chat session
    const chatsWithMessages = await Promise.all(
      chatSessionData.map(async (session) => {
        try {
          // Get the first message for this session
          const { data: messages } = await amplifyClient.models.ChatMessage.listChatMessageByChatSessionIdAndCreatedAt({
            chatSessionId: session.id,
          })

          let firstMessageText: string | undefined
          if (messages && messages.length > 0) {
            const message = messages[0]
            // Extract text from the first message's parts
            const parts = typeof message.parts === 'string' ? JSON.parse(message.parts) : message.parts
            if (Array.isArray(parts) && parts.length > 0) {
              // Get the first text part
              const textPart = parts.find((part: any) => typeof part === 'string' || part?.type === 'text')
              if (textPart) {
                firstMessageText = typeof textPart === 'string' ? textPart : textPart.text
              }
            }
          }

          return {
            id: session.id,
            name: session.name ?? undefined,
            createdAt: session.createdAt ?? undefined,
            firstMessage: firstMessageText,
          }
        } catch (error) {
          console.error(`Error fetching first message for session ${session.id}:`, error)
          return {
            id: session.id,
            name: session.name ?? undefined,
            createdAt: session.createdAt ?? undefined,
          }
        }
      })
    )

    return chatsWithMessages
  } else throw new Error(JSON.stringify(chatSessionErrors?.map((error) => error.message)))
}

export async function loadChat(id: string): Promise<UIMessage[]> {
  console.log(`Loading chat messages for chat session ${id}`)
  const { data: chatMessageData, errors: chatMessageErrors } =
    await amplifyClient.models.ChatMessage.listChatMessageByChatSessionIdAndCreatedAt({
      chatSessionId: id,
    })
  if (chatMessageData) {
    // Transform ChatMessage data to UIMessage format
    // Filter out messages with null roles and map to UIMessage structure

    console.log(`Loaded ${chatMessageData.length} messages`)
    return chatMessageData
      .filter((msg) => msg.role !== null)
      .map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        parts: typeof msg.parts === 'string' ? JSON.parse(msg.parts) : msg.parts,
        createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
        ...(msg.metadata && {
          metadata: typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata,
        }),
      }))
  } else throw new Error(JSON.stringify(chatMessageErrors?.map((error) => error.message)))
  // return JSON.parse(await readFile(getChatFile(id), 'utf8'));
}

export async function saveChat({
  chatSessionId,
  messages,
}: {
  chatSessionId: string
  messages: UIMessage[]
}): Promise<void> {
  console.log(`Saving ${messages.length} chat messages to chat session ${chatSessionId}`)

  // Create all messages in parallel using Promise.all
  const results = await Promise.all(
    messages.map((message) => {
      // // Debug: Log the message parts structure
      // console.log('Message:', JSON.stringify(message, null, 2));

      // Stringify parts for GraphQL JSON field
      const parts = JSON.stringify(message.parts || [])

      // Extract createdAt from metadata if it exists, otherwise use current time
      let createdAt: string
      if (message.metadata && typeof message.metadata === 'object' && 'createdAt' in message.metadata) {
        createdAt = (message.metadata as any).createdAt
      } else {
        createdAt = new Date().toISOString()
      }

      const messageData: Schema['ChatMessage']['createType'] = {
        chatSessionId,
        role: message.role,
        parts,
        createdAt,
      }

      if (message.metadata) {
        // Stringify metadata for GraphQL JSON field
        messageData.metadata = JSON.stringify(message.metadata)
      }

      // console.log('Sending message data:', JSON.stringify(messageData, null, 2));
      return amplifyClient.models.ChatMessage.create(messageData)
    })
  )

  const errors = results
    .filter((result) => result.errors && result.errors.length > 0)
    .flatMap((result) => result.errors)

  if (errors.length > 0) {
    console.error('Full error details:', JSON.stringify(results, null, 2))
    throw new Error(JSON.stringify(errors.map((error) => error!.message)))
  }

  console.log(`Saved ${results.length} messages`)
}

export async function deleteChat(id: string): Promise<void> {
  console.log(`Deleting chat session with id ${id}`)
  const { data: deletedChatData, errors: deleteChatErrors } = await amplifyClient.models.ChatSession.delete({
    id: id,
  })
  if (deleteChatErrors && deleteChatErrors.length > 0) {
    throw new Error(JSON.stringify(deleteChatErrors.map((error) => error.message)))
  }
  console.log(`Successfully deleted chat session with id ${deletedChatData?.id}`)
}
