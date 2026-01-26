# Map Layer Integration Guide

This guide explains how the GenAI agent integrates with the query-based map layer system.

## Overview

The map system allows the AI agent to create dynamic, data-driven map layers by writing SQL queries against AWS Athena. Each chat session can have multiple map layers that automatically execute queries and render GeoJSON data on the map.

**Key Features:**
- **Query-Based**: Layers are defined by SQL queries, not static GeoJSON
- **Real-Time Updates**: Frontend subscribes to layer changes and executes queries automatically
- **Data-Driven Styling**: Color scales, radius scales, and tooltips based on query result properties
- **Automatic Validation**: Queries are validated before layer creation

## Architecture

### Data Flow

```
AI Agent → create-map-layer tool → Validates Query → Creates MapLayer record
                                                              ↓
Frontend MapViewer ← Subscription ← MapLayer created
         ↓
Executes athenaQuery → Generates GeoJSON → Renders on map
```

### Data Model

```typescript
MapLayer {
  id: string
  chatSessionId: string
  name: string
  type: 'point' | 'line' | 'polygon' | 'heatmap' | 'geojson'
  visible: boolean
  
  // Query-based fields
  athenaQuery: string              // SQL query to generate data
  athenaDatabase: string           // Database name (e.g., "upstream")
  geoJsonMapping: JSON             // How to convert query results to GeoJSON
  queryRefreshInterval: number     // Minutes between auto-refresh (0 = manual)
  lastQueryExecutedAt: datetime    // Last execution timestamp
  queryError: string               // Any query errors
  
  // Styling
  style: JSON                      // Style configuration with data-driven options
  order: number                    // Z-index for layer ordering
  
  // Metadata
  description: string
  source: string                   // e.g., "ai-created", "athena-query"
}
```

### AI Agent Tools

The AI has access to four map layer tools:

1. **create-map-layer** - Create query-based layers with SQL and GeoJSON mapping
2. **update-map-layer** - Modify layer queries, styles, or visibility
3. **delete-map-layer** - Remove layers
4. **list-map-layers** - Query existing layers for the current chat session

## Using the MapViewer Component

### Basic Usage

```tsx
import { MapViewer } from '@/components/MapViewer';

function MissionControlPage() {
  const chatSessionId = 'your-session-id';
  
  return (
    <div>
      <h1>Mission Control</h1>
      <MapViewer chatSessionId={chatSessionId} />
    </div>
  );
}
```

### Custom Configuration

```tsx
<MapViewer
  chatSessionId={chatSessionId}
  height="800px"
  initialViewState={{
    longitude: -108.2,
    latitude: 36.8,
    zoom: 10
  }}
/>
```

### How It Works

1. **MapViewer subscribes** to MapLayer changes for the chat session
2. **When a layer is created/updated**, MapViewer detects the change
3. **Frontend executes** the `athenaQuery` via the `executeMapLayerQuery` mutation
4. **Query results are converted** to GeoJSON using the `geoJsonMapping` configuration
5. **GeoJSON is rendered** on the map with the specified `style`

## AI Usage Examples

### Example 1: Creating Point Layers with Production Data

**User:** "Show me all wells in T30N R6W colored by production decline"

