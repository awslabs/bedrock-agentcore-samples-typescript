# Chat Session Race Condition Fix

## Problem

The Mission Control page was experiencing a race condition where `getChatSession` would return `null` even though a session was just created:

```json
{
  "data": {
    "getChatSession": null,
    ...
  }
}
```

## Root Cause

### The Race Condition Flow:

1. **Page loads** → `initializeChatSession()` runs
2. **No session ID in URL** → Creates new session via `createChat()`
3. **Session created** → `setChatSessionId(newSessionId)` updates state
4. **State change triggers** → `loadMissionControlData()` useEffect runs
5. **GraphQL query executes** → `getChatSession(id: $chatSessionId)`
6. **DynamoDB eventual consistency** → Session not yet available for read
7. **Result** → `getChatSession` returns `null`

### Why This Happens:

- **DynamoDB Eventual Consistency**: When you create a record, it might not be immediately available for queries
- **Timing Issue**: The query runs too quickly after creation
- **No Retry Logic**: The query fails once and doesn't retry

## Solutions Implemented

### 1. Removed Unused `getChatSession` Query

The `getChatSession` query was included in the batch GraphQL query but **the result was never used**. Removing it eliminates the race condition entirely.

**Before:**
```typescript
const result = await client.graphql({
  query: `
    query GetMissionControlData($chatSessionId: ID!) {
      getChatSession(id: $chatSessionId) {  // ❌ Not used, causes race condition
        id
        name
        createdAt
        updatedAt
      }
      listActionItems { ... }
      listWorkoverJobs { ... }
      listMapLayers { ... }
    }
  `,
  variables: { chatSessionId }
});
```

**After:**
```typescript
const result = await client.graphql({
  query: `
    query GetMissionControlData($chatSessionId: ID!) {
      // ✅ Removed getChatSession - not needed
      listActionItems { ... }
      listWorkoverJobs { ... }
      listMapLayers { ... }
    }
  `,
  variables: { chatSessionId }
});
```

### 2. Added Initialization Guard

Prevent data loading until the session is fully initialized:

```typescript
async function loadMissionControlData() {
  // Don't load data until session is initialized
  if (!chatSessionId || isInitializingSession) {
    console.log('Waiting for chat session initialization...');
    return;
  }
  
  console.log('Loading mission control data for session:', chatSessionId);
  // ... proceed with loading
}
```

### 3. Improved Logging

Added better logging to track session initialization:

```typescript
if (urlSessionId) {
  const result = await client.models.ChatSession.get({ id: urlSessionId });
  if (result.data) {
    console.log('Using existing chat session:', urlSessionId);
    setChatSessionId(urlSessionId);
  } else {
    console.log('Session not found, creating new session');
    // ...
  }
} else {
  console.log('No session ID in URL, creating new session');
  // ...
}
```

### 4. Updated useEffect Dependencies

Added `isInitializingSession` to the dependency array to ensure proper timing:

```typescript
useEffect(() => {
  async function loadMissionControlData() {
    // ...
  }
  loadMissionControlData();
}, [chatSessionId, isInitializingSession]); // ✅ Added isInitializingSession
```

## Why This Fix Works

1. **No Race Condition**: By removing the unused `getChatSession` query, we eliminate the race condition entirely
2. **Proper Sequencing**: The initialization guard ensures data loading waits for session creation
3. **Session Validation**: The session is validated in `initializeChatSession` before being used
4. **Better Error Handling**: Improved logging helps debug any remaining issues

## Testing

To verify the fix works:

1. **New Session**: Navigate to `/mission-control` without an ID parameter
   - Should create a new session
   - Should load data successfully
   - Console should show: "No session ID in URL, creating new session"

2. **Existing Session**: Navigate to `/mission-control?id=existing-session-id`
   - Should use the existing session
   - Should load data successfully
   - Console should show: "Using existing chat session: ..."

3. **Invalid Session**: Navigate to `/mission-control?id=invalid-id`
   - Should detect invalid session
   - Should create a new session
   - Console should show: "Session not found, creating new session"

## Related Issues

This fix also addresses:
- GraphQL errors showing `getChatSession: null`
- Page failing to load when session is newly created
- Inconsistent behavior between users (some see errors, others don't)

## Prevention

To prevent similar issues in the future:

1. **Don't query data you don't use** - Remove unnecessary queries
2. **Handle eventual consistency** - Add guards for newly created records
3. **Validate before using** - Check session exists before querying related data
4. **Add proper logging** - Track initialization flow for debugging

## Files Changed

- `src/app/(with-layout)/(with-auth)/mission-control/page.tsx`
  - Removed `getChatSession` from GraphQL query
  - Added initialization guard
  - Improved logging
  - Updated useEffect dependencies
