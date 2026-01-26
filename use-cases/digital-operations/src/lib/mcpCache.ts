import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import { loadOutputs } from '@/../utils/amplifyUtils';

const outputs = loadOutputs();

// ==================== MCP CLIENT CACHE ====================
// Use global object to persist cache across Next.js HMR (Hot Module Reloading)
// This ensures the cache survives route recompilation during development

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MCPClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MCPTools = any;

declare global {
    var mcpCache: {
        client: MCPClient | null;
        tools: MCPTools | null;
        timestamp: number;
    } | undefined;
}

// Initialize global cache if it doesn't exist
if (!global.mcpCache) {
    global.mcpCache = {
        client: null,
        tools: null,
        timestamp: 0
    };
}

// Cache TTL: 30 minutes (slightly less than typical Cognito token expiration of 60 minutes)
const CACHE_TTL = 30 * 60 * 1000;

/**
 * Check if an MCP client is still valid and open
 */
async function isClientValid(client: MCPClient): Promise<boolean> {
    if (!client) return false;
    
    try {
        // Try to ping the client by getting its connection status
        // If the client is closed, this will throw an error
        await client.tools();
        return true;
    } catch (error) {
        console.log('Cached MCP client is no longer valid:', error instanceof Error ? error.message : error);
        return false;
    }
}

/**
 * Get or create a cached MCP client and tools
 * Implements caching to avoid recreating the client on every request
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMcpClientAndTools(tokens: any) {
    const now = Date.now();
    const cache = global.mcpCache!;
    const cacheAge = now - cache.timestamp;
    
    // Check if we have a cached client that's not expired
    if (cache.client && cache.tools && cacheAge < CACHE_TTL) {
        // Validate that the cached client is still open and functional
        const isValid = await isClientValid(cache.client);
        
        if (isValid) {
            console.log(`Using cached MCP client (age: ${Math.round(cacheAge / 1000)}s)`);
            return { 
                mcpClient: cache.client, 
                mcpTools: cache.tools,
                cached: true 
            };
        } else {
            console.log('Cached MCP client is closed/invalid, creating new one');
            // Clear the invalid cache
            clearMcpCache();
        }
    }
    
    // Cache expired, invalid, or doesn't exist - create new client
    const reason = !cache.client ? 'no cached client' : 
                   cacheAge >= CACHE_TTL ? 'cache expired' : 
                   'client invalid';
    console.log(`Creating new MCP client (${reason})`);
    
    const mcpServerAgentArn = outputs.custom.mcpServerAgentArn;
    const encodedArn = mcpServerAgentArn.replace(/:/g, '%3A').replace(/\//g, '%2F');
    const mcpUrl = `https://bedrock-agentcore.${outputs.auth.aws_region}.amazonaws.com/runtimes/${encodedArn}/invocations?qualifier=DEFAULT`;
    
    console.log(`Creating MCP client for url: ${mcpUrl}`);
    
    const mcpClient = await createMCPClient({
        transport: {
            type: 'http',
            url: mcpUrl,
            headers: {
                'Authorization': `Bearer ${tokens.accessToken?.toString()}`,
                'Content-Type': 'application/json',
            },
        },
    });
    
    // Get tools from MCP server
    console.log('Loading MCP tools');
    const mcpTools = await mcpClient.tools();
    console.log('Loaded MCP tools:', Object.keys(mcpTools));
    
    // Update global cache
    cache.client = mcpClient;
    cache.tools = mcpTools;
    cache.timestamp = now;
    
    return { 
        mcpClient, 
        mcpTools,
        cached: false 
    };
}

/**
 * Clear the MCP client cache
 * Useful for forcing a refresh or handling errors
 */
export function clearMcpCache() {
    console.log('Clearing MCP client cache');
    const cache = global.mcpCache!;
    cache.client = null;
    cache.tools = null;
    cache.timestamp = 0;
}

/**
 * Get cache status
 */
export function getCacheStatus() {
    const now = Date.now();
    const cache = global.mcpCache!;
    const cacheAge = cache.timestamp > 0 ? now - cache.timestamp : null;
    
    return {
        hasCachedClient: cache.client !== null,
        hasCachedTools: cache.tools !== null,
        cacheAge: cacheAge !== null ? Math.round(cacheAge / 1000) : null,
        isValid: cacheAge !== null && cacheAge < CACHE_TTL
    };
}