**AI creates layer with:**
```javascript
{
  name: "Wells in T30N R6W",
  type: "point",
  athenaQuery: `
    WITH recent_production AS (
      SELECT 
        REPLACE(mp.api, '-', '') as api_clean,
        AVG(CASE WHEN mp.date >= DATE '2024-12-01' 
            THEN CAST(mp.dailygasrate AS DOUBLE) END) as last_month_avg,
        AVG(CASE WHEN mp.date >= DATE '2024-01-01'
            THEN CAST(mp.dailygasrate AS DOUBLE) END) as twelve_month_avg
      FROM upstream.monthly_production mp
      WHERE mp.dailygasrate IS NOT NULL
      GROUP BY REPLACE(mp.api, '-', '')
    )
    SELECT 
      wh.id,
      wh.name,
      wh.latitude,
      wh.longitude,
      COALESCE(rp.last_month_avg, 0) as last_month_production,
      COALESCE(rp.twelve_month_avg, 0) as avg_12month_production,
      COALESCE(rp.last_month_avg - rp.twelve_month_avg, 0) as production_decline
    FROM upstream.well_header wh
    LEFT JOIN recent_production rp ON REPLACE(wh.id, '-', '') = rp.api_clean
    WHERE wh.ulstr LIKE '%-30N-06W'
  `,
  athenaDatabase: "upstream",
  geoJsonMapping: {
    geometryType: "Point",
    longitudeField: "longitude",
    latitudeField: "latitude",
    propertyFields: ["id", "name", "last_month_production", 
                     "avg_12month_production", "production_decline"]
  },
  style: {
    radius: 6,
    opacity: 0.8,
    strokeWidth: 1,
    strokeColor: "#ffffff",
    colorScale: {
      type: "linear",
      property: "production_decline",
      stops: [
        [-100, "#dc2626"],  // Red for declining
        [-50, "#f97316"],   // Orange
        [-10, "#fbbf24"],   // Yellow
        [0, "#d1d5db"],     // Gray for stable
        [10, "#84cc16"],    // Light green
        [50, "#22c55e"],    // Green for increasing
        [100, "#16a34a"]    // Dark green
      ],
      defaultColor: "#9ca3af"
    },
    tooltip: {
      title: "name",
      fields: [
        { property: "production_decline", label: "Decline", format: "number", unit: "MCF/D" },
        { property: "last_month_production", label: "Last Month", format: "number", unit: "MCF/D" },
        { property: "avg_12month_production", label: "12-Mo Avg", format: "number", unit: "MCF/D" }
      ]
    }
  },
  description: "Wells colored by production decline (last month vs 12-month average)",
  source: "ai-created"
}
```

**Result:** Map displays wells as colored circles where:
- Red = production declining
- Gray = stable production  
- Green = production increasing
- Hover shows well name and production metrics

### Example 2: Creating Line Layers for Pipelines

**User:** "Draw the pipeline network connecting these wells"

**AI creates layer with:**
```javascript
{
  name: "Pipeline Network",
  type: "line",
  athenaQuery: `
    SELECT 
      p.id,
      p.name,
      p.diameter,
      p.pressure,
      p.coordinates  -- Array of [lon, lat] pairs
    FROM upstream.pipelines p
    WHERE p.status = 'Active'
  `,
  athenaDatabase: "upstream",
  geoJsonMapping: {
    geometryType: "LineString",
    coordinatesField: "coordinates",  // Field containing coordinate array
    propertyFields: ["id", "name", "diameter", "pressure"]
  },
  style: {
    color: "#3b82f6",
    width: 3,
    opacity: 0.9,
    tooltip: {
      title: "name",
      fields: [
        { property: "diameter", label: "Diameter", format: "number", unit: "inches" },
        { property: "pressure", label: "Pressure", format: "number", unit: "PSI" }
      ]
    }
  }
}
```

### Example 3: Creating Polygon Layers for Lease Boundaries

**User:** "Highlight the lease boundaries in this area"

**AI creates layer with:**
```javascript
{
  name: "Lease Boundaries",
  type: "polygon",
  athenaQuery: `
    SELECT 
      l.id,
      l.lease_name,
      l.acres,
      l.operator,
      l.boundary_coords  -- Array of coordinate arrays
    FROM upstream.leases l
    WHERE l.township = '30N' AND l.range = '6W'
  `,
  athenaDatabase: "upstream",
  geoJsonMapping: {
    geometryType: "Polygon",
    coordinatesField: "boundary_coords",
    propertyFields: ["id", "lease_name", "acres", "operator"]
  },
  style: {
    color: "#10b981",
    opacity: 0.3,
    strokeColor: "#059669",
    strokeWidth: 2,
    tooltip: {
      title: "lease_name",
      fields: [
        { property: "acres", label: "Acres", format: "number" },
        { property: "operator", label: "Operator", format: "text" }
      ]
    }
  }
}
```

### Example 4: Creating Heatmaps for Production Density

**User:** "Show production density heatmap"

