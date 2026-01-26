# Quick Fix Reference - Mission Control Errors

## TL;DR

Fixed two issues causing Mission Control page failures:
1. **Invalid MapLayer records** → Frontend now filters them out gracefully
2. **Chat session race condition** → Removed unused query causing the issue

## Quick Diagnosis

### See this error?
```
Cannot return null for non-nullable type: 'String' within parent 'MapLayer'
```
**Fix:** Page now handles this automatically. Optionally run cleanup script.

### See this error?
```json
{ "getChatSession": null }
```
**Fix:** Already fixed - query removed. Refresh page.

## For Users Experiencing Issues

### Immediate Fix (No Code Changes)
1. Refresh the page
2. Page should work now (errors handled gracefully)
3. Check console for warnings (informational only)

### Permanent Fix (Optional)
```bash
# Clean up invalid MapLayer records
npx tsx scripts/cleanupInvalidMapLayers.ts
```

## For Developers

### What Changed?

**MapViewer.tsx & mission-control/page.tsx:**
- ✅ Validates MapLayer records before using them
- ✅ Filters out null/invalid records
- ✅ Continues rendering with valid data only
- ✅ Logs helpful warnings

**mission-control/page.tsx:**
- ✅ Removed unused `getChatSession` query
- ✅ Added initialization guard
- ✅ Better error handling

### Prevention

**Creating MapLayers:**
```typescript
// ✅ DO THIS
await client.models.MapLayer.create({
  athenaQuery: 'SELECT ...',
  athenaDatabase: 'database',
  geoJsonMapping: JSON.stringify({...}),
  // ... other fields
});

// ❌ NOT THIS
await client.models.MapLayer.create({
  athenaQuery: null, // Will cause errors!
});
```

**Querying New Records:**
```typescript
// ✅ DO THIS
if (!isInitializing && sessionId) {
  await queryData(sessionId);
}

// ❌ NOT THIS
const id = await createRecord();
await queryRecord(id); // Race condition!
```

## Documentation

- **Full Details:** `docs/MISSION_CONTROL_ERROR_FIXES_SUMMARY.md`
- **MapLayer Issues:** `docs/MAP_LAYER_ERROR_HANDLING.md`
- **Race Condition:** `docs/CHAT_SESSION_RACE_CONDITION_FIX.md`

## Testing

```bash
# Test new session
open http://localhost:3000/mission-control

# Test existing session
open http://localhost:3000/mission-control?id=existing-id

# Test invalid session
open http://localhost:3000/mission-control?id=invalid-id
```

All should work without errors.
