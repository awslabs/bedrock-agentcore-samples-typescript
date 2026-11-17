# Outbound Authentication

Let your agent call external services, such as Google Calendar, with credentials it never stores itself.

You give AgentCore Identity your OAuth client or API key once, as a credential provider. In the agent, you wrap the
function that calls the service, and the SDK passes it a token from the Token Vault:

```typescript
import { withAccessToken } from 'bedrock-agentcore/identity'

// `agentcore deploy` sets CREDENTIAL_GOOGLE_CAL_NAME to the provider created by `agentcore add credentials`.
const providerName = process.env['CREDENTIAL_GOOGLE_CAL_NAME'] ?? 'google-cal'

const events = withAccessToken({
  providerName,
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  authFlow: 'USER_FEDERATION',
  callbackUrl,
  customParameters: { access_type: 'offline', prompt: 'consent' },
  onAuthUrl: resolveAuthUrl,
})(listUpcomingEvents)(maxResults)
```

This is the [Google Calendar sample](./google-cal/)'s tool: `listUpcomingEvents(maxResults, token)` calls the Calendar
API, and `withAccessToken` supplies its last argument, `token`. Until the user has consented, `onAuthUrl` receives the
URL to send them to.

For any credential `<name>`, the deploy sets `CREDENTIAL_<NAME>_NAME` the same way. The Token Vault keeps each user's
tokens and refreshes them, so the user consents only once.

## Auth Flows

`authFlow` picks how AgentCore gets the token:

| `authFlow`                    | Acts as            | Use it for                                                               |
| ----------------------------- | ------------------ | ------------------------------------------------------------------------ |
| `USER_FEDERATION`             | The signed-in user | Three-legged OAuth (3LO): the user consents once, e.g. to their calendar |
| `M2M`                         | The agent itself   | Client credentials (2LO): company-wide APIs, with no user involved       |
| `ON_BEHALF_OF_TOKEN_EXCHANGE` | The signed-in user | OAuth token exchange: trade the user's token for one the service accepts |

For services that use API keys, `withApiKey` from `bedrock-agentcore/identity` works the same way: it passes the key
from the Token Vault as the wrapped function's last argument.

## Key Concepts

- **Credential provider**: your OAuth client or API key, stored in AgentCore Identity. Add one with
  `agentcore add credentials`; `agentcore deploy` creates it.
- **Workload identity**: the agent's identity in AgentCore. It links the agent to credential providers and lists the
  URLs a user may be sent back to after consent.
- **Token Vault**: per-user token storage that encrypts and refreshes tokens.

## Samples

| Sample                      | What it shows                                                |
| --------------------------- | ------------------------------------------------------------ |
| [google-cal](./google-cal/) | An agent that reads a user's Google Calendar on their behalf |
