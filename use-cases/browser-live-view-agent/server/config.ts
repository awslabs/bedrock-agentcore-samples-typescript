// AWS credentials come from the default provider chain: environment variables, shared config and SSO profiles, or roles.

export const config = {
  region: process.env['AWS_REGION'] ?? 'us-east-1',

  // Any Bedrock model with tool use support works
  modelId: process.env['BEDROCK_MODEL_ID'] ?? 'global.anthropic.claude-haiku-5-5',

  browser: {
    identifier: process.env['BROWSER_IDENTIFIER'] ?? 'aws.browser.v1',
    viewport: { width: 1920, height: 1080 },
    sessionTimeout: 3600,
  },

  server: {
    port: parseInt(process.env['PORT'] ?? '3001'),
  },

  client: {
    port: parseInt(process.env['CLIENT_PORT'] ?? '5173'),
  },
}
