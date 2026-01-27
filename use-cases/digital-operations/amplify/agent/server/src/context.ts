/**
 * Request context management for storing per-request data
 * that needs to be accessed by tools during execution.
 */

// Store the current chat session ID for tool access
// This is set per-request and accessed by tool handlers
let currentChatSessionId: string | undefined

/**
 * Set the chat session ID for the current request
 */
export function setCurrentChatSessionId(sessionId: string | undefined): void {
  currentChatSessionId = sessionId
}

/**
 * Get the current chat session ID for the active request
 */
export function getCurrentChatSessionId(): string | undefined {
  return currentChatSessionId
}