**AI creates layer with:**
```javascript
{
  name: "Production Density",
  type: "heatmap",
  athenaQuery: `
    SELECT 
      w.latitude,
      w.longitude,
      SUM(p.daily_oil_rate) as total_production
    FROM upstream.wells w
    JOIN upstream.production p ON w.id = p.well_id
    WHERE p.date >= DATE '2024-01-01'
    GROUP BY w.latitude, w.longitude
  `,
  athenaDatabase: "upstream",
  geoJsonMapping: {
    geometryType: "Point",
    longitudeField: "longitude",
    latitudeField: "latitude",
    propertyFields: ["total_production"]
  },
  style: {
    radius: 30,
    intensity: 1.5,
    opacity: 0.7
  }
}
```

## GeoJSON Mapping Configuration

The `geoJsonMapping` field tells the system how to convert SQL query results into GeoJSON features.

### Point Geometry

```javascript
{
  geometryType: "Point",
  longitudeField: "longitude",  // Column name for longitude
  latitudeField: "latitude",    // Column name for latitude
  propertyFields: ["id", "name", "status", "production"]  // Columns to include as properties
}
```

**Query Example:**
```sql
SELECT id, name, status, production, latitude, longitude
FROM wells
WHERE status = 'Active'
```

### LineString Geometry

```javascript
{
  geometryType: "LineString",
  coordinatesField: "coordinates",  // Column containing array of [lon, lat] pairs
  propertyFields: ["id", "name", "diameter"]
}
```

**Query Example:**
```sql
SELECT 
  id, 
  name, 
  diameter,
  ARRAY[
    ARRAY[longitude1, latitude1],
    ARRAY[longitude2, latitude2],
    ARRAY[longitude3, latitude3]
  ] as coordinates
FROM pipelines
```

### Polygon Geometry

```javascript
{
  geometryType: "Polygon",
  coordinatesField: "boundary_coords",  // Column containing array of coordinate arrays
  propertyFields: ["id", "lease_name", "acres"]
}
```

**Query Example:**
```sql
SELECT 
  id,
  lease_name,
  acres,
  boundary_coords  -- Pre-stored as array of [lon, lat] arrays
FROM leases
```

## Style Configuration

### Static Styling

Simple, uniform styling for all features:

```javascript
{
  color: "#3b82f6",      // Fill/line color
  radius: 6,             // Point radius (pixels)
  opacity: 0.8,          // Opacity (0-1)
  strokeWidth: 1,        // Border width
  strokeColor: "#ffffff" // Border color
}
```

### Data-Driven Color Scales

#### Linear Scale (Gradient)

Color interpolates smoothly between stops:

```javascript
{
  colorScale: {
    type: "linear",
    property: "production_decline",  // Property from query results
    stops: [
      [-100, "#dc2626"],  // Red at -100
      [0, "#d1d5db"],     // Gray at 0
      [100, "#16a34a"]    // Green at 100
    ],
    defaultColor: "#9ca3af"  // Fallback for null/undefined
  }
}
```

#### Step Scale (Discrete Ranges)

Color changes at specific thresholds:

```javascript
{
  colorScale: {
    type: "step",
    property: "pressure",
    stops: [
      [0, "#22c55e"],      // Green: 0-1000
      [1000, "#fbbf24"],   // Yellow: 1000-2000
      [2000, "#dc2626"]    // Red: 2000+
    ],
    defaultColor: "#9ca3af"
  }
}
```

#### Categorical Scale

Map specific values to colors:

```javascript
{
  colorScale: {
    type: "categorical",
    property: "status",
    categories: {
      "Active": "#22c55e",
      "Inactive": "#dc2626",
      "Maintenance": "#fbbf24"
    },
    defaultColor: "#9ca3af"
  }
}
```

### Data-Driven Radius Scales

Size points based on data values:

```javascript
{
  radiusScale: {
    property: "production",
    min: 0,           // Minimum data value
    max: 5000,        // Maximum data value
    minRadius: 4,     // Radius for min value
    maxRadius: 20     // Radius for max value
  }
}
```

### Tooltip Configuration

Define what appears when hovering over features:

