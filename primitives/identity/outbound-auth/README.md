# Outbound Authentication

Let your agent call external services, such as Google Calendar, with credentials it never stores itself.

You give AgentCore Identity your OAuth client or API key once, as a credential provider. In the agent, you wrap the
function that calls the service, and the SDK passes it a token from the Token Vault:

```typescript
import { withAccessToken } from 'bedrock-agentcore/identity'

const listEvents = withAccessToken({
  providerName: 'google-cal',
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  authFlow: 'USER_FEDERATION',
  onAuthUrl: (url) => console.log(`Ask the user to open ${url}`),
})(async (token: string) => {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
})
```

The Token Vault keeps each user's tokens and refreshes them, so the user consents only once.

## Auth Flows

`authFlow` picks how AgentCore gets the token:

| `authFlow`                    | Acts as            | Use it for                                                               |
| ----------------------------- | ------------------ | ------------------------------------------------------------------------ |
| `USER_FEDERATION`             | The signed-in user | Three-legged OAuth (3LO): the user consents once, e.g. to their calendar |
| `M2M`                         | The agent itself   | Client credentials (2LO): company-wide APIs, with no user involved       |
| `ON_BEHALF_OF_TOKEN_EXCHANGE` | The signed-in user | OAuth token exchange: trade the user's token for one the service accepts |

For services that use API keys, `withApiKey` passes the key from the Token Vault as the function's last argument:

```typescript
import { withApiKey } from 'bedrock-agentcore/identity'

const getWeather = withApiKey({ providerName: 'weather-api' })(async (city: string, apiKey: string) => {
  const response = await fetch(`https://api.example.com/weather/${city}`, { headers: { 'X-API-Key': apiKey } })
  return response.json()
})
```

## Key Concepts

- **Credential provider**: your OAuth client or API key, stored in AgentCore Identity. Add one with
  `agentcore add credentials`; `agentcore deploy` creates it.
- **Workload identity**: the agent's identity in AgentCore. It links the agent to credential providers and lists the
  URLs a user may be sent back to after consent.
- **Token Vault**: per-user token storage that encrypts and refreshes tokens.

## Samples

| Sample                      | Auth flow         | Description                                   |
| --------------------------- | ----------------- | --------------------------------------------- |
| [google-cal](./google-cal/) | `USER_FEDERATION` | Read a user's Google Calendar on their behalf |
