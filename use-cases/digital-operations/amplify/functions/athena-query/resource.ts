import { defineFunction } from '@aws-amplify/backend'

export const athenaQuery = defineFunction({
  name: 'athena-query',
  entry: './handler.ts',
  timeoutSeconds: 900, // 15 minutes - enough for long-running Athena queries
  memoryMB: 1024,
})
