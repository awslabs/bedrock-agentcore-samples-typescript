export const config = {
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  modelId: process.env['BEDROCK_MODEL_ID'] ?? 'global.anthropic.claude-haiku-5-5',
  browserIdentifier: process.env['BROWSER_IDENTIFIER'] ?? 'aws.browser.v1',
  viewport: { width: 1920, height: 1080 },
  serverPort: parseInt(process.env['PORT'] ?? '3001'),
  clientPort: parseInt(process.env['CLIENT_PORT'] ?? '5173'),
}
