# Map Layer Refactor Summary

## Overview
Removed the `geoJsonData` field from the MapLayer schema to enforce query-based map layers. All map layers now require an Athena query that is executed on the frontend to generate GeoJSON data dynamically.

## Changes Made

### 1. Schema Changes (`amplify/data/resource.ts`)
- **Removed**: `geoJsonData: a.json()` field from MapLayer model
- **Made Required**: `athenaQuery` and `athenaDatabase` fields are now required
- **Made Required**: `geoJsonMapping` field is now required

The MapLayer model now enforces that all layers must be query-based:
```typescript
MapLayer: a.model({
  // ... other fields
  athenaQuery: a.string().required(),
  athenaDatabase: a.string().required(),
  geoJsonMapping: a.json().required(),
  // ... other fields
})
```

### 2. Mission Control Page (`src/app/(with-layout)/(with-auth)/mission-control/page.tsx`)
- **Removed**: `WellData` interface (no longer needed)
- **Removed**: Direct Athena query execution for wells
- **Removed**: `createFallbackWellsLayer()` function
- **Updated**: `createOrUpdateWellsLayer()` now creates a layer with query configuration instead of pre-fetched GeoJSON data
- **Updated**: `loadWellsData()` now only creates the layer configuration
- **Removed**: Import of `executeAthenaQuery` (no longer used directly)
- **Updated**: GraphQL query to fetch layer metadata without geoJsonData field

### 3. MapViewer Component (`src/components/MapViewer.tsx`)
- **Added**: `layerGeoJsonData` state to store GeoJSON data separately from layer metadata
- **Updated**: `MapLayer` interface to make query fields required and remove geoJsonData
- **Updated**: `executeLayerQuery()` to store GeoJSON data in component state instead of updating the database
- **Updated**: `fetchLayers()` to always execute queries for all loaded layers
- **Updated**: onCreate subscription to always execute queries for new layers
- **Updated**: Rendering logic to use `layerGeoJsonData` state instead of `layer.geoJsonData`
- **Updated**: Legend to show query execution status correctly

## Data Flow

### Before
1. Mission Control page executes Athena query
2. Transforms results to GeoJSON
3. Creates MapLayer with geoJsonData field
4. MapViewer reads geoJsonData from database and renders

### After
1. Mission Control page creates MapLayer with query configuration only
2. MapViewer detects new layer
3. MapViewer executes query via `executeMapLayerQuery` mutation
4. Backend transforms Athena results to GeoJSON
5. MapViewer stores GeoJSON in component state
6. MapViewer renders from state

## Benefits

1. **Separation of Concerns**: Layer metadata is stored in the database, while transient GeoJSON data is kept in component state
2. **Reduced Database Size**: No large GeoJSON blobs stored in DynamoDB
3. **Always Fresh Data**: Queries are executed on-demand, ensuring data is current
4. **Consistent Pattern**: All layers follow the same query-based pattern
5. **Better Performance**: GeoJSON data is not transferred through GraphQL subscriptions

## Migration Notes

- Existing layers with `geoJsonData` will need to be migrated to use query configuration
- The schema change will require a database migration
- Any code that creates MapLayers must now provide `athenaQuery`, `athenaDatabase`, and `geoJsonMapping`

## Testing Recommendations

1. Test layer creation with valid query configuration
2. Test query execution and GeoJSON transformation
3. Test error handling for failed queries
4. Test layer visibility toggling
5. Test multiple layers rendering simultaneously
6. Test layer updates and re-execution of queries
