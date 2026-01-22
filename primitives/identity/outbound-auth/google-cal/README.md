# Outbound Authentication with Google Calendar (3LO)

Access Google Calendar on behalf of users using Three-Legged OAuth with automatic token management.

|                         |                    |
| ----------------------- | ------------------ |
| **AgentCore component** | Identity           |
| **Framework**           | Strands Agents SDK |
| **Model**               | Claude Haiku 4.5   |

## Overview

This sample demonstrates **outbound authentication** using Three-Legged OAuth (3LO) to access Google Calendar on behalf of users. The key features:

- **Automatic token injection** via `withAccessToken` - tokens managed per-user in AgentCore's Token Vault
- **First call** triggers OAuth flow, **subsequent calls** use cached tokens
- **Automatic refresh** - expired tokens are refreshed transparently
- **Session binding** ensures only the user who started OAuth can complete it

## How It Works

The `withAccessToken` wrapper handles all OAuth complexity:

```typescript
const fetchCalendar = withAccessToken({
  providerName: 'google-cal-provider',
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  authFlow: 'USER_FEDERATION',
  callbackUrl: 'http://localhost:9090/oauth2/callback',
  onAuthUrl: (url) => {
    /* redirect user here */
  },
})(async (maxResults, token) => {
  // token is automatically injected - just use it
  return fetch('https://www.googleapis.com/calendar/v3/...', {
    headers: { Authorization: `Bearer ${token}` },
  })
})
```

**Token lifecycle:**

