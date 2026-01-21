# Outbound Authentication with Google Calendar (3LO)

Access Google Calendar on behalf of users using Three-Legged OAuth—AgentCore handles token management.

|                         |                    |
| ----------------------- | ------------------ |
| **AgentCore component** | Identity           |
| **Framework**           | Strands Agents SDK |
| **Model**               | Amazon Nova Lite   |

## Overview

This sample demonstrates **outbound authentication** using Three-Legged OAuth (3LO) to access Google Calendar on behalf of users. Unlike inbound auth (which validates who can call your agent), outbound auth enables your agent to access external services using the user's credentials.

**How 3LO works:**

1. User asks agent about their calendar
2. Agent needs Google Calendar access → no token cached
3. AgentCore returns an authorization URL
4. User clicks URL → authorizes with Google
5. AgentCore stores token in secure vault
6. Agent accesses Google Calendar with user's token

**Key benefits:**

- No OAuth implementation required in your agent
- Tokens stored securely in AgentCore Token Vault
- Automatic token refresh
- User-agent isolation (Agent A can't access Agent B's tokens)

## Prerequisites

- Node.js 20+
- AWS credentials configured
- [AgentCore Starter Toolkit](https://github.com/aws/bedrock-agentcore-starter-toolkit):

```bash
pip install bedrock-agentcore-starter-toolkit
```

## Implementation

The agent uses `withAccessToken` to wrap tools that need OAuth tokens:

```typescript
import { withAccessToken } from 'bedrock-agentcore/identity'

const getCalendar = tool({
  name: 'getCalendar',
  description: 'Get calendar events',
  inputSchema: z.object({ maxResults: z.number().optional() }),
  callback: withAccessToken({
    providerName: 'google-cal-provider',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    authFlow: 'USER_FEDERATION',
    workloadIdentityToken: context.workloadAccessToken, // From request context
    callbackUrl: 'http://localhost:9090/oauth2/callback',
    onAuthUrl: (url) => console.log('Auth URL:', url),
  })(async (input, token) => {
    // Token automatically injected - call Google Calendar API
    const response = await fetch('https://www.googleapis.com/calendar/v3/...', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.json()
  }),
})
```

> [Full source](./agent.ts)

## Setup

> **Note:** Replace `us-east-1` with your AWS region in all commands below.

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google Calendar API**:
   - Go to **APIs & Services > Library**
   - Search "Google Calendar API" and enable it
4. Configure OAuth consent screen:
   - Go to **APIs & Services > OAuth consent screen**
   - Enter an app name
   - Select "External" user type (appears after naming)
   - Fill in required fields (support email, developer email)
   - Click through the remaining steps (scopes are added to the OAuth app, not here)
5. Create credentials:
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Select "Web application"
   - Give it a name (e.g., "AgentCore Calendar")
   - Click **Create**
   - Note your **Client ID** and **Client Secret** from the popup
   - Leave redirect URIs empty for now (we'll add it in step 3)

### 2. Create AgentCore Credential Provider

```bash
# Replace us-east-1 with your region!
RESPONSE=$(aws bedrock-agentcore-control create-oauth2-credential-provider \
  --region us-east-1 \
  --name "google-cal-provider" \
  --credential-provider-vendor "GoogleOauth2" \
  --oauth2-provider-config-input '{
    "googleOauth2ProviderConfig": {
      "clientId": "YOUR_GOOGLE_CLIENT_ID",
      "clientSecret": "YOUR_GOOGLE_CLIENT_SECRET"
    }
  }' \
  --output json)

# Extract and display the callback URL
AGENTCORE_CALLBACK_URL=$(echo $RESPONSE | jq -r '.callbackUrl')
echo "AgentCore Callback URL: $AGENTCORE_CALLBACK_URL"
echo ""
echo ">>> ADD THIS URL TO GOOGLE OAUTH REDIRECT URIs <<<"
```

**Important:** Copy the `callbackUrl` from the response and add it to your Google OAuth app:

1. Go back to Google Cloud Console > APIs & Services > Credentials
2. Click on your OAuth 2.0 Client ID to edit it
3. Under "Authorized redirect URIs", click **Add URI**
4. Paste the AgentCore callback URL
5. Click **Save**

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure the Agent

```bash
agentcore configure
```

When prompted:

- Specify `agent.ts` as the entrypoint
- Enter a name for the agent (e.g., `google-cal-agent`)
- Enter `s` to skip memory creation
- Select **No authentication** (or configure inbound auth separately)

### 5. Deploy to Create Workload Identity

The workload identity is created when you deploy. Deploy first to create it:

```bash
agentcore deploy
```

### 6. Update Workload Identity with Callback URL

After deployment, update the workload identity to allow your local callback URL:

```bash
# Get your agent name from .bedrock_agentcore.yaml
AGENT_NAME=$(cat .bedrock_agentcore.yaml | grep 'default_agent' | awk '{print $2}')

# Replace us-east-1 with your region!
aws bedrock-agentcore-control update-workload-identity \
  --region us-east-1 \
  --name "$AGENT_NAME" \
  --allowed-resource-oauth2-return-urls '["http://localhost:9090/oauth2/callback"]'
```

## Local Development

### Terminal 1: Start Callback Server

```bash
npm run dev:callback
```

You should see:

```
[callback] OAuth Callback Server Started
[callback] Listening on http://localhost:9090
```

### Terminal 2: Start Agent

```bash
agentcore dev
```

### Terminal 3: Test the Agent

First, store a user identifier for the callback server:

```bash
curl -X POST http://localhost:9090/userIdentifier/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123"}'
```

Then invoke the agent:

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-session" \
  -d '{"prompt": "What events do I have on my calendar?"}'
```

**First time flow:**

1. Agent will log an authorization URL
2. Open that URL in your browser
3. Sign in with Google and grant access
4. You'll be redirected to the callback server
5. Callback server completes the auth
6. Agent receives the token and fetches calendar events

**Subsequent requests:**

- Token is cached in AgentCore Token Vault
- No authorization needed—agent accesses calendar immediately

## Troubleshooting

### "No workloadAccessToken in context"

This means the runtime isn't providing the workload access token. Ensure:

- You're running with `agentcore dev` (not directly with tsx)
- The agent is properly configured with `agentcore configure`
- You have deployed at least once with `agentcore deploy`

### "WorkloadIdentity not found"

The workload identity is created during deployment. Run `agentcore deploy` first.

### "Polling timed out after 600 seconds"

The user didn't complete authorization within 10 minutes. Try again and complete the Google sign-in faster.

### "Missing session_id"

The callback URL didn't include the session_id. Ensure you're using the URL exactly as provided by the agent.

### Google OAuth errors

- **redirect_uri_mismatch**: The callback URL isn't registered in Google. Add the AgentCore callback URL to your Google OAuth app's redirect URIs.
- **access_denied**: User denied the permission request.

## Clean Up

Destroy the AgentCore Runtime:

```bash
agentcore destroy
```

Delete the credential provider (replace region!):

```bash
aws bedrock-agentcore-control delete-oauth2-credential-provider \
  --region us-east-1 \
  --name "google-cal-provider"
```
