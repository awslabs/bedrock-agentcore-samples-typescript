'use client';

import React, { useEffect, useState, useMemo } from 'react';
import MapGL, { Source, Layer, MapRef, Popup } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const client = generateClient<Schema>();

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: [number, number] | number[][] | number[][][];
  };
  properties: Record<string, unknown>;
}

interface GeoJSONData {
  type: 'FeatureCollection' | 'Feature';
  features?: GeoJSONFeature[];
  geometry?: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties?: Record<string, unknown>;
}

interface LayerStyle {
  color?: string;
  opacity?: number;
  radius?: number;
  width?: number;
  strokeColor?: string;
  strokeWidth?: number;
  intensity?: number;
  // Data-driven styling
  colorBy?: string; // Property name to use for coloring
  colorScale?: {
    type: 'linear' | 'categorical' | 'step';
    property: string; // Property name to use for coloring
    stops?: Array<[number | string, string]>; // Value-color pairs for linear/step scales
    categories?: Record<string, string>; // Category-color mapping
    defaultColor?: string; // Fallback color
  };
  radiusBy?: string; // Property name to use for sizing
  radiusScale?: {
    property: string;
    min: number;
    max: number;
    minRadius: number;
    maxRadius: number;
  };
  // Tooltip configuration
  tooltip?: {
    title?: string; // Property to use as title (defaults to 'name')
    fields?: Array<{
      property: string; // Property name from query results
      label: string; // Display label
      format?: 'number' | 'decimal' | 'currency' | 'date' | 'text'; // Format type
      decimals?: number; // Number of decimal places (for number/decimal/currency)
      unit?: string; // Unit to append (e.g., 'MCF/D', 'PSI', '%')
    }>;
  };
}

interface MapLayer {
  id: string;
  name: string;
  type: 'point' | 'line' | 'polygon' | 'heatmap' | 'geojson';
  visible: boolean;
  athenaQuery: string;
  athenaDatabase: string;
  geoJsonMapping?: Record<string, string | string[]> | string;
  queryError?: string;
  lastQueryExecutedAt?: string;
  style?: LayerStyle | string; // Can be object or JSON string from database
  order: number;
  description?: string;
  source?: string;
}

interface MapViewerProps {
  chatSessionId: string;
  height?: string;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
}

