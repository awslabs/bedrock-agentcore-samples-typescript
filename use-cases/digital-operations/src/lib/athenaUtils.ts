import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

/**
 * Configuration options for polling an Athena query
 */
export interface AthenaQueryOptions {
  /** Maximum number of polling attempts (default: 60) */
  maxRetries?: number;
  /** Delay between polling attempts in milliseconds (default: 2000) */
  pollInterval?: number;
}

/**
 * Result of an Athena query execution
 */
export interface AthenaQueryResult<T> {
  /** The parsed data from the query */
  data: T[];
  /** The query execution ID */
  queryExecutionId: string;
  /** Query status */
  status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
}

/**
 * Error thrown when an Athena query fails or times out
 */
export class AthenaQueryError extends Error {
  constructor(
    message: string,
    public readonly queryExecutionId?: string,
    public readonly status?: string
  ) {
    super(message);
    this.name = 'AthenaQueryError';
  }
}

/**
 * Polls an Athena query execution until it completes or times out
 * 
 * @param queryExecutionId - The ID of the query execution to poll
 * @param options - Polling configuration options
 * @returns Promise that resolves with the query results
 * @throws {AthenaQueryError} If the query fails, is cancelled, or times out
 * 
 * @example
 * ```typescript
 * interface WellData {
 *   id: string;
 *   name: string;
 *   latitude: string;
 *   longitude: string;
 * }
 * 
 * const result = await pollAthenaQuery<WellData>(queryExecutionId);
 * console.log(result.data); // Typed as WellData[]
 * ```
 */
export async function pollAthenaQuery<T = unknown>(
  queryExecutionId: string,
  options: AthenaQueryOptions = {}
): Promise<AthenaQueryResult<T>> {
  const { maxRetries = 60, pollInterval = 2000 } = options;
  
  async function poll(retries = 0): Promise<AthenaQueryResult<T>> {
    if (retries > maxRetries) {
      throw new AthenaQueryError(
        `Query timeout: Athena query did not complete within ${maxRetries} attempts`,
        queryExecutionId,
        'TIMEOUT'
      );
    }

    try {
      const statusResult = await client.mutations.executeAthenaQuery({
        queryString: '',
        queryExecutionId
      });

      const status = statusResult.data?.status;
      const error = statusResult.data?.error;

      if (status === 'SUCCEEDED' && statusResult.data?.data) {
        const dataString = typeof statusResult.data.data === 'string' 
          ? statusResult.data.data 
          : JSON.stringify(statusResult.data.data);
        
        const parsedData = JSON.parse(dataString) as T[];
        
        return {
          data: parsedData,
          queryExecutionId,
          status: 'SUCCEEDED'
        };
      } else if (status === 'RUNNING' || status === 'QUEUED') {
        console.log(`Waiting for response for Athena query id ${queryExecutionId}`)
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        return poll(retries + 1);
      } else if (status === 'FAILED' || status === 'CANCELLED') {
        throw new AthenaQueryError(
          error || `Query ${status.toLowerCase()}: ${status}`,
          queryExecutionId,
          status
        );
      } else if (error) {
        throw new AthenaQueryError(error, queryExecutionId, status);
      } else {
        // Unknown status, wait and retry
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        return poll(retries + 1);
      }
    } catch (error) {
      if (error instanceof AthenaQueryError) {
        throw error;
      }
      throw new AthenaQueryError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        queryExecutionId,
        'ERROR'
      );
    }
  }

  return poll();
}

/**
 * Executes an Athena query and polls for results
 * 
 * @param queryString - The SQL query to execute
 * @param database - The database to query against
 * @param options - Polling configuration options
 * @returns Promise that resolves with the query results
 * @throws {AthenaQueryError} If the query fails to start or complete
 * 
 * @example
 * ```typescript
 * interface ProductionData {
 *   date: string;
 *   total_daily_gas_rate_mcf: string;
 *   well_count: string;
 * }
 * 
 * const result = await executeAthenaQuery<ProductionData>(
 *   `SELECT date, SUM(dailygasrate) as total_daily_gas_rate_mcf
 *    FROM upstream.monthly_production
 *    GROUP BY date
 *    ORDER BY date DESC
 *    LIMIT 12`,
 *   'upstream'
 * );
 * 
 * result.data.forEach(row => {
 *   console.log(`${row.date}: ${row.total_daily_gas_rate_mcf} MCF`);
 * });
 * ```
 */
export async function executeAthenaQuery<T = unknown>(
  queryString: string,
  database?: string,
  options: AthenaQueryOptions = {}
): Promise<AthenaQueryResult<T>> {
  try {
    const queryResult = await client.mutations.executeAthenaQuery({
      queryString,
      database
    });

    if (!queryResult.data?.queryExecutionId) {
      throw new AthenaQueryError(
        'Failed to start query: No query execution ID returned',
        undefined,
        'FAILED'
      );
    }

    return pollAthenaQuery<T>(queryResult.data.queryExecutionId, options);
  } catch (error) {
    if (error instanceof AthenaQueryError) {
      throw error;
    }
    throw new AthenaQueryError(
      error instanceof Error ? error.message : 'Failed to execute query',
      undefined,
      'ERROR'
    );
  }
}
