# Map Layer Color Coding Guide

The map component now supports data-driven styling, allowing you to color points, lines, and polygons based on property values from your query results.

## Overview

You can configure color scales in the `style` object when creating or updating a map layer. The color scale will automatically apply to features based on their property values.

## Color Scale Types

### 1. Linear Scale (Gradient)

Creates a smooth color gradient between value ranges. Perfect for continuous numeric data like production rates, temperatures, or pressures.

**Example: Color wells by production rate**

```javascript
{
  name: "Production Wells",
  type: "point",
  athenaQuery: "SELECT id, name, latitude, longitude, daily_production FROM wells",
  athenaDatabase: "upstream",
  geoJsonMapping: {
    geometryType: "Point",
    longitudeField: "longitude",
    latitudeField: "latitude",
    propertyFields: ["id", "name", "daily_production"]
  },
  style: {
    radius: 6,
    opacity: 0.8,
    colorScale: {
      type: "linear",
      property: "daily_production",
      stops: [
        [0, "#3b82f6"],      // Blue for low production
        [500, "#fbbf24"],    // Yellow for medium
        [1000, "#ef4444"]    // Red for high production
      ]
    }
  }
}
```

### 2. Step Scale (Discrete Ranges)

Creates distinct color bands for value ranges. Good for categorizing data into groups.

**Example: Color wells by production tier**

```javascript
{
  style: {
    colorScale: {
      type: "step",
      property: "daily_production",
      defaultColor: "#9ca3af",  // Gray for values below first stop
      stops: [
        [100, "#3b82f6"],    // Blue for 100-500
        [500, "#fbbf24"],    // Yellow for 500-1000
        [1000, "#ef4444"]    // Red for 1000+
      ]
    }
  }
}
```

### 3. Categorical Scale

Maps specific category values to colors. Perfect for status fields, types, or classifications.

**Example: Color wells by status**

```javascript
{
  style: {
    colorScale: {
      type: "categorical",
      property: "status",
      categories: {
        "Active": "#10b981",      // Green
        "Inactive": "#ef4444",    // Red
        "Maintenance": "#f59e0b", // Orange
        "Planned": "#3b82f6"      // Blue
      },
      defaultColor: "#9ca3af"  // Gray for unknown statuses
    }
  }
}
```

## Data-Driven Radius

You can also scale point sizes based on data values.

**Example: Size points by production volume**

```javascript
{
  style: {
    radiusScale: {
      property: "daily_production",
      min: 0,           // Minimum data value
      max: 1000,        // Maximum data value
      minRadius: 3,     // Smallest point size
      maxRadius: 15     // Largest point size
    }
  }
}
```

## Combining Color and Size

You can use both color and radius scales together for rich visualizations.

**Example: Color by status, size by production**

```javascript
{
  style: {
    opacity: 0.8,
    strokeWidth: 1,
    strokeColor: "#ffffff",
    colorScale: {
      type: "categorical",
      property: "status",
      categories: {
        "Active": "#10b981",
        "Inactive": "#ef4444"
      }
    },
    radiusScale: {
      property: "daily_production",
      min: 0,
      max: 1000,
      minRadius: 4,
      maxRadius: 12
    }
  }
}
```

## Using with Lines and Polygons

Color scales work with lines and polygons too!

**Example: Color pipelines by pressure**

```javascript
{
  name: "Pipeline Network",
  type: "line",
  style: {
    width: 3,
    opacity: 0.8,
    colorScale: {
      type: "linear",
      property: "pressure_psi",
      stops: [
        [0, "#3b82f6"],
        [500, "#10b981"],
        [1000, "#ef4444"]
      ]
    }
  }
}
```

**Example: Color zones by risk level**

```javascript
{
  name: "Risk Zones",
  type: "polygon",
  style: {
    opacity: 0.5,
    strokeColor: "#1e40af",
    colorScale: {
      type: "categorical",
      property: "risk_level",
      categories: {
        "Low": "#10b981",
        "Medium": "#f59e0b",
        "High": "#ef4444"
      }
    }
  }
}
```

## AI Agent Usage

When using the AI agent to create map layers, you can describe the color coding you want:

**Example prompts:**

- "Create a map layer showing wells colored by their daily production rate, with blue for low production and red for high production"
- "Show me active wells in green and inactive wells in red"
- "Create a map with point sizes based on production volume and colors based on well status"

The agent will automatically configure the appropriate color scale based on your description.

## Color Palette Recommendations

### Sequential (for continuous data)
- **Blue to Red**: `#3b82f6` → `#fbbf24` → `#ef4444`
- **Green to Red**: `#10b981` → `#fbbf24` → `#ef4444`
- **Cool to Warm**: `#06b6d4` → `#8b5cf6` → `#ec4899`

### Categorical (for discrete categories)
- **Status**: Green (#10b981), Yellow (#f59e0b), Red (#ef4444), Gray (#9ca3af)
- **Priority**: Red (#ef4444), Orange (#f97316), Blue (#3b82f6)
- **Types**: Blue (#3b82f6), Purple (#8b5cf6), Pink (#ec4899), Teal (#14b8a6)

## Technical Notes

- Property names must match exactly with the fields returned by your Athena query
- Include the property in `propertyFields` in your `geoJsonMapping`
- Numeric values work best with linear and step scales
- String values work best with categorical scales
- Colors can be hex codes (#ff0000), RGB (rgb(255,0,0)), or named colors (red)
- The map uses MapLibre GL expressions under the hood for efficient rendering