export function MapViewer({ 
  chatSessionId, 
  height = '600px',
  initialViewState = {
    longitude: -95.7,
    latitude: 37.1,
    zoom: 4
  }
}: MapViewerProps) {
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const [layerGeoJsonData, setLayerGeoJsonData] = useState<Map<string, GeoJSONData>>(new Map());
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executingQueries, setExecutingQueries] = useState<Set<string>>(new Set());
  const mapRef = React.useRef<MapRef>(null);
  const fullscreenMapRef = React.useRef<MapRef>(null);
  const [hoveredFeature, setHoveredFeature] = useState<GeoJSONFeature | null>(null);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [popupCoords, setPopupCoords] = useState<{ longitude: number; latitude: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentViewState, setCurrentViewState] = useState<{
    longitude: number;
    latitude: number;
    zoom: number;
    bearing?: number;
    pitch?: number;
  }>(initialViewState);
  
  // Track previous layer state to detect meaningful changes
  const previousLayersRef = React.useRef<Map<string, MapLayer>>(new Map());

  // Toggle layer visibility
  const toggleLayerVisibility = async (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    try {
      // Update in database
      await client.models.MapLayer.update({
        id: layerId,
        visible: !layer.visible
      });
      
      // Local state will be updated by the subscription
      console.log(`Toggled visibility for layer ${layerId} to ${!layer.visible}`);
    } catch (err) {
      console.error('Error toggling layer visibility:', err);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    const currentMapRef = isFullscreen ? fullscreenMapRef : mapRef;
    if (currentMapRef.current) {
      const map = currentMapRef.current.getMap();
      const center = map.getCenter();
      const zoom = map.getZoom();
      const bearing = map.getBearing();
      const pitch = map.getPitch();
      
      // Save current view state
      setCurrentViewState({
        longitude: center.lng,
        latitude: center.lat,
        zoom: zoom,
        bearing: bearing,
        pitch: pitch
      });
    }
    
    setIsFullscreen(!isFullscreen);
  };

  // Format tooltip value based on configuration
  const formatTooltipValue = (value: unknown, format?: string, decimals?: number, unit?: string): string => {
    if (value === null || value === undefined) return 'N/A';
    
    let formatted: string;
    const numValue = Number(value);
    
    switch (format) {
      case 'number':
        formatted = Math.round(numValue).toLocaleString();
        break;
      case 'decimal':
        formatted = numValue.toFixed(decimals ?? 2);
        break;
      case 'currency':
        formatted = `$${numValue.toFixed(decimals ?? 2).toLocaleString()}`;
        break;
      case 'date':
        formatted = new Date(String(value)).toLocaleDateString();
        break;
      case 'text':
      default:
        formatted = String(value);
        break;
    }
    
    return unit ? `${formatted} ${unit}` : formatted;
  };

  // Render tooltip content based on layer configuration
  const renderTooltipContent = (feature: GeoJSONFeature, layer?: MapLayer) => {
    // Parse style if needed
    let style: LayerStyle = {};
    if (layer?.style) {
      if (typeof layer.style === 'string') {
        try {
          style = JSON.parse(layer.style);
        } catch (e) {
          console.error('Failed to parse layer style for tooltip:', e);
        }
      } else {
        style = layer.style;
      }
    }

    const titleProperty = style.tooltip?.title || 'name';
    const title = feature.properties[titleProperty] as string;

    return (
      <div className="px-2 py-1">
        <div className="text-sm font-semibold text-gray-800">
          {title || 'Unknown'}
        </div>
        {style.tooltip?.fields && style.tooltip.fields.length > 0 ? (
          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
            {style.tooltip.fields.map((field, idx) => {
              const value = feature.properties[field.property];
              if (value === undefined) return null;
              
              return (
                <div key={idx}>
                  <span className="font-medium">{field.label}:</span>{' '}
                  {formatTooltipValue(value, field.format, field.decimals, field.unit)}
                </div>
              );
            })}
          </div>
        ) : (
          // Fallback to default production decline display
          feature.properties.production_decline !== undefined && (
            <div className="text-xs text-gray-600 mt-1">
              <div>Decline: {Number(feature.properties.production_decline).toFixed(0)} MCF/D</div>
              {feature.properties.last_month_production !== undefined && (
                <div>Last Month: {Number(feature.properties.last_month_production).toFixed(0)} MCF/D</div>
              )}
            </div>
          )
        )}
      </div>
    );
  };

  // Function to execute query for a layer
  const executeLayerQuery = async (layer: MapLayer) => {
    if (!layer.athenaQuery || !layer.athenaDatabase || !layer.geoJsonMapping) {
      console.warn('Layer missing query configuration:', layer.id);
      return;
    }

    setExecutingQueries(prev => new Set(prev).add(layer.id));

    try {
      console.log('Executing query for layer:', layer.id);
      
      const result = await client.mutations.executeMapLayerQuery({
        layerId: layer.id,
        queryString: layer.athenaQuery,
        database: layer.athenaDatabase,
        geoJsonMapping: layer.geoJsonMapping,
      });

      if (result.data?.success && result.data.geoJsonData) {
        console.log('Query executed successfully for layer:', layer.id);
        console.log('GeoJSON data type:', typeof result.data.geoJsonData);
        console.log('GeoJSON data sample:', JSON.stringify(result.data.geoJsonData).substring(0, 200));
        
        // Parse geoJsonData if it's a string
        let parsedGeoJson = result.data.geoJsonData;
        if (typeof result.data.geoJsonData === 'string') {
          try {
            parsedGeoJson = JSON.parse(result.data.geoJsonData);
            console.log('Parsed GeoJSON from string for layer:', layer.id);
          } catch (parseError) {
            console.error('Failed to parse GeoJSON string for layer:', layer.id, parseError);
            await client.models.MapLayer.update({
              id: layer.id,
              queryError: 'Invalid GeoJSON format',
            });
            return;
          }
        }
        
        // Store the GeoJSON data in state
        setLayerGeoJsonData(prev => {
          const next = new Map(prev);
          next.set(layer.id, parsedGeoJson as GeoJSONData);
          return next;
        });
        
        // Update the layer metadata
        await client.models.MapLayer.update({
          id: layer.id,
          lastQueryExecutedAt: new Date().toISOString(),
          queryError: null,
        });
      } else {
        console.error('Query failed for layer:', layer.id, result.data?.error);
        
        // Update layer with error
        await client.models.MapLayer.update({
          id: layer.id,
          queryError: result.data?.error || 'Unknown error',
        });
      }
    } catch (err) {
      console.error('Error executing layer query:');
      
      if (err instanceof Error) {
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      } else if (err && typeof err === 'object') {
        console.error('Error object:', JSON.stringify(err, null, 2));
      } else {
        console.error('Unknown error type:', typeof err, err);
      }
      
      // Update layer with error
      try {
        await client.models.MapLayer.update({
          id: layer.id,
          queryError: err instanceof Error ? err.message : 'Failed to execute query',
        });
      } catch (updateErr) {
        console.error('Failed to update layer with error:', updateErr);
      }
    } finally {
      setExecutingQueries(prev => {
        const next = new Set(prev);
        next.delete(layer.id);
        return next;
      });
    }
  };

  // Helper function to check if query-related fields changed
  const hasQueryChanged = (oldLayer: MapLayer | undefined, newLayer: MapLayer): boolean => {
    if (!oldLayer) return true;
    
    return (
      oldLayer.athenaQuery !== newLayer.athenaQuery ||
      oldLayer.athenaDatabase !== newLayer.athenaDatabase ||
      JSON.stringify(oldLayer.geoJsonMapping) !== JSON.stringify(newLayer.geoJsonMapping)
    );
  };

  // Fetch initial layers and subscribe to changes
  useEffect(() => {
    if (!chatSessionId) {
      setInitialLoading(false);
      return;
    }

    const fetchLayers = async () => {
      try {
        setInitialLoading(true);

        const result = await client.models.MapLayer.listMapLayerByChatSessionIdAndOrder({
          chatSessionId: chatSessionId
        });

        if (result.data) {
          // Filter out null/undefined items (caused by GraphQL schema violations)
          const validLayers = result.data.filter((layer): layer is typeof layer & MapLayer => {
            if (!layer) {
              console.warn('Filtered out null/undefined map layer');
              return false;
            }
            
            // Check for required fields
            if (!layer.athenaQuery || !layer.athenaDatabase || !layer.geoJsonMapping) {
              console.warn('Filtered out map layer with missing required fields:', {
                id: layer.id,
                hasAthenaQuery: !!layer.athenaQuery,
                hasAthenaDatabase: !!layer.athenaDatabase,
                hasGeoJsonMapping: !!layer.geoJsonMapping
              });
              return false;
            }
            
            return true;
          }) as MapLayer[];
          
          console.log(`Initial map layers loaded: ${validLayers.length} valid out of ${result.data.length} total`);
          
          if (validLayers.length !== result.data.length) {
            console.warn(`Filtered out ${result.data.length - validLayers.length} invalid map layers`);
          }
          
          setLayers(validLayers);
          
          // Store initial layers in ref
          validLayers.forEach(layer => {
            previousLayersRef.current.set(layer.id, layer);
          });
          
          // Execute queries for all valid layers
          validLayers.forEach(layer => {
            console.log('Executing query for loaded layer:', layer.id);
            executeLayerQuery(layer);
          });
        } else {
          setLayers([]);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching map layers:');
        
        if (err instanceof Error) {
          console.error('Error name:', err.name);
          console.error('Error message:', err.message);
          console.error('Error stack:', err.stack);
          setError(err.message);
        } else if (err && typeof err === 'object') {
          console.error('Error object:', JSON.stringify(err, null, 2));
          
          // Check for GraphQL errors specifically
          if ('errors' in err) {
            const graphqlErrors = (err as { errors: Array<{ message: string }> }).errors;
            console.error('GraphQL errors detected:', graphqlErrors);
            setError(`GraphQL Error: ${graphqlErrors.map(e => e.message).join(', ')}`);
          } else {
            setError('Failed to load map layers (see console for details)');
          }
        } else {
          console.error('Unknown error type:', typeof err, err);
          setError('Failed to load map layers');
        }
      } finally {
        setInitialLoading(false);
      }
    };

    fetchLayers();

    // Subscribe to onCreate events
    const createSub = client.models.MapLayer.onCreate({
      filter: { chatSessionId: { eq: chatSessionId } }
    }).subscribe({
      next: (newLayer) => {
        console.log('New map layer created:', newLayer);
        
        // Validate the new layer
        if (!newLayer) {
          console.warn('Received null/undefined layer in onCreate subscription');
          return;
        }
        
        const layer = newLayer as MapLayer;
        
        // Check for required fields
        if (!layer.athenaQuery || !layer.athenaDatabase || !layer.geoJsonMapping) {
          console.warn('Received map layer with missing required fields in onCreate:', {
            id: layer.id,
            hasAthenaQuery: !!layer.athenaQuery,
            hasAthenaDatabase: !!layer.athenaDatabase,
            hasGeoJsonMapping: !!layer.geoJsonMapping
          });
          return;
        }
        
        setLayers((prevLayers) => {
          // Check if layer already exists
          const exists = prevLayers.some(l => l.id === layer.id);
          if (exists) {
            return prevLayers;
          }
          return [...prevLayers, layer];
        });
        
        // Store in ref
        previousLayersRef.current.set(layer.id, layer);
        
        // Always execute query for newly created layers
        console.log('Executing query for newly created layer:', layer.id);
        executeLayerQuery(layer);
      },
      error: (err) => {
        console.error('onCreate subscription error:', err);
      }
    });

    // Subscribe to onUpdate events
    const updateSub = client.models.MapLayer.onUpdate({
      filter: { chatSessionId: { eq: chatSessionId } }
    }).subscribe({
      next: (updatedLayer) => {
        console.log('Map layer updated:', updatedLayer);
        
        // Validate the updated layer
        if (!updatedLayer) {
          console.warn('Received null/undefined layer in onUpdate subscription');
          return;
        }
        
        const layer = updatedLayer as MapLayer;
        
        // Check for required fields
        if (!layer.athenaQuery || !layer.athenaDatabase || !layer.geoJsonMapping) {
          console.warn('Received map layer with missing required fields in onUpdate:', {
            id: layer.id,
            hasAthenaQuery: !!layer.athenaQuery,
            hasAthenaDatabase: !!layer.athenaDatabase,
            hasGeoJsonMapping: !!layer.geoJsonMapping
          });
          // Remove the invalid layer from state if it exists
          setLayers((prevLayers) => prevLayers.filter(l => l.id !== layer.id));
          previousLayersRef.current.delete(layer.id);
          return;
        }
        
        // Check if query-related fields changed
        const previousLayer = previousLayersRef.current.get(layer.id);
        const shouldReExecuteQuery = hasQueryChanged(previousLayer, layer);
        
        if (shouldReExecuteQuery) {
          console.log('Query-related fields changed, re-executing query for layer:', layer.id);
        } else {
          console.log('Only non-query fields changed, skipping query re-execution for layer:', layer.id);
        }
        
        setLayers((prevLayers) => {
          const exists = prevLayers.some(l => l.id === layer.id);
          if (exists) {
            // Update existing layer
            return prevLayers.map((l) =>
              l.id === layer.id ? layer : l
            );
          } else {
            // Layer doesn't exist in state, add it
            console.log('Layer not in state, adding it:', layer.id);
            return [...prevLayers, layer];
          }
        });
        
        // Update ref
        previousLayersRef.current.set(layer.id, layer);
        
        // Only re-execute query if query-related fields changed
        if (shouldReExecuteQuery) {
          executeLayerQuery(layer);
        }
      },
      error: (err) => {
        console.error('onUpdate subscription error:', err);
      }
    });

    // Subscribe to onDelete events
    const deleteSub = client.models.MapLayer.onDelete({
      filter: { chatSessionId: { eq: chatSessionId } }
    }).subscribe({
      next: (deletedLayer) => {
        console.log('Map layer deleted:', deletedLayer);
        setLayers((prevLayers) =>
          prevLayers.filter((layer) => layer.id !== deletedLayer.id)
        );
        
        // Remove from ref
        previousLayersRef.current.delete(deletedLayer.id);
        
        // Remove GeoJSON data
        setLayerGeoJsonData(prev => {
          const next = new Map(prev);
          next.delete(deletedLayer.id);
          return next;
        });
      },
      error: (err) => {
        console.error('onDelete subscription error:', err);
      }
    });

    return () => {
      createSub.unsubscribe();
      updateSub.unsubscribe();
      deleteSub.unsubscribe();
    };
  }, [chatSessionId]);

  // Convert layer type to MapLibre layer type
  const getMapLibreLayerType = (type: string): string => {
    switch (type) {
      case 'point':
        return 'circle';
      case 'line':
        return 'line';
      case 'polygon':
        return 'fill';
      case 'heatmap':
        return 'heatmap';
      default:
        return 'circle';
    }
  };

  // Get default paint properties based on layer type
  const getDefaultPaint = (layer: MapLayer): Record<string, unknown> => {
    // Parse style if it's a string (from database)
    let style: LayerStyle = {};
    if (layer.style) {
      if (typeof layer.style === 'string') {
        try {
          style = JSON.parse(layer.style);
          console.log('Parsed layer style for', layer.name, ':', style);
        } catch (e) {
          console.error('Failed to parse layer style:', e);
          style = {};
        }
      } else {
        style = layer.style;
      }
    }
    
    console.log('Generating paint for layer', layer.name, 'with style:', style);
    
    switch (layer.type) {
      case 'point': {
        const paint: Record<string, unknown> = {
          'circle-opacity': style.opacity || 0.8,
          'circle-stroke-width': style.strokeWidth || 1,
          'circle-stroke-color': style.strokeColor || '#ffffff'
        };

        // Handle data-driven color
        if (style.colorScale) {
          const { type, property, stops, categories, defaultColor } = style.colorScale;
          
          if (type === 'linear' && stops && stops.length > 0) {
            // Linear interpolation between stops with proper type coercion
            paint['circle-color'] = [
              'interpolate',
              ['linear'],
              ['coalesce', ['to-number', ['get', property]], 0],
              ...stops.flat()
            ];
          } else if (type === 'step' && stops && stops.length > 0) {
            // Step function (discrete ranges) with proper type coercion
            paint['circle-color'] = [
              'step',
              ['coalesce', ['to-number', ['get', property]], 0],
              defaultColor || stops[0][1], // Default color
              ...stops.flat()
            ];
          } else if (type === 'categorical' && categories) {
            // Categorical mapping
            const matchExpression: unknown[] = ['match', ['get', property]];
            Object.entries(categories).forEach(([value, color]) => {
              matchExpression.push(value, color);
            });
            matchExpression.push(defaultColor || '#3b82f6'); // Fallback
            paint['circle-color'] = matchExpression;
          } else {
            paint['circle-color'] = style.color || '#3b82f6';
          }
        } else {
          paint['circle-color'] = style.color || '#3b82f6';
        }

        // Handle data-driven radius
        if (style.radiusScale) {
          const { property, min, max, minRadius, maxRadius } = style.radiusScale;
          paint['circle-radius'] = [
            'interpolate',
            ['linear'],
            ['get', property],
            min, minRadius,
            max, maxRadius
          ];
        } else {
          paint['circle-radius'] = style.radius || 6;
        }

        console.log('Point layer paint for', layer.name, ':', JSON.stringify(paint, null, 2));
        return paint;
      }
      case 'line': {
        const paint: Record<string, unknown> = {
          'line-width': style.width || 2,
          'line-opacity': style.opacity || 0.8
        };

        // Handle data-driven color for lines
        if (style.colorScale) {
          const { type, property, stops, categories, defaultColor } = style.colorScale;
          
          if (type === 'linear' && stops && stops.length > 0) {
            paint['line-color'] = [
              'interpolate',
              ['linear'],
              ['coalesce', ['to-number', ['get', property]], 0],
              ...stops.flat()
            ];
          } else if (type === 'step' && stops && stops.length > 0) {
            paint['line-color'] = [
              'step',
              ['coalesce', ['to-number', ['get', property]], 0],
              defaultColor || stops[0][1],
              ...stops.flat()
            ];
          } else if (type === 'categorical' && categories) {
            const matchExpression: unknown[] = ['match', ['get', property]];
            Object.entries(categories).forEach(([value, color]) => {
              matchExpression.push(value, color);
            });
            matchExpression.push(defaultColor || '#3b82f6');
            paint['line-color'] = matchExpression;
          } else {
            paint['line-color'] = style.color || '#3b82f6';
          }
        } else {
          paint['line-color'] = style.color || '#3b82f6';
        }

        return paint;
      }
      case 'polygon': {
        const paint: Record<string, unknown> = {
          'fill-opacity': style.opacity || 0.5,
          'fill-outline-color': style.strokeColor || '#1e40af'
        };

        // Handle data-driven color for polygons
        if (style.colorScale) {
          const { type, property, stops, categories, defaultColor } = style.colorScale;
          
          if (type === 'linear' && stops && stops.length > 0) {
            paint['fill-color'] = [
              'interpolate',
              ['linear'],
              ['coalesce', ['to-number', ['get', property]], 0],
              ...stops.flat()
            ];
          } else if (type === 'step' && stops && stops.length > 0) {
            paint['fill-color'] = [
              'step',
              ['coalesce', ['to-number', ['get', property]], 0],
              defaultColor || stops[0][1],
              ...stops.flat()
            ];
          } else if (type === 'categorical' && categories) {
            const matchExpression: unknown[] = ['match', ['get', property]];
            Object.entries(categories).forEach(([value, color]) => {
              matchExpression.push(value, color);
            });
            matchExpression.push(defaultColor || '#3b82f6');
            paint['fill-color'] = matchExpression;
          } else {
            paint['fill-color'] = style.color || '#3b82f6';
          }
        } else {
          paint['fill-color'] = style.color || '#3b82f6';
        }

        return paint;
      }
      case 'heatmap':
        return {
          'heatmap-weight': 1,
          'heatmap-intensity': style.intensity || 1,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, 'rgb(103,169,207)',
            0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)',
            0.8, 'rgb(239,138,98)',
            1, 'rgb(178,24,43)'
          ],
          'heatmap-radius': style.radius || 20,
          'heatmap-opacity': style.opacity || 0.8
        };
      default:
        return {};
    }
  };

  // Sort layers by order
  const sortedLayers = useMemo(() => {
    const sorted = [...layers].filter(l => l !== null && l !== undefined).sort((a, b) => (a.order || 0) - (b.order || 0));
    console.log('Sorted layers for rendering:', sorted.length, sorted.map(l => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      hasGeoJsonData: layerGeoJsonData.has(l.id),
      geoJsonDataFeatures: layerGeoJsonData.get(l.id)?.type === 'FeatureCollection' 
        ? (layerGeoJsonData.get(l.id) as { features?: unknown[] })?.features?.length 
        : 'N/A'
    })));
    return sorted;
  }, [layers, layerGeoJsonData]);

  // Fit map to show all features when layers change
  useEffect(() => {
    if (mapRef.current && sortedLayers.length > 0) {
      try {
        const map = mapRef.current.getMap();
        const bounds = new maplibregl.LngLatBounds();
        
        sortedLayers.forEach(layer => {
          const geoJsonData = layerGeoJsonData.get(layer.id);
          if (geoJsonData && layer.visible) {
            const features = geoJsonData.type === 'FeatureCollection' 
              ? geoJsonData.features || []
              : [geoJsonData as GeoJSONFeature];
            
            features.forEach((feature: GeoJSONFeature) => {
              if (feature.geometry) {
                if (feature.geometry.type === 'Point') {
                  bounds.extend(feature.geometry.coordinates as [number, number]);
                } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiPoint') {
                  (feature.geometry.coordinates as number[][]).forEach((coord: number[]) => bounds.extend(coord as [number, number]));
                } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiLineString') {
                  (feature.geometry.coordinates as number[][][]).forEach((ring: number[][]) => {
                    ring.forEach((coord: number[]) => bounds.extend(coord as [number, number]));
                  });
                }
              }
            });
          }
        });

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
        }
      } catch (err) {
        console.error('Error fitting bounds:');
        
        if (err instanceof Error) {
          console.error('Error message:', err.message);
        } else {
          console.error('Unknown error:', err);
        }
      }
    }
  }, [sortedLayers, layerGeoJsonData]);

  // Handle mouse events for hover popups - callback for when map loads
  const setupHoverHandlers = React.useCallback((mapInstance: maplibregl.Map) => {
    console.log('Setting up hover handlers', isFullscreen ? '(fullscreen)' : '(normal)');

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      try {
        const features = mapInstance.queryRenderedFeatures(e.point);
        
        if (features.length > 0) {
          const feature = features[0] as GeoJSONFeature & { layer?: { id: string } };
          // Feature has properties - show tooltip
          if (feature.properties) {
            setHoveredFeature(feature);
            // Extract layer ID from the MapLibre layer ID (format: layer-{layerId} or layer-{layerId}-fullscreen)
            const layerId = feature.layer?.id?.replace(/^layer-/, '').replace(/-fullscreen$/, '');
            setHoveredLayerId(layerId || null);
            setPopupCoords({
              longitude: e.lngLat.lng,
              latitude: e.lngLat.lat
            });
            mapInstance.getCanvas().style.cursor = 'pointer';
            return;
          }
        }
      } catch (error) {
        console.error('Error querying features:', error);
      }
      
      setHoveredFeature(null);
      setHoveredLayerId(null);
      setPopupCoords(null);
      mapInstance.getCanvas().style.cursor = '';
    };

    const handleMouseLeave = () => {
      setHoveredFeature(null);
      setHoveredLayerId(null);
      setPopupCoords(null);
      mapInstance.getCanvas().style.cursor = '';
    };

    mapInstance.on('mousemove', handleMouseMove);
    mapInstance.on('mouseleave', handleMouseLeave);
  }, [isFullscreen]);

  if (initialLoading && layers.length === 0) {
    return (
      <div 
        style={{ height }} 
        className="flex items-center justify-center bg-gray-100 rounded-lg"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-gray-600">Loading map layers...</div>
        </div>
      </div>
    );
  }

  if (error && layers.length === 0) {
    return (
      <div 
        style={{ height }} 
        className="flex items-center justify-center bg-red-50 rounded-lg border border-red-200"
      >
        <div className="text-center p-4">
          <div className="text-red-600 mb-2">Map Loading Error</div>
          <div className="text-sm text-red-500">{error}</div>
          <div className="text-xs text-gray-500 mt-2">The map will show a base layer without data</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Normal view */}
      {!isFullscreen && (
        <div className="relative" style={{ height }}>
          <MapGL
            ref={mapRef}
            initialViewState={currentViewState}
            style={{ width: '100%', height: '100%' }}
            mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
            onLoad={(e) => setupHoverHandlers(e.target)}
          >
        {sortedLayers.map((layer) => {
          // Skip layers that are not visible
          if (!layer.visible) {
            return null;
          }
          
          // Skip layers that are still executing queries
          if (executingQueries.has(layer.id)) {
            return null;
          }
          
          // Get GeoJSON data from state
          const geoJsonData = layerGeoJsonData.get(layer.id);
          
          // Skip layers without data (query hasn't completed or failed)
          if (!geoJsonData) {
            return null;
          }

          // Validate GeoJSON structure - check type and log details if invalid
          if (typeof geoJsonData !== 'object' || geoJsonData === null) {
            console.error('Invalid GeoJSON data for layer', layer.name, {
              type: typeof geoJsonData,
              value: geoJsonData,
              isNull: geoJsonData === null,
              isArray: Array.isArray(geoJsonData)
            });
            return null;
          }

          // Check if it's a valid GeoJSON type
          if (geoJsonData.type !== 'FeatureCollection' && geoJsonData.type !== 'Feature') {
            console.error('Invalid GeoJSON data for layer', layer.name, '- missing or invalid type:', geoJsonData.type);
            return null;
          }

          // Check if FeatureCollection has features
          if (geoJsonData.type === 'FeatureCollection') {
            if (!Array.isArray(geoJsonData.features)) {
              console.error('Invalid GeoJSON data for layer', layer.name, '- features is not an array');
              return null;
            }
            if (geoJsonData.features.length === 0) {
              return null;
            }
          }

          const layerType = getMapLibreLayerType(layer.type);
          const paint = getDefaultPaint(layer);

          return (
            <Source
              key={layer.id}
              id={`source-${layer.id}`}
              type="geojson"
              data={geoJsonData as import('geojson').GeoJSON}
            >
              <Layer
                id={`layer-${layer.id}`}
                type={layerType as 'circle' | 'line' | 'fill' | 'heatmap'}
                paint={paint}
              />
            </Source>
          );
        })}

        {/* Hover popup for well names */}
        {hoveredFeature && popupCoords && (
          <Popup
            longitude={popupCoords.longitude}
            latitude={popupCoords.latitude}
            closeButton={false}
            className="well-name-popup"
          >
            {renderTooltipContent(hoveredFeature, sortedLayers.find(l => l.id === hoveredLayerId))}
          </Popup>
        )}
      </MapGL>
      
      {/* Error overlay */}
      {error && (
        <div className="absolute top-2 left-2 bg-red-50 border border-red-200 rounded-lg p-2 max-w-xs">
          <div className="text-xs text-red-600 font-medium">Map Error</div>
          <div className="text-xs text-red-500">{error}</div>
        </div>
      )}
      
      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 transition-colors z-10"
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4 text-gray-700" />
        ) : (
          <Maximize2 className="h-4 w-4 text-gray-700" />
        )}
      </button>
      
      {/* Layer Legend */}
      {layers.length > 0 && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
          <h3 className="font-semibold text-sm mb-2">Map Layers</h3>
          <div className="space-y-1 text-xs">
            {sortedLayers.map((layer) => (
              <Tooltip key={layer.id}>
                <TooltipTrigger asChild>
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
                    style={{ opacity: layer.visible ? 1 : 0.5 }}
                    onClick={() => toggleLayerVisibility(layer.id)}
                  >
                    <span className="truncate flex-1">{layer.name}</span>
                    <div className="ml-2 flex items-center gap-1">
                      {executingQueries.has(layer.id) && (
                        <span className="text-blue-500" title="Executing query...">⏳</span>
                      )}
                      {layer.queryError && (
                        <span className="text-red-500" title={layer.queryError}>⚠️</span>
                      )}
                      {!layer.queryError && !executingQueries.has(layer.id) && layerGeoJsonData.has(layer.id) && (
                        <span className="text-green-500" title="Query executed successfully">✓</span>
                      )}
                      <span className="text-gray-500">
                        {layer.visible ? '👁️' : '👁️‍🗨️'}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                {layer.description && (
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs">{layer.description}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </div>
        </div>
      )}
      
      {/* No layers message */}
      {!initialLoading && layers.length === 0 && (
        <div className="absolute bottom-4 left-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-xs">
          <div className="text-xs text-yellow-800 font-medium">No Map Layers</div>
          <div className="text-xs text-yellow-700">No data layers are currently loaded for this session.</div>
        </div>
      )}
        </div>
      )}
      
      {/* Fullscreen view */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white">
          <MapGL
            ref={fullscreenMapRef}
            initialViewState={currentViewState}
            style={{ width: '100%', height: '100%' }}
            mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
            onLoad={(e) => setupHoverHandlers(e.target)}
          >
            {sortedLayers.map((layer) => {
              if (!layer.visible) return null;
              if (executingQueries.has(layer.id)) return null;
              
              const geoJsonData = layerGeoJsonData.get(layer.id);
              if (!geoJsonData) return null;

              if (typeof geoJsonData !== 'object' || geoJsonData === null) return null;
              if (geoJsonData.type !== 'FeatureCollection' && geoJsonData.type !== 'Feature') return null;
              if (geoJsonData.type === 'FeatureCollection') {
                if (!Array.isArray(geoJsonData.features)) return null;
                if (geoJsonData.features.length === 0) return null;
              }

              const layerType = getMapLibreLayerType(layer.type);
              const paint = getDefaultPaint(layer);

              return (
                <Source
                  key={layer.id}
                  id={`source-${layer.id}-fullscreen`}
                  type="geojson"
                  data={geoJsonData as import('geojson').GeoJSON}
                >
                  <Layer
                    id={`layer-${layer.id}-fullscreen`}
                    type={layerType as 'circle' | 'line' | 'fill' | 'heatmap'}
                    paint={paint}
                  />
                </Source>
              );
            })}

            {hoveredFeature && popupCoords && (
              <Popup
                longitude={popupCoords.longitude}
                latitude={popupCoords.latitude}
                closeButton={false}
                className="well-name-popup"
              >
                {renderTooltipContent(hoveredFeature, sortedLayers.find(l => l.id === hoveredLayerId))}
              </Popup>
            )}
          </MapGL>
          
          {/* Error overlay */}
          {error && (
            <div className="absolute top-2 left-2 bg-red-50 border border-red-200 rounded-lg p-2 max-w-xs">
              <div className="text-xs text-red-600 font-medium">Map Error</div>
              <div className="text-xs text-red-500">{error}</div>
            </div>
          )}
          
          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 transition-colors z-10"
            title="Exit fullscreen"
          >
            <Minimize2 className="h-4 w-4 text-gray-700" />
          </button>
          
          {/* Layer Legend */}
          {layers.length > 0 && (
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
              <h3 className="font-semibold text-sm mb-2">Map Layers</h3>
              <div className="space-y-1 text-xs">
                {sortedLayers.map((layer) => (
                  <Tooltip key={layer.id}>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
                        style={{ opacity: layer.visible ? 1 : 0.5 }}
                        onClick={() => toggleLayerVisibility(layer.id)}
                      >
                        <span className="truncate flex-1">{layer.name}</span>
                        <div className="ml-2 flex items-center gap-1">
                          {executingQueries.has(layer.id) && (
                            <span className="text-blue-500" title="Executing query...">⏳</span>
                          )}
                          {layer.queryError && (
                            <span className="text-red-500" title={layer.queryError}>⚠️</span>
                          )}
                          {!layer.queryError && !executingQueries.has(layer.id) && layerGeoJsonData.has(layer.id) && (
                            <span className="text-green-500" title="Query executed successfully">✓</span>
                          )}
                          <span className="text-gray-500">
                            {layer.visible ? '👁️' : '👁️‍🗨️'}
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    {layer.description && (
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="text-xs">{layer.description}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}