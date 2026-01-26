# Query-Based Map Layers

## Overview

Map layers now support two modes:
1. **Static GeoJSON**: Traditional approach where GeoJSON data is provided directly
2. **Query-Based**: Store an Athena SQL query that generates GeoJSON data dynamically

Query-based layers allow the map to display fresh data from your data lake without manually converting query results to GeoJSON.

## Benefits

- **Always Fresh**: Layers can be refreshed to show the latest data
- **Simplified Workflow**: AI agent can create layers by writing SQL queries instead of processing data
- **Query Validation**: Queries are validated before layer creation to catch errors early
- **Automatic Execution**: Frontend automatically executes queries when layers are created or updated
- **Error Handling**: Query errors are captured and displayed in the UI

## Data Model

The `MapLayer` model now includes these additional fields:

```typescript
{
  // Static GeoJSON (optional)
  geoJsonData?: JSON,
  
  // Query-based fields (optional)
  athenaQuery?: string,           // SQL query to generate GeoJSON
  athenaDatabase?: string,         // Database for the query
  geoJsonMapping?: JSON,           // Instructions for converting results to GeoJSON
  queryRefreshInterval?: number,   // Minutes between auto-refresh (0 = manual)
  lastQueryExecutedAt?: datetime,  // Track when query was last run
  queryError?: string,             // Store any query execution errors
}
```

A layer must have either `geoJsonData` OR `athenaQuery`, but not both.

## GeoJSON Mapping Configuration

The `geoJsonMapping` field tells the system how to convert query results to GeoJSON:

### Point Geometry

```json
{
  "geometryType": "Point",
  "longitudeField": "longitude",
  "latitudeField": "latitude",
  "propertyFields": ["name", "status", "type", "operator"]
}
```

### LineString Geometry

```json
{
  "geometryType": "LineString",
  "coordinatesField": "coordinates",
  "propertyFields": ["name", "length", "status"]
}
```

The `coordinatesField` should contain a JSON array of coordinates: `[[lon1, lat1], [lon2, lat2], ...]`

### Polygon Geometry

```json
{
  "geometryType": "Polygon",
  "coordinatesField": "coordinates",
  "propertyFields": ["name", "area", "type"]
}
```

The `coordinatesField` should contain a JSON array of coordinate rings: `[[[lon1, lat1], [lon2, lat2], ...]]`

## AI Agent Tool Usage

### Creating a Query-Based Layer

```typescript
await createMapLayer({
  name: "Active Wells in T30N R6W",
  type: "point",
  athenaQuery: `
    SELECT 
      id,
      name,
      type,
      status,
      latitude,
      longitude,
      ogrid_name as operator,
      last_production_date
    FROM upstream.well_header
    WHERE ulstr LIKE '%-30N-06W'
      AND status = 'Active'
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
  `,
  athenaDatabase: "upstream",
  geoJsonMapping: {
    geometryType: "Point",
    longitudeField: "longitude",
    latitudeField: "latitude",
    propertyFields: ["id", "name", "type", "status", "operator", "last_production_date"]
  },
  style: {
    color: "#22c55e",
    radius: 6,
    opacity: 0.8,
    strokeWidth: 1,
    strokeColor: "#ffffff"
  },
  description: "Active wells in Township 30 North, Range 6 West",
  source: "athena-query"
});
```

### Query Validation

When creating a query-based layer, the tool automatically:
1. Executes the query against Athena
2. Validates the query syntax and database access
3. Converts results to GeoJSON using the mapping configuration
4. Returns validation errors if the query fails

This ensures that only valid queries are stored in the layer.

### Creating a Static Layer

Static layers work as before:

```typescript
await createMapLayer({
  name: "Custom Markers",
  type: "point",
  geoJsonData: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [-108.2, 36.8] },
        properties: { name: "Location A" }
      }
    ]
  },
  style: { color: "#ef4444", radius: 8 }
});
```

## Frontend Behavior

### Automatic Query Execution

When the `MapViewer` component detects a layer with `athenaQuery` but no `geoJsonData`:

1. Automatically calls `executeMapLayerQuery` mutation
2. Shows a loading indicator (⏳) in the layer legend
3. Updates the layer with the generated GeoJSON data
4. Displays any errors (⚠️) in the layer legend

### Subscription Updates

The MapViewer subscribes to layer changes:
- When a new query-based layer is created → automatically executes the query
- When a layer is updated with a new query → re-executes the query
- When geoJsonData is updated → immediately renders the new data

### Layer Legend Indicators

- 🔄 = Query-based layer (has athenaQuery)
- ⏳ = Query currently executing
- ⚠️ = Query error (hover to see error message)
- 👁️ = Layer visible
- 👁️‍🗨️ = Layer hidden

## Backend Implementation

### Lambda Function: `executeMapLayerQuery`

The Athena query Lambda now handles two types of requests:

1. **Standard Athena Query** (`executeAthenaQuery`): Returns raw query results
2. **Map Layer Query** (`executeMapLayerQuery`): Executes query and converts to GeoJSON

The `executeMapLayerQuery` mutation:
- Validates the mapping configuration
- Executes the Athena query
- Polls for completion (up to 2 minutes)
- Converts results to GeoJSON using the mapping
- Returns success/error status

### Error Handling

Query errors are captured at multiple levels:

1. **Validation**: Syntax errors, missing fields, invalid mapping
2. **Execution**: Athena query failures, timeout, permission errors
3. **Conversion**: Invalid coordinates, missing required fields

All errors are stored in the `queryError` field and displayed in the UI.

## Example Queries

### Wells by Production Status

```sql
SELECT 
  id,
  name,
  status,
  latitude,
  longitude,
  CAST(daily_oil_rate AS DOUBLE) as oil_rate,
  CAST(daily_gas_rate AS DOUBLE) as gas_rate
FROM upstream.well_header wh
LEFT JOIN upstream.monthly_production mp 
  ON REPLACE(wh.id, '-', '') = mp.api
WHERE wh.latitude IS NOT NULL
  AND wh.longitude IS NOT NULL
  AND mp.date = (SELECT MAX(date) FROM upstream.monthly_production)
ORDER BY oil_rate DESC
LIMIT 500
```

### Pipeline Network

```sql
SELECT 
  pipeline_id as id,
  pipeline_name as name,
  status,
  coordinates  -- JSON array: [[lon1,lat1], [lon2,lat2], ...]
FROM infrastructure.pipelines
WHERE status = 'Active'
```

Mapping:
```json
{
  "geometryType": "LineString",
  "coordinatesField": "coordinates",
  "propertyFields": ["id", "name", "status"]
}
```

### Lease Boundaries

```sql
SELECT 
  lease_id as id,
  lease_name as name,
  operator,
  boundary_coordinates  -- JSON array: [[[lon1,lat1], [lon2,lat2], ...]]
FROM land.leases
WHERE status = 'Active'
```

Mapping:
```json
{
  "geometryType": "Polygon",
  "coordinatesField": "boundary_coordinates",
  "propertyFields": ["id", "name", "operator"]
}
```

## Future Enhancements

Potential improvements:
- Auto-refresh based on `queryRefreshInterval`
- Manual refresh button in UI
- Query result caching
- Incremental updates for large datasets
- Support for more complex geometries (MultiPoint, MultiLineString, MultiPolygon)

## Related Files

- `amplify/data/resource.ts` - Schema definition
- `amplify/functions/athena-query/handler.ts` - Query execution logic
- `src/components/MapViewer.tsx` - Frontend rendering and query execution
- `amplify/agent/server/src/tools/mutationTools.ts` - AI agent tools
