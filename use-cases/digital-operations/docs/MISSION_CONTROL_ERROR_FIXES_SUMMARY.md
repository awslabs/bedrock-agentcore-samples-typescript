# Mission Control Error Fixes - Complete Summary

## Overview

Fixed two critical issues causing the Mission Control page to fail for some users:

1. **MapLayer GraphQL Schema Violations** - Invalid MapLayer records with null required fields
2. **Chat Session Race Condition** - `getChatSession` returning null for newly created sessions

## Issue 1: MapLayer Schema Violations

### Problem
```javascript
GraphQL errors: [
  {
    "path": ["listMapLayers", "items", 0, "athenaQuery"],
    "message": "Cannot return null for non-nullable type: 'String' within parent 'MapLayer'"
  },
  // ... similar errors for athenaDatabase and geoJsonMapping
]
```

### Root Cause
- MapLayer records in database with `null` values for required fields
- GraphQL schema defines these fields as non-nullable (String!, AWSJSON!)
- When GraphQL encounters null for non-nullable field, returns `null` for entire object
- Result: `listMapLayers.items` contains `[null]`
- Frontend tries to access `.id` on null → crash

### Why User-Specific
- Each user has unique `chatSessionId`
- MapLayers filtered by `chatSessionId`
- Only users with invalid MapLayers in their session see the error

### Solutions Implemented

#### Frontend Validation (MapViewer.tsx)
```typescript
// Filter out null/invalid layers
const validLayers = result.data.filter((layer): layer is MapLayer => {
  if (!layer) {
    console.warn('Filtered out null/undefined map layer');
    return false;
  }
  
  // Check required fields
  if (!layer.athenaQuery || !layer.athenaDatabase || !layer.geoJsonMapping) {
    console.warn('Filtered out map layer with missing required fields:', layer.id);
    return false;
  }
  
  return true;
});
```

#### Subscription Validation
```typescript
// onCreate subscription
if (!newLayer || !newLayer.athenaQuery || !newLayer.athenaDatabase || !newLayer.geoJsonMapping) {
  console.warn('Received invalid layer, ignoring');
  return;
}
```

#### Mission Control Page Validation
```typescript
// Filter and validate map layers from GraphQL response
const validMapLayers = mapLayersData.filter((layer: unknown) => {
  if (!layer) return false;
  
  const mapLayer = layer as Record<string, unknown>;
  if (!mapLayer.athenaQuery || !mapLayer.athenaDatabase || !mapLayer.geoJsonMapping) {
    console.warn('Filtered out map layer with missing required fields');
    return false;
  }
  
  return true;
});
```

#### Cleanup Script
Created `scripts/cleanupInvalidMapLayers.ts` to identify and remove invalid records:

```bash
npx tsx scripts/cleanupInvalidMapLayers.ts
```

## Issue 2: Chat Session Race Condition

### Problem
```json
{
  "data": {
    "getChatSession": null,
    ...
  }
}
```

### Root Cause
**Race Condition Flow:**
1. Page loads → creates new session
2. `setChatSessionId(newSessionId)` updates state
3. State change triggers `loadMissionControlData()`
4. GraphQL query executes `getChatSession(id: $chatSessionId)`
5. DynamoDB eventual consistency → session not yet available
6. Result: `getChatSession` returns `null`

### Solutions Implemented

#### 1. Removed Unused Query
The `getChatSession` query was never used - removed it entirely:

```typescript
// Before: ❌
query GetMissionControlData($chatSessionId: ID!) {
  getChatSession(id: $chatSessionId) { ... }  // Not used!
  listActionItems { ... }
}

// After: ✅
query GetMissionControlData($chatSessionId: ID!) {
  listActionItems { ... }  // Only query what we need
}
```

#### 2. Added Initialization Guard
```typescript
async function loadMissionControlData() {
  // Don't load data until session is initialized
  if (!chatSessionId || isInitializingSession) {
    console.log('Waiting for chat session initialization...');
    return;
  }
  // ... proceed with loading
}
```

