import { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } from '@aws-sdk/client-athena';
import { AppSyncResolverEvent } from 'aws-lambda';

const athena = new AthenaClient({ region: process.env.AWS_REGION });

interface AthenaQueryInput {
  queryString?: string;
  database?: string;
  outputLocation?: string;
  queryExecutionId?: string;
  nextToken?: string;
}

interface MapLayerQueryInput {
  layerId?: string;
  queryString: string;
  database: string;
  geoJsonMapping: any; // Will be parsed from JSON
}

interface GeoJsonMappingConfig {
  geometryType: 'Point' | 'LineString' | 'Polygon';
  longitudeField?: string;
  latitudeField?: string;
  coordinatesField?: string;
  propertyFields?: string[];
}

interface MapLayerQueryResult {
  success: boolean;
  geoJsonData?: any;
  error?: string;
  rowCount?: number;
}

interface AthenaQueryResult {
  queryExecutionId: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  data?: any[];
  columns?: string[];
  error?: string;
  rowCount?: number;
  nextToken?: string;
}

export const handler = async (event: AppSyncResolverEvent<AthenaQueryInput | MapLayerQueryInput>): Promise<AthenaQueryResult | MapLayerQueryResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Check if this is a map layer query request
  if ('geoJsonMapping' in event.arguments) {
    return await handleMapLayerQuery(event as AppSyncResolverEvent<MapLayerQueryInput>);
  }
  
  const { queryString, database, outputLocation, queryExecutionId, nextToken } = event.arguments as AthenaQueryInput;

  try {
    // If queryExecutionId is provided, check status and get results
    if (queryExecutionId) {
      return await getQueryResults(queryExecutionId, nextToken);
    }

    // Otherwise, start a new query execution
    const defaultOutputLocation = process.env.ATHENA_OUTPUT_LOCATION || 
      `s3://aws-athena-query-results-${process.env.AWS_ACCOUNT_ID}-${process.env.AWS_REGION}/`;
    
    const params = {
      QueryString: queryString,
      QueryExecutionContext: database ? { Database: database } : undefined,
      ManagedQueryResultsConfiguration: {
        enabled: true
      }
      // ResultConfiguration: { //Use 
      //   OutputLocation: outputLocation || defaultOutputLocation,
      // },
    };

    console.log('Starting query execution:', params);
    const startCommand = new StartQueryExecutionCommand(params);
    const startResponse = await athena.send(startCommand);
    
    if (!startResponse.QueryExecutionId) {
      throw new Error('Failed to start query execution');
    }

    console.log('Query started with ID:', startResponse.QueryExecutionId);

    // Wait a moment and check initial status
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return await getQueryResults(startResponse.QueryExecutionId);
    
  } catch (error) {
    console.error('Error executing Athena query:', error);
    
    // Extract detailed error information
    let errorMessage = 'Unknown error occurred';
    let errorDetails: any = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      // Include stack trace in logs but not in response
      console.error('Error stack:', error.stack);
      
      // Check if it's an AWS SDK error with additional details
      if ('name' in error) {
        errorDetails.errorType = error.name;
      }
      if ('$metadata' in error) {
        errorDetails.metadata = (error as any).$metadata;
      }
    } else {
      errorMessage = String(error);
    }
    
    // Create detailed error message
    const detailedError = errorDetails.errorType 
      ? `${errorDetails.errorType}: ${errorMessage}`
      : errorMessage;
    
    console.error('Detailed error:', detailedError, errorDetails);
    
    return {
      queryExecutionId: queryExecutionId || 'none',
      status: 'FAILED',
      error: detailedError,
    };
  }
};