1. First call → no token found → `onAuthUrl` fires with OAuth URL
2. User completes OAuth → token stored in AgentCore Token Vault
3. Subsequent calls → token auto-injected, no OAuth needed
4. Token expires → automatic refresh using stored refresh token

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     WEB APP (web-app.ts)                        │
│                                                                 │
│   POST /api/chat              GET /oauth2/callback              │
│   ─────────────               ────────────────────              │
│   1. Validate JWT             1. Read session cookie            │
│   2. Extract userId           2. Get userId from session        │
│   3. Store in session         3. Call CompleteResourceTokenAuth │
│   4. Invoke Runtime with         with sessionUri + userId       │
│      User-Id header           4. Redirect to success page       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                    │
                    │ Invokes with X-Amzn-Bedrock-AgentCore-Runtime-User-Id
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AGENTCORE RUNTIME                           │
│                                                                 │
│   • Runs agent.ts                                               │
│   • withAccessToken triggers 3LO flow                           │
│   • Returns auth URL if no token cached                         │
│   • Returns calendar data if token exists                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js 20+
- AWS credentials configured
- [AgentCore Starter Toolkit](https://github.com/aws/bedrock-agentcore-starter-toolkit):

```bash
pip install bedrock-agentcore-starter-toolkit
```

## Setup

> **Note:** Replace `us-east-1` with your AWS region in all commands below.

### 1. Deploy Cognito (for JWT authentication)

```bash
cd cdk
npm install
npx cdk deploy
cd ..  # Return to google-cal directory
```

Note the outputs (save these for later):

- **DiscoveryUrl**: Use in step 5 (`agentcore configure`)
- **ClientId**: Use in step 5 and when getting tokens

### 2. Create Google OAuth Credentials

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
   - Click through the remaining steps
5. Add test users (required while app is in testing mode):
   - Go to **APIs & Services > OAuth consent screen**
   - Click on **Audience** (left sidebar)
   - Under **Test users**, click **+ Add Users**
   - Enter the Google email address(es) you'll use to authorize
   - Click **Save**

   > **Note:** Google OAuth apps start in "Testing" mode. Only users added here can authorize. You'll get a "403: access_denied" error if you try to authorize with an email not in the test users list.

6. Create credentials:
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Select "Web application"
   - Give it a name (e.g., "AgentCore Calendar")
   - Click **Create**
   - Note your **Client ID** and **Client Secret**
   - Leave redirect URIs empty for now (we'll add it in the next step)

### 3. Create AgentCore Credential Provider

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

### 4. Install Dependencies

From the `google-cal` directory (not `cdk`):

```bash
npm install
```

### 5. Configure the Agent

```bash
agentcore configure
```

When prompted:

- **Entrypoint**: `agent.ts`
- **Agent name**: e.g., `google-cal-agent`
- **Memory**: Enter `s` to skip
- **Authentication**: Select **JWT authentication**
  - **Discovery URL**: The `DiscoveryUrl` from step 1
  - **Audience** (if prompted): The `ClientId` from step 1

### 6. Deploy to Create Workload Identity

```bash
agentcore deploy
```

### 7. Update Workload Identity with Callback URL

After deployment, update the workload identity to allow your local callback URL.

First, find your workload identity name:

```bash
# Replace us-east-1 with your region!
aws bedrock-agentcore-control list-workload-identities --region us-east-1
```

Look for one starting with your agent name (e.g., `googlecalagent-I5Hnqn2z5x`).

Then update it with the callback URL:

```bash
# Replace us-east-1 with your region!
# Replace WORKLOAD_NAME with the name from the list above
aws bedrock-agentcore-control update-workload-identity \
  --region us-east-1 \
  --name "WORKLOAD_NAME" \
  --allowed-resource-oauth2-return-urls '["http://localhost:9090/oauth2/callback"]'
```

## Local Development

Run all commands from the `google-cal` directory.

The web app runs locally but calls the **deployed** AgentCore Runtime in AWS. This is required because the deployed runtime has the workload identity that injects the access token needed for 3LO OAuth.

### Terminal 1: Start Web App

```bash
npm run dev:webapp
```

You should see (note it detects the deployed runtime from `.bedrock_agentcore.yaml`):

```
[webapp] Web App with Session Management Started
[webapp] Listening on http://localhost:9090

[webapp] Frontend: http://localhost:9090
[webapp] API endpoint: POST http://localhost:9090/api/chat
[webapp] OAuth callback: http://localhost:9090/oauth2/callback

[webapp] Using DEPLOYED runtime:
[webapp]   Region: eu-west-1
[webapp]   ARN: arn:aws:bedrock-agentcore:eu-west-1:...
```

### Terminal 2: Tail Agent Logs (Optional)

To see what's happening in the deployed agent:

```bash
# Replace with your agent ID and region
aws logs tail /aws/vendedlogs/bedrock-agentcore/YOUR_AGENT_ID --follow --region YOUR_REGION
```

The agent ID is in `.bedrock_agentcore.yaml` under `bedrock_agentcore.agent_id`.

### Using the Web UI

Open http://localhost:9090 in your browser. The UI provides:

1. **Get Cognito Token**: Enter your Cognito Client ID and credentials to authenticate
2. **Chat with Agent**: Send messages to query your calendar

**First time flow:**

1. Get a Cognito token using the form (or paste one directly)
2. Send a message like "What events do I have on my calendar?"
3. An authorization URL will appear - click it to authorize Google Calendar access
4. Sign in with Google and grant access
5. Return to the web app and retry your message - calendar data will be returned

**Subsequent requests:**

- Token is cached in AgentCore Token Vault
- No authorization needed - agent accesses calendar immediately

## Session Binding Security

Without session binding, an attacker could:

1. Start an OAuth flow and get an authorization URL
2. Send the URL to a victim via email
3. Victim clicks and authorizes (thinking it's legit)
4. Attacker's agent now has victim's calendar access

With session binding:

1. The callback checks if the user who completed OAuth is the same user who started it
2. Uses the session cookie to verify identity
3. Attacker can't use victim's authorization

## Troubleshooting

### "No workloadAccessToken in context"

The deployed runtime isn't providing the workload access token. Ensure:

- You have deployed the agent with `agentcore deploy`
- The web app is using the deployed runtime (check startup logs)
- JWT authentication is configured (check `.bedrock_agentcore.yaml` for `authorizer_configuration`)

### "Using LOCAL runtime" in web app logs

The web app couldn't find `.bedrock_agentcore.yaml` or the agent ARN. This means you haven't deployed yet:

```bash
agentcore deploy
```

After deployment, restart the web app to pick up the new config.

### "Session Not Found" on callback

The user must authenticate via `/api/chat` before the OAuth callback can complete. This establishes the session that binds the user to the OAuth flow.

### "WorkloadIdentity not found"

The workload identity name includes a random suffix. List identities to find the exact name:

```bash
aws bedrock-agentcore-control list-workload-identities --region us-east-1
```

### "Polling timed out after 600 seconds"

The user didn't complete authorization within 10 minutes. Try again and complete the Google sign-in faster.

### Google OAuth errors

- **redirect_uri_mismatch**: The callback URL isn't registered in Google. Add the AgentCore callback URL to your Google OAuth app's redirect URIs.
- **access_denied**: User denied the permission request.

## Clean Up

From the `google-cal` directory:

```bash
# 1. Destroy AgentCore Runtime
agentcore destroy

# 2. Destroy Cognito stack
cd cdk
npx cdk destroy
cd ..

# 3. Delete credential provider (replace region!)
aws bedrock-agentcore-control delete-oauth2-credential-provider \
  --region us-east-1 \
  --name "google-cal-provider"
```