#### 3. Improved Session Initialization
```typescript
if (urlSessionId) {
  const result = await client.models.ChatSession.get({ id: urlSessionId });
  if (result.data) {
    console.log('Using existing chat session:', urlSessionId);
    setChatSessionId(urlSessionId);
  } else {
    console.log('Session not found, creating new session');
    const newSessionId = await createChat();
    setChatSessionId(newSessionId);
    router.replace(`/mission-control?id=${newSessionId}`);
  }
}
```

#### 4. Updated Dependencies
```typescript
useEffect(() => {
  loadMissionControlData();
}, [chatSessionId, isInitializingSession]); // Added isInitializingSession
```

## Files Modified

### Core Components
- `src/components/MapViewer.tsx`
  - Added validation for initial load
  - Added validation for subscriptions
  - Improved error handling and logging

- `src/app/(with-layout)/(with-auth)/mission-control/page.tsx`
  - Removed unused `getChatSession` query
  - Added initialization guard
  - Added MapLayer validation
  - Improved error handling and logging

### New Files
- `scripts/cleanupInvalidMapLayers.ts` - Utility to clean up invalid records
- `docs/MAP_LAYER_ERROR_HANDLING.md` - Detailed MapLayer error documentation
- `docs/CHAT_SESSION_RACE_CONDITION_FIX.md` - Race condition fix documentation
- `docs/MAP_LAYER_FIX_SUMMARY.md` - Quick reference for MapLayer fixes
- `docs/MISSION_CONTROL_ERROR_FIXES_SUMMARY.md` - This file

## Testing Checklist

### MapLayer Validation
- [ ] Page loads without crashing when invalid MapLayers exist
- [ ] Console shows warnings for filtered layers
- [ ] Valid MapLayers render correctly on map
- [ ] Invalid MapLayers are silently filtered out

### Chat Session Handling
- [ ] New session: Navigate to `/mission-control` (no ID)
  - Creates new session
  - Loads data successfully
  - No `getChatSession: null` error
  
- [ ] Existing session: Navigate to `/mission-control?id=valid-id`
  - Uses existing session
  - Loads data successfully
  
- [ ] Invalid session: Navigate to `/mission-control?id=invalid-id`
  - Detects invalid session
  - Creates new session
  - Loads data successfully

### Error Handling
- [ ] GraphQL errors logged but don't crash page
- [ ] Helpful warnings in console
- [ ] Page continues to function with partial data
- [ ] User sees appropriate error messages

## For Your Co-worker

The page should now work correctly. If they still see issues:

1. **Refresh the page** - Frontend now handles errors gracefully
2. **Check console** - Look for warnings about filtered layers
3. **Run cleanup script** (optional):
   ```bash
   npx tsx scripts/cleanupInvalidMapLayers.ts
   ```
4. **Try new session** - Navigate to `/mission-control` without ID parameter

## Prevention Guidelines

### When Creating MapLayers
```typescript
// ✅ Always set required fields
await client.models.MapLayer.create({
  athenaQuery: 'SELECT ...',      // Required!
  athenaDatabase: 'my_database',  // Required!
  geoJsonMapping: JSON.stringify({...}), // Required!
  // ... other fields
});

// ❌ Don't create with null required fields
await client.models.MapLayer.create({
  athenaQuery: null,  // Will cause GraphQL errors!
  // ...
});
```

### When Querying New Records
```typescript
// ✅ Add guards for newly created records
if (!chatSessionId || isInitializingSession) {
  return; // Wait for initialization
}

// ❌ Don't query immediately after creation
const newId = await createRecord();
const result = await queryRecord(newId); // May fail due to eventual consistency
```

## Monitoring

Watch for these console messages:

**Good Signs:**
- "Using existing chat session: ..."
- "Loading mission control data for session: ..."
- "Initial map layers loaded: X valid out of Y total"

**Warning Signs (but handled gracefully):**
- "Filtered out X invalid map layers"
- "Filtered out map layer with missing required fields"
- "MapLayer-specific errors detected (likely invalid data)"

**Error Signs (need investigation):**
- "Failed to load mission control data"
- "Error fetching map layers"
- Repeated failures to create sessions
