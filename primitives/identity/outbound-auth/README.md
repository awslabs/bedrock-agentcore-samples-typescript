# Outbound Authentication

Your agent accessing external services on behalf of users.

## Overview

Agents become useful when they can take actions — read calendars, send emails, query databases. These services require authentication, and managing OAuth tokens per-user is complex: handling consent flows, secure storage, token refresh, and revocation.

AgentCore Identity handles this through the Token Vault. You wrap your API calls with `withAccessToken`, and the SDK manages everything else:

```
User: "What's on my calendar today?"
        │
        ▼
┌─────────────────────────────────────────────────────┐
│                    Your Agent                       │
│                                                     │
│   withAccessToken({                                 │
│     providerName: 'google-cal',                     │
│     scopes: ['calendar.readonly'],                  │
│   })(async (token) => {                             │
│     // token injected automatically                 │
│     fetch('googleapis.com/calendar', {              │
│       headers: { Authorization: `Bearer ${token}` } │
│     })                                              │
│   })                                                │
│                                                     │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│              AgentCore Token Vault                  │
│                                                     │
│   • First request → triggers OAuth flow             │
│   • Tokens stored per-user, encrypted               │
│   • Automatic refresh when expired                  │
│   • No credentials in your code                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Auth Flow Types

### Three-Legged OAuth (3LO) — User Delegation

The agent acts **on behalf of a specific user**. The user grants permission via OAuth consent.

**Use cases:**

- Access a user's Google Calendar
- Send emails from a user's account
- Read a user's Slack messages

**How it works:**

1. Agent requests access → user sees OAuth consent screen
2. User grants permission → token stored in Token Vault
3. Future requests → token auto-injected, refreshed as needed

### Two-Legged OAuth (2LO) — Service Accounts

The agent acts **as itself**, not on behalf of a user. Uses service account credentials.

**Use cases:**

- Access company-wide resources
- Backend-to-backend API calls
- No user interaction required

### API Keys

Simple authentication for services that don't support OAuth. Use `withApiKey` to retrieve keys from the Token Vault:

```typescript
const callWeatherApi = withApiKey({
  providerName: 'weather-api',
})(async (city: string, apiKey: string) => {
  return fetch(`https://api.weather.com/v1/${city}`, {
    headers: { 'X-API-Key': apiKey },
  })
})
```

**Use cases:**

- Third-party APIs (weather, maps, etc.)
- Internal services with key-based auth

## Samples

| Sample                      | Auth Type | Description                               |
| --------------------------- | --------- | ----------------------------------------- |
| [google-cal](./google-cal/) | 3LO       | Access Google Calendar on behalf of users |

## Key Concepts

**Credential Provider** — Configured in AgentCore with your OAuth client credentials. Defines which external service (Google, Slack, etc.) and what scopes are available.

**Workload Identity** — Your agent's identity in AgentCore. Links your agent to credential providers and defines allowed callback URLs.

**Token Vault** — Secure, per-user token storage. Handles encryption, refresh, and injection automatically.

**`withAccessToken`** — SDK wrapper for OAuth2. Handles token retrieval, caching, and refresh. Your code just receives the token.

**`withApiKey`** — SDK wrapper for API keys. Retrieves keys from the Token Vault by provider name.
