import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { executeGraphqlTool } from './tools/executeGraphql'
import { allQueryTools } from './tools/queryTools'

export const mcpServerCreate = () => {
  const mcpServer = new McpServer({
    name: 'MCP-Server',
    version: '1.0.0',
  })

  mcpServer.registerTool(
    'add',
    {
      title: 'Addition Tool',
      description: 'Add two numbers',
      inputSchema: { a: z.number(), b: z.number() },
    },
    async ({ a, b }) => ({
      content: [{ type: 'text', text: String(a + b) }],
    })
  )

  mcpServer.registerTool(
    'subtract',
    {
      title: 'Subtraction Tool',
      description: 'Subtracts two numbers',
      inputSchema: { a: z.number(), b: z.number() },
    },
    async ({ a, b }) => {
      return {
        content: [{ type: 'text', text: String(a - b) }],
      }
    }
  )

  mcpServer.registerTool(executeGraphqlTool.name, executeGraphqlTool.config, executeGraphqlTool.handler)

  // // Register all query tools
  // allQueryTools.forEach(tool => {
  //   mcpServer.registerTool(
  //     tool.name,
  //     tool.config as any,
  //     tool.handler as any
  //   );
  // });

  return mcpServer
}