```javascript
{
  tooltip: {
    title: "name",  // Property to use as title (defaults to "name")
    fields: [
      {
        property: "production_decline",
        label: "Decline",
        format: "number",      // "number" | "decimal" | "currency" | "date" | "text"
        decimals: 0,           // For decimal/currency formats
        unit: "MCF/D"          // Unit to append
      },
      {
        property: "last_month_production",
        label: "Last Month",
        format: "number",
        unit: "MCF/D"
      },
      {
        property: "cost",
        label: "Estimated Cost",
        format: "currency",
        decimals: 2,
        unit: "USD"
      }
    ]
  }
}
```

### Complete Style Example

```javascript
{
  radius: 6,
  opacity: 0.8,
  strokeWidth: 1,
  strokeColor: "#ffffff",
  colorScale: {
    type: "linear",
    property: "production_decline",
    stops: [
      [-100, "#dc2626"],
      [0, "#d1d5db"],
      [100, "#16a34a"]
    ],
    defaultColor: "#9ca3af"
  },
  tooltip: {
    title: "name",
    fields: [
      { property: "production_decline", label: "Decline", format: "number", unit: "MCF/D" },
      { property: "status", label: "Status", format: "text" }
    ]
  }
}
```

## Real-Time Updates

The MapViewer component uses GraphQL subscriptions to automatically update when layers change:

```typescript
// Subscribe to layer creation
client.models.MapLayer.onCreate({
  filter: { chatSessionId: { eq: chatSessionId } }
}).subscribe({
  next: (newLayer) => {
    // Add layer to state
    // Execute query automatically
  }
});

// Subscribe to layer updates
client.models.MapLayer.onUpdate({
  filter: { chatSessionId: { eq: chatSessionId } }
}).subscribe({
  next: (updatedLayer) => {
    // Update layer in state
    // Re-execute query if query fields changed
  }
});

// Subscribe to layer deletion
client.models.MapLayer.onDelete({
  filter: { chatSessionId: { eq: chatSessionId } }
}).subscribe({
  next: (deletedLayer) => {
    // Remove layer from state and map
  }
});
```

**Query Re-execution Logic:**
- Query is executed when layer is first created
- Query is re-executed if `athenaQuery`, `athenaDatabase`, or `geoJsonMapping` changes
- Query is NOT re-executed for style-only changes (better performance)

## Workflow Example

1. **User asks**: "Show me declining wells in T30N R6W"

2. **AI analyzes request** and determines:
   - Need to query well production data
   - Calculate production decline
   - Create a point layer with color scale

3. **AI calls create-map-layer**:
   ```javascript
   await create_map_layer({
     name: "Declining Wells",
     type: "point",
     athenaQuery: "SELECT ... FROM wells ...",
     athenaDatabase: "upstream",
     geoJsonMapping: { ... },
     style: { colorScale: { ... } }
   });
   ```

4. **Backend validates query**:
   - Executes query via `executeMapLayerQuery` mutation
   - Validates GeoJSON generation
   - Returns success/error

5. **Layer record created** in database

6. **Frontend receives subscription**:
   - MapViewer detects new layer
   - Executes `athenaQuery` via `executeMapLayerQuery`
   - Converts results to GeoJSON using `geoJsonMapping`
   - Renders on map with `style`

7. **User sees map update** with colored wells

8. **User asks follow-up**: "Make the declining wells larger"

9. **AI calls update-map-layer**:
   ```javascript
   await update_map_layer({
     id: "layer-id",
     style: {
       ...existingStyle,
       radiusScale: {
         property: "production_decline",
         min: -100,
         max: 0,
         minRadius: 4,
         maxRadius: 16
       }
     }
   });
   ```

10. **Frontend receives update**:
    - Detects only style changed (no query re-execution needed)
    - Updates rendering with new style
    - Map updates instantly

## Best Practices

### 1. Query Design

- **Use efficient queries**: Add WHERE clauses to limit data
- **Limit results**: Use LIMIT clause for large datasets (< 1000 features recommended)
- **Pre-calculate values**: Compute metrics in SQL rather than client-side
- **Index columns**: Ensure queried columns are indexed in Athena

