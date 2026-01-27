#!/usr/bin/env tsx
/**
 * GraphQL Query Runner - Command Line Helper
 *
 * This script allows you to run custom GraphQL queries against your Amplify backend
 * from the command line.
 *
 * Usage:
 *   npm run graphql -- '<custom query>'
 *   npm run graphql -- interactive
 *
 * Examples:
 *   npm run graphql -- 'query { listChatSessions { items { id name createdAt } } }'
 *   npm run graphql -- 'query { listProcessEquipment(limit: 5) { items { id equipmentTag name } } }'
 *   npm run graphql -- interactive
 */

import { setAmplifyEnvVars, getConfiguredAmplifyClient } from '../utils/amplifyUtils'
import * as readline from 'readline'

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logError(message: string) {
  log(`❌ Error: ${message}`, colors.red)
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green)
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.cyan)
}

async function runCustomQuery(client: any, query: string) {
  try {
    log(`\n⚡ Running custom query...`, colors.bright)
    log(`Query: ${query}\n`, colors.yellow)

    const result = await client.graphql({ query })

    if (result.errors && result.errors.length > 0) {
      logError(`Query errors:\n${JSON.stringify(result.errors, null, 2)}`)
    }

    if (result.data) {
      logSuccess(`Query executed successfully\n`)
      console.log(JSON.stringify(result.data, null, 2))
    } else {
      logInfo('No data returned from query')
    }

    return result.data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error, null, 2)
    logError(`Failed to execute query: ${errorMessage}`)
    if (error instanceof Error && error.stack) {
      console.error(colors.red + error.stack + colors.reset)
    }
    throw error
  }
}

function showHelp() {
  console.log(`
${colors.bright}GraphQL Query Runner - Help${colors.reset}

${colors.cyan}Description:${colors.reset}
  A command-line tool for running custom GraphQL queries against your Amplify backend.

${colors.cyan}Usage:${colors.reset}
  npm run graphql -- '<graphql-query>'
  npm run graphql -- interactive

${colors.cyan}Commands:${colors.reset}

  ${colors.green}'<graphql-query>'${colors.reset}
    Run a custom GraphQL query or mutation
    Example: npm run graphql -- 'query { listChatSessions { items { id name } } }'

  ${colors.green}interactive${colors.reset}
    Enter interactive mode to run multiple queries
    Example: npm run graphql -- interactive

  ${colors.green}help${colors.reset}
    Show this help message

${colors.cyan}Query Examples:${colors.reset}

  ${colors.yellow}# List chat sessions${colors.reset}
  npm run graphql -- 'query { listChatSessions { items { id name createdAt } } }'

  ${colors.yellow}# List with limit and filter${colors.reset}
  npm run graphql -- 'query { 
    listProcessEquipment(
      limit: 5,
      filter: { healthStatus: { eq: "CRITICAL" } }
    ) { 
      items { 
        equipmentTag 
        name 
        healthStatus 
      } 
    } 
  }'

  ${colors.yellow}# Get specific item${colors.reset}
  npm run graphql -- 'query { getWorkOrder(id: "work-order-123") { id workOrderNumber status } }'

  ${colors.yellow}# Query with nested relationships${colors.reset}
  npm run graphql -- 'query {
    listWorkOrders {
      items {
        id
        workOrderNumber
        equipment {
          equipmentTag
          name
        }
      }
    }
  }'

${colors.cyan}Interactive Mode:${colors.reset}
  In interactive mode, you can:
  - Run multiple queries without restarting the script
  - Type ${colors.green}help${colors.reset} to see this help message
  - Type ${colors.green}exit${colors.reset} or ${colors.green}quit${colors.reset} to leave interactive mode

  Example session:
  ${colors.yellow}graphql>${colors.reset} query { listAreas { items { name } } }
  ${colors.yellow}graphql>${colors.reset} query { listPersonnel(limit: 3) { items { name role } } }
  ${colors.yellow}graphql>${colors.reset} exit

${colors.cyan}Notes:${colors.reset}
  - The script automatically configures Amplify using amplify_outputs.json
  - Ensure your Amplify backend is deployed (via 'npx ampx sandbox' or production)
  - All GraphQL queries and mutations from your schema are supported
`)
}

async function interactiveMode(client: any) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  log('\n🔧 Interactive Mode - Enter GraphQL queries', colors.bright)
  log('Type "help" for examples, "exit" to quit\n', colors.cyan)

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve)
    })
  }

  while (true) {
    const input = await question(`${colors.yellow}graphql> ${colors.reset}`)
    const trimmed = input.trim()

    if (!trimmed) continue

    if (trimmed === 'exit' || trimmed === 'quit') {
      log('\nGoodbye! 👋', colors.cyan)
      rl.close()
      break
    }

    if (trimmed === 'help') {
      showHelp()
      continue
    }

    try {
      // Check if input looks like a query/mutation
      if (trimmed.startsWith('query') || trimmed.startsWith('mutation')) {
        await runCustomQuery(client, trimmed)
      } else {
        logError('Invalid input. Queries must start with "query" or "mutation".')
        log('Example: query { listChatSessions { items { id name } } }', colors.cyan)
      }
    } catch (error) {
      logError(`Query failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    console.log('') // Empty line for readability
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showHelp()
    return
  }

  // Setup Amplify environment
  log('🔧 Setting up Amplify environment...', colors.cyan)
  const envResult = await setAmplifyEnvVars()

  if (!envResult.success) {
    logError('Failed to set up Amplify environment')
    if (envResult.error) {
      console.error(envResult.error)
    }
    process.exit(1)
  }

  logSuccess('Amplify environment configured')

  // Get Amplify client
  const client = getConfiguredAmplifyClient()

  const command = args[0]

  try {
    if (command === 'interactive') {
      await interactiveMode(client)
    } else {
      // Treat everything else as a query
      const query = args.join(' ').replace(/^['"]|['"]$/g, '')

      if (!query.startsWith('query') && !query.startsWith('mutation')) {
        logError('Queries must start with "query" or "mutation"')
        log("Example: npm run graphql -- 'query { listChatSessions { items { id } } }'", colors.cyan)
        process.exit(1)
      }

      await runCustomQuery(client, query)
    }
  } catch (error) {
    logError(`Command failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

// Run the script
main().catch((error) => {
  logError(`Unexpected error: ${error}`)
  process.exit(1)
})
