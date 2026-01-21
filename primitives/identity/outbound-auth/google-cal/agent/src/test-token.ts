import { withAccessToken } from 'bedrock-agentcore/identity'

// Simple test function that uses withAccessToken
const testTokenFunction = withAccessToken({
  providerName: 'google-cal-provider',
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  authFlow: 'USER_FEDERATION',
  onAuthUrl: (url: string) => {
    console.log('Authorization URL:', url)
  },
  callbackUrl: process.env.CALLBACK_URL || 'http://localhost:8080',
  workloadIdentityToken: process.env.WORKLOAD_IDENTITY_TOKEN || '',
})(async (input: { message: string }, token: string) => {
  console.log('=== Access Token Test ===')
  console.log('Input:', input)
  console.log('Token:', token)
  console.log('Token length:', token.length)
  console.log('Token prefix:', token.substring(0, 20) + '...')
  console.log('========================')

  return {
    success: true,
    message: input.message,
    tokenReceived: !!token,
  }
})

// Run the test
async function runTest() {
  try {
    const result = await testTokenFunction({ message: 'Hello from test!' })
    console.log('Result:', result)
  } catch (error) {
    console.error('Error:', error)
  }
}

;(async () => {
  await runTest()
})()