**Good:**
```sql
SELECT id, name, latitude, longitude, production
FROM wells
WHERE township = '30N' AND range = '6W'
  AND status = 'Active'
LIMIT 500
```

**Bad:**
```sql
SELECT * FROM wells  -- No filters, returns everything
```

### 2. GeoJSON Mapping

- **Include only needed properties**: Reduces payload size
- **Use descriptive property names**: Makes styling and tooltips clearer
- **Validate coordinate fields**: Ensure longitude/latitude are numeric

### 3. Styling

- **Use data-driven styling**: More efficient than creating multiple layers
- **Choose appropriate color scales**: Linear for continuous, categorical for discrete
- **Test color contrast**: Ensure visibility against base map
- **Limit tooltip fields**: Show only relevant information

### 4. Layer Organization

- **Use descriptive names**: "Wells by Production" not "Layer 1"
- **Set appropriate order**: Higher numbers render on top
- **Group related data**: One layer per logical dataset
- **Clean up unused layers**: Delete layers when no longer needed

### 5. Performance

- **Limit features per layer**: < 1000 for best performance
- **Use heatmaps for dense data**: Better than thousands of points
- **Avoid frequent updates**: Batch style changes when possible
- **Set queryRefreshInterval wisely**: 0 for static data, higher for dynamic

## Troubleshooting

### Map doesn't show layers

**Symptoms:** Layers created but nothing appears on map

**Solutions:**
1. Check browser console for errors
2. Verify `chatSessionId` matches between AI and MapViewer
3. Ensure layer `visible` is true
4. Check `queryError` field in layer record
5. Verify query returns valid coordinates

### Query validation fails

**Symptoms:** Layer creation returns error

**Solutions:**
1. Test query directly in Athena console
2. Verify database name is correct
3. Check column names in `geoJsonMapping` match query results
4. Ensure coordinate fields contain numeric values
5. Validate GeoJSON structure

### Layers not updating

**Symptoms:** Changes don't appear on map

**Solutions:**
1. Check subscription is active (browser console)
2. Verify network connectivity
3. Confirm mutations are successful
4. Check for JavaScript errors in console
5. Try refreshing the page

### Performance issues

**Symptoms:** Map is slow or unresponsive

**Solutions:**
1. Reduce feature count (add LIMIT to query)
2. Simplify polygon geometries
3. Use heatmap instead of many points
4. Limit number of active layers
5. Disable unused layers

### Colors not showing correctly

**Symptoms:** Features all same color or wrong colors

**Solutions:**
1. Verify `colorScale.property` exists in query results
2. Check property values are numeric (for linear/step scales)
3. Ensure stops array is properly formatted: `[[value, color], ...]`
4. Add `defaultColor` for null/undefined values
5. Check browser console for MapLibre errors

## Advanced Features

### Auto-Refresh Layers

Set `queryRefreshInterval` to automatically re-execute queries:

```javascript
{
  queryRefreshInterval: 15,  // Refresh every 15 minutes
  // ... other fields
}
```

Use cases:
- Real-time production monitoring
- Live equipment status
- Dynamic alert visualization

### Multiple Layers

Create multiple layers for different data types:

```javascript
// Layer 1: Wells
await create_map_layer({
  name: "Active Wells",
  type: "point",
  order: 1,
  // ...
});

// Layer 2: Pipelines
await create_map_layer({
  name: "Pipeline Network",
  type: "line",
  order: 2,
  // ...
});

// Layer 3: Lease Boundaries
await create_map_layer({
  name: "Leases",
  type: "polygon",
  order: 0,  // Render below other layers
  // ...
});
```

### Layer Visibility Control

Users can toggle layer visibility in the map legend:
- Click layer name to show/hide
- Status indicators show query execution state
- Fullscreen mode available

## Additional Resources

- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js-docs/)
- [GeoJSON Specification](https://geojson.org/)
- [AWS Athena SQL Reference](https://docs.aws.amazon.com/athena/latest/ug/ddl-sql-reference.html)
- [AWS Amplify Data Documentation](https://docs.amplify.aws/react/build-a-backend/data/)
- [MapLibre Style Specification](https://maplibre.org/maplibre-style-spec/)