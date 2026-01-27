/**
 * Script to clean up invalid MapLayer records that have null required fields
 *
 * Usage:
 *   npx tsx scripts/cleanupInvalidMapLayers.ts
 *
 * This script will:
 * 1. List all MapLayer records
 * 2. Identify those with null/missing required fields (athenaQuery, athenaDatabase, geoJsonMapping)
 * 3. Delete the invalid records
 */

import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import amplifyOutputs from '../amplify_outputs.json'

// Configure Amplify
Amplify.configure(amplifyOutputs)

const client = generateClient<Schema>()

interface MapLayer {
  id: string
  chatSessionId?: string
  name?: string
  athenaQuery?: string
  athenaDatabase?: string
  geoJsonMapping?: string
}

async function cleanupInvalidMapLayers() {
  console.log('🔍 Scanning for invalid MapLayer records...\n')

  try {
    // Fetch all MapLayer records
    const result = await client.models.MapLayer.list({
      limit: 1000,
    })

    if (!result.data || result.data.length === 0) {
      console.log('✅ No MapLayer records found')
      return
    }

    console.log(`📊 Found ${result.data.length} total MapLayer records\n`)

    // Identify invalid records
    const invalidLayers: MapLayer[] = []
    const validLayers: MapLayer[] = []

    result.data.forEach((layer) => {
      if (!layer) {
        console.log('⚠️  Found null layer in results')
        return
      }

      const mapLayer = layer as MapLayer

      // Check for required fields
      if (!mapLayer.athenaQuery || !mapLayer.athenaDatabase || !mapLayer.geoJsonMapping) {
        invalidLayers.push(mapLayer)
      } else {
        validLayers.push(mapLayer)
      }
    })

    console.log(`✅ Valid layers: ${validLayers.length}`)
    console.log(`❌ Invalid layers: ${invalidLayers.length}\n`)

    if (invalidLayers.length === 0) {
      console.log('🎉 No invalid MapLayer records found!')
      return
    }

    // Display invalid layers
    console.log('Invalid MapLayer records:')
    console.log('─'.repeat(80))
    invalidLayers.forEach((layer, index) => {
      console.log(`\n${index + 1}. Layer ID: ${layer.id}`)
      console.log(`   Name: ${layer.name || 'N/A'}`)
      console.log(`   Chat Session: ${layer.chatSessionId || 'N/A'}`)
      console.log(`   Has athenaQuery: ${!!layer.athenaQuery}`)
      console.log(`   Has athenaDatabase: ${!!layer.athenaDatabase}`)
      console.log(`   Has geoJsonMapping: ${!!layer.geoJsonMapping}`)
    })
    console.log('\n' + '─'.repeat(80))

    // Prompt for confirmation (in a real script, you'd use readline or similar)
    console.log('\n⚠️  WARNING: This will DELETE the invalid MapLayer records listed above')
    console.log('To proceed, uncomment the deletion code in this script\n')

    // Uncomment the following code to actually delete the invalid records:
    /*
    console.log('\n🗑️  Deleting invalid MapLayer records...\n');
    
    for (const layer of invalidLayers) {
      try {
        await client.models.MapLayer.delete({ id: layer.id });
        console.log(`✅ Deleted layer: ${layer.id} (${layer.name || 'unnamed'})`);
      } catch (error) {
        console.error(`❌ Failed to delete layer ${layer.id}:`, error);
      }
    }
    
    console.log('\n✅ Cleanup complete!');
    */
  } catch (error) {
    console.error('❌ Error during cleanup:', error)

    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
  }
}

// Run the cleanup
cleanupInvalidMapLayers()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
