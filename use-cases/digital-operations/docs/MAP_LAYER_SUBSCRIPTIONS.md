# Map Layer Real-Time Subscriptions

## Overview

The map layers use GraphQL subscriptions to automatically update when layers are created, updated, or deleted. This ensures that map layers appear immediately on the map without requiring a page refresh.

Map layers support two modes:

1. **Static GeoJSON**: Traditional approach where GeoJSON data is provided directly
2. **Query-Based**: Store an Athena SQL query that generates GeoJSON data dynamically (see [QUERY_BASED_MAP_LAYERS.md](./QUERY_BASED_MAP_LAYERS.md))

## How It Works

### 1. Schema Configuration

The `MapLayer` model in `amplify/data/resource.ts` has authorization rules that allow authenticated users to create, read, update, and delete layers:

```typescript
.authorization((allow) => [
  allow.owner(),
  allow.authenticated().to(["read", "create", "update", "delete"]),
  allow.guest().to(["read"])
])
```

This enables AWS Amplify to automatically generate GraphQL subscriptions for:

- `onCreate` - Triggered when a new layer is created
- `onUpdate` - Triggered when a layer is updated
- `onDelete` - Triggered when a layer is deleted

### 2. MapViewer Component Subscriptions

The `MapViewer` component (`src/components/MapViewer.tsx`) subscribes to all three events:

```typescript
// Subscribe to onCreate events
const createSub = client.models.MapLayer.onCreate({
  filter: { chatSessionId: { eq: chatSessionId } },
}).subscribe({
  next: (newLayer) => {
    console.log('New map layer created:', newLayer)
    setLayers((prevLayers) => {
      const exists = prevLayers.some((l) => l.id === newLayer.id)
      if (exists) return prevLayers
      return [...prevLayers, newLayer as MapLayer]
    })
  },
})

// Subscribe to onUpdate events
const updateSub = client.models.MapLayer.onUpdate({
  filter: { chatSessionId: { eq: chatSessionId } },
}).subscribe({
  next: (updatedLayer) => {
    console.log('Map layer updated:', updatedLayer)
    setLayers((prevLayers) => prevLayers.map((layer) => (layer.id === updatedLayer.id ? updatedLayer : layer)))
  },
})

// Subscribe to onDelete events
const deleteSub = client.models.MapLayer.onDelete({
  filter: { chatSessionId: { eq: chatSessionId } },
}).subscribe({
  next: (deletedLayer) => {
    console.log('Map layer deleted:', deletedLayer)
    setLayers((prevLayers) => prevLayers.filter((layer) => layer.id !== deletedLayer.id))
  },
})
```

### 3. Benefits

- **Real-time Updates**: Map layers appear immediately when created by any source (AI agent, Athena queries, user actions)
- **No Polling**: Uses WebSocket connections instead of polling, reducing server load
- **Automatic Cleanup**: Subscriptions are automatically cleaned up when the component unmounts
- **Session Isolation**: Each chat session only receives updates for its own layers via the `chatSessionId` filter
- **Query Execution**: For query-based layers, the frontend automatically executes the Athena query when a new layer is created

## Usage Example

### Static Layer Creation

When the mission control page loads wells from Athena and creates a static layer:

1. The Athena query completes and creates a `MapLayer` record with `geoJsonData`
2. The GraphQL subscription immediately notifies the `MapViewer` component
3. The new layer is added to the state and rendered on the map
4. Console logs show: "New map layer created: [layer data]"

### Query-Based Layer Creation

When the AI agent creates a query-based layer:

1. The agent calls `createMapLayer` with `athenaQuery` and `geoJsonMapping`
2. The query is validated before the layer is created
3. The GraphQL subscription notifies the `MapViewer` component
4. The MapViewer detects the layer has no `geoJsonData` yet
5. The MapViewer automatically executes the query via `executeMapLayerQuery`
6. When the query completes, the layer is updated with `geoJsonData`
7. The update subscription triggers and the layer is rendered on the map

See [QUERY_BASED_MAP_LAYERS.md](./QUERY_BASED_MAP_LAYERS.md) for more details on query-based layers.

## Debugging

To debug subscription issues:

1. Check browser console for subscription logs:
   - "Initial map layers loaded: X"
   - "New map layer created: [data]"
   - "Map layer updated: [data]"
   - "Map layer deleted: [data]"

2. Verify WebSocket connection in browser DevTools Network tab (filter by "WS")

3. Check that the `chatSessionId` matches between the layer creation and the MapViewer

4. Ensure authentication is working (subscriptions require authenticated users)

## Related Files

- `amplify/data/resource.ts` - Schema definition with authorization rules
- `src/components/MapViewer.tsx` - Map component with subscriptions
- `src/app/(with-layout)/(with-auth)/mission-control/page.tsx` - Creates map layers from Athena queries
