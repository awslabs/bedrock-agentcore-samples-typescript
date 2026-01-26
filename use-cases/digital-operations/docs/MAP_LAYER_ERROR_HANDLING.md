# MapLayer Error Handling

## Problem

When loading the Mission Control page, some users may encounter GraphQL errors related to MapLayer records:

```
Cannot return null for non-nullable type: 'String' within parent 'MapLayer' (/listMapLayers/items[0]/athenaQuery)
```

This error occurs when a MapLayer record in the database has `null` values for required fields:
- `athenaQuery` (String!)
- `athenaDatabase` (String!)
- `geoJsonMapping` (AWSJSON!)

## Why This Happens

1. **Schema Enforcement**: The GraphQL schema defines these fields as non-nullable (required)
2. **Invalid Data**: A MapLayer record exists in the database with null values for these fields
3. **GraphQL Behavior**: When GraphQL encounters a null value for a non-nullable field, it returns `null` for the entire object
4. **Result**: The `listMapLayers` query returns `[null]` instead of a valid array of layers

## User-Specific Issue

This issue is **session-specific** because:
- Each user has their own `chatSessionId`
- MapLayers are filtered by `chatSessionId`
- If User A has an invalid MapLayer in their session, only User A sees the error
- User B with a different session won't see the error (unless they also have invalid data)

## Solutions Implemented

### 1. Frontend Graceful Handling

Both `MapViewer.tsx` and `mission-control/page.tsx` now:

- **Filter out null items** from GraphQL responses
- **Validate required fields** before processing layers
- **Log warnings** when invalid data is detected
- **Continue rendering** with valid data only
- **Display helpful error messages** in the console

Example validation:
```typescript
const validLayers = result.data.filter((layer): layer is MapLayer => {
  if (!layer) {
    console.warn('Filtered out null/undefined map layer');
    return false;
  }
  
  if (!layer.athenaQuery || !layer.athenaDatabase || !layer.geoJsonMapping) {
    console.warn('Filtered out map layer with missing required fields:', layer.id);
    return false;
  }
  
  return true;
});
```

### 2. Subscription Validation

Real-time subscriptions (onCreate, onUpdate) now validate incoming layers:

```typescript
// Validate the new layer
if (!newLayer || !newLayer.athenaQuery || !newLayer.athenaDatabase || !newLayer.geoJsonMapping) {
  console.warn('Received invalid layer, ignoring');
  return;
}
```

### 3. Cleanup Script

Use the cleanup script to identify and remove invalid MapLayer records:

```bash
npx tsx scripts/cleanupInvalidMapLayers.ts
```

The script will:
1. List all MapLayer records
2. Identify those with missing required fields
3. Display details about invalid records
4. (Optionally) Delete them

**Note**: The deletion code is commented out by default for safety. Uncomment it to actually delete invalid records.

## How to Fix for Your Co-worker

### Option 1: Let Frontend Handle It (Easiest)
The frontend now gracefully handles invalid data. Your co-worker should:
1. Refresh the page
2. Check the browser console for warnings about filtered layers
3. The page should work normally, just without the invalid layers

### Option 2: Clean Up Database (Recommended)
Run the cleanup script to permanently remove invalid records:

```bash
# 1. Review invalid records
npx tsx scripts/cleanupInvalidMapLayers.ts

# 2. If you want to delete them, uncomment the deletion code in the script
# 3. Run again to delete
npx tsx scripts/cleanupInvalidMapLayers.ts
```

### Option 3: Manual Database Cleanup
If you have database access, you can manually delete invalid MapLayer records:

```sql
-- Find invalid records
SELECT * FROM MapLayer 
WHERE athenaQuery IS NULL 
   OR athenaDatabase IS NULL 
   OR geoJsonMapping IS NULL;

-- Delete them (be careful!)
DELETE FROM MapLayer 
WHERE athenaQuery IS NULL 
   OR athenaDatabase IS NULL 
   OR geoJsonMapping IS NULL;
```

## Prevention

To prevent this issue in the future:

1. **Always set required fields** when creating MapLayers:
   ```typescript
   await client.models.MapLayer.create({
     id: layerId,
     chatSessionId,
     name: 'My Layer',
     athenaQuery: 'SELECT ...',      // Required!
     athenaDatabase: 'my_database',  // Required!
     geoJsonMapping: JSON.stringify({...}), // Required!
     // ... other fields
   });
   ```

2. **Validate before creating** in your code:
   ```typescript
   if (!athenaQuery || !athenaDatabase || !geoJsonMapping) {
     throw new Error('Missing required MapLayer fields');
   }
   ```

3. **Use TypeScript** to catch missing fields at compile time

## Debugging

If you encounter this issue:

1. **Check browser console** for warnings about filtered layers
2. **Look for GraphQL errors** in the console
3. **Note the chatSessionId** from the URL (`?id=...`)
4. **Run the cleanup script** to identify problematic records
5. **Check if the issue is session-specific** by trying a different session

## Related Files

- `src/components/MapViewer.tsx` - Map component with validation
- `src/app/(with-layout)/(with-auth)/mission-control/page.tsx` - Mission control page
- `scripts/cleanupInvalidMapLayers.ts` - Cleanup utility
- `amplify/data/resource.ts` - GraphQL schema definition