async function getQueryResults(queryExecutionId: string, nextToken?: string): Promise<AthenaQueryResult> {
  try {
    // Check query execution status
    const statusCommand = new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId });
    const statusResponse = await athena.send(statusCommand);
    
    const status = statusResponse.QueryExecution?.Status?.State;
    
    if (!status) {
      throw new Error('Could not determine query status');
    }

    console.log('Query status:', status);

    // If query is still running, return status without results
    if (status === 'QUEUED' || status === 'RUNNING') {
      return {
        queryExecutionId,
        status,
      };
    }

    // If query failed, return error
    if (status === 'FAILED' || status === 'CANCELLED') {
      return {
        queryExecutionId,
        status,
        error: statusResponse.QueryExecution?.Status?.StateChangeReason || 'Query failed',
      };
    }

    // Query succeeded, get results with pagination support
    const resultsCommand = new GetQueryResultsCommand({ 
      QueryExecutionId: queryExecutionId,
      MaxResults: 1000, // Return 1000 rows per page
      NextToken: nextToken, // Use provided token for pagination
    });
    const resultsResponse = await athena.send(resultsCommand);

    if (!resultsResponse.ResultSet) {
      return {
        queryExecutionId,
        status: 'SUCCEEDED',
        data: [],
        columns: [],
        rowCount: 0,
      };
    }

    // Extract column names from ResultSetMetadata (more reliable than parsing first row)
    const columns = resultsResponse.ResultSet.ResultSetMetadata?.ColumnInfo?.map(
      (col: any) => col.Name || col.Label || 'unknown_column'
    ) || [];
    
    // For paginated results, we still get all rows as data (no header row in pagination)
    // For first page with headers in data, Athena includes the header row which we need to skip
    let dataRows;
    
    if (nextToken) {
      // Pagination: all rows are data
      dataRows = resultsResponse.ResultSet.Rows || [];
    } else {
      // First page: first row might be headers (check if it matches column names)
      const allRows = resultsResponse.ResultSet.Rows || [];
      const firstRow = allRows[0];
      
      // Check if first row is a header row by comparing to column metadata
      const firstRowValues = firstRow?.Data?.map((cell: any) => cell.VarCharValue || '') || [];
      const isHeaderRow = firstRowValues.length > 0 && 
        firstRowValues.every((val: string, idx: number) => val === columns[idx]);
      
      // Skip first row only if it's a header row
      dataRows = isHeaderRow ? allRows.slice(1) : allRows;
    }
    
    // Extract data rows
    const data = dataRows.map((row: any) => {
      const rowData: Record<string, string> = {};
      row.Data?.forEach((cell: any, index: number) => {
        const columnName = columns[index] || `column_${index}`;
        rowData[columnName] = cell.VarCharValue || '';
      });
      return rowData;
    });

    const result: AthenaQueryResult = {
      queryExecutionId,
      status: 'SUCCEEDED',
      data,
      columns: nextToken ? undefined : columns, // Only include columns on first page
      rowCount: data.length,
    };

    // Include nextToken if more results are available
    if (resultsResponse.NextToken) {
      result.nextToken = resultsResponse.NextToken;
    }

    return result;
  } catch (error) {
    console.error('Error getting query results:', error);
    return {
      queryExecutionId,
      status: 'FAILED',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function handleMapLayerQuery(event: AppSyncResolverEvent<MapLayerQueryInput>): Promise<MapLayerQueryResult> {
  const { queryString, database, geoJsonMapping } = event.arguments;
  
  try {
    console.log('Executing map layer query:', { queryString, database, geoJsonMapping });
    
    // Parse geoJsonMapping if it's a string
    const mapping: GeoJsonMappingConfig = typeof geoJsonMapping === 'string' 
      ? JSON.parse(geoJsonMapping) 
      : geoJsonMapping;
    
    // Validate mapping configuration
    if (!mapping.geometryType) {
      throw new Error('geoJsonMapping must include geometryType');
    }
    
    if (mapping.geometryType === 'Point' && (!mapping.longitudeField || !mapping.latitudeField)) {
      throw new Error('Point geometry requires longitudeField and latitudeField');
    }
    
    if ((mapping.geometryType === 'LineString' || mapping.geometryType === 'Polygon') && !mapping.coordinatesField) {
      throw new Error(`${mapping.geometryType} geometry requires coordinatesField`);
    }
    
    // Execute the query
    const params = {
      QueryString: queryString,
      QueryExecutionContext: { Database: database },
      ManagedQueryResultsConfiguration: {
        enabled: true
      }
    };
    
    const startCommand = new StartQueryExecutionCommand(params);
    const startResponse = await athena.send(startCommand);
    
    if (!startResponse.QueryExecutionId) {
      throw new Error('Failed to start query execution');
    }
    
    console.log('Query started with ID:', startResponse.QueryExecutionId);
    
    // Poll for query completion (with timeout)
    const maxAttempts = 60; // 2 minutes max
    let attempts = 0;
    let queryResult: AthenaQueryResult | null = null;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      queryResult = await getQueryResults(startResponse.QueryExecutionId);
      
      if (queryResult.status === 'SUCCEEDED') {
        break;
      } else if (queryResult.status === 'FAILED' || queryResult.status === 'CANCELLED') {
        throw new Error(queryResult.error || 'Query failed');
      }
      
      attempts++;
    }
    
    if (!queryResult || queryResult.status !== 'SUCCEEDED') {
      throw new Error('Query timeout: Query did not complete within 2 minutes');
    }
    
    if (!queryResult.data || queryResult.data.length === 0) {
      return {
        success: true,
        geoJsonData: { type: 'FeatureCollection', features: [] },
        rowCount: 0,
      };
    }
    
    // Convert query results to GeoJSON
    const features = queryResult.data
      .map((row: any) => {
        try {
          let geometry: any;
          
          if (mapping.geometryType === 'Point') {
            const lon = parseFloat(row[mapping.longitudeField!]);
            const lat = parseFloat(row[mapping.latitudeField!]);
            
            if (isNaN(lon) || isNaN(lat)) {
              console.warn('Invalid coordinates in row:', row);
              return null;
            }
            
            geometry = {
              type: 'Point',
              coordinates: [lon, lat]
            };
          } else if (mapping.geometryType === 'LineString' || mapping.geometryType === 'Polygon') {
            const coordsString = row[mapping.coordinatesField!];
            if (!coordsString) {
              console.warn('Missing coordinates field in row:', row);
              return null;
            }
            
            // Parse coordinates (expecting JSON array)
            const coordinates = JSON.parse(coordsString);
            geometry = {
              type: mapping.geometryType,
              coordinates
            };
          }
          
          // Extract properties
          const properties: Record<string, any> = {};
          if (mapping.propertyFields && mapping.propertyFields.length > 0) {
            mapping.propertyFields.forEach(field => {
              if (field in row) {
                properties[field] = row[field];
              }
            });
          } else {
            // Include all fields except coordinate fields
            Object.keys(row).forEach(key => {
              if (key !== mapping.longitudeField && 
                  key !== mapping.latitudeField && 
                  key !== mapping.coordinatesField) {
                properties[key] = row[key];
              }
            });
          }
          
          return {
            type: 'Feature',
            geometry,
            properties
          };
        } catch (error) {
          console.error('Error converting row to feature:', error, row);
          return null;
        }
      })
      .filter((feature: any) => feature !== null);
    
    const geoJsonData = {
      type: 'FeatureCollection',
      features
    };
    
    console.log(`Successfully converted ${features.length} rows to GeoJSON features`);
    
    return {
      success: true,
      geoJsonData,
      rowCount: features.length,
    };
    
  } catch (error) {
    console.error('Error executing map layer query:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
