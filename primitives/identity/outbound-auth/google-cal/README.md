# Outbound Authentication with Google Calendar (3LO)

An agent that reads a user's Google Calendar on their behalf, with the AgentCore Identity Token Vault keeping each
user's Google token.

→ See the [parent README](../README.md) for the outbound auth flows.

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock, AgentCore and Cognito
- The AWS CLI, configured for the region you deploy to
- OpenSSL, to generate the test user's password
- The [AgentCore CLI](https://github.com/aws/agentcore-cli):

```bash
npm install -g @aws/agentcore
```

- A Google OAuth client, set up in the [Google Cloud Console](https://console.cloud.google.com):
  1. Enable the **Google Calendar API** (**APIs & Services → Library**).
  2. Configure the **OAuth consent screen** as **External**, and under **Audience → Test users** add the Google accounts
     you'll sign in with. Apps in testing mode reject everyone else with `403: access_denied`.
  3. Create an **OAuth client ID** of type **Web application** (**APIs & Services → Credentials**). Leave the redirect
     URIs empty for now and note the client ID and secret.

## Project Structure

```
google-cal/
├── app/agent/                # The agent: main.ts, package.json
├── agentcore/
│   ├── agentcore.json        # Runtime (and, once added, credential) configuration
│   └── cdk/lib/cdk-stack.ts  # Adds the Cognito user pool and the runtime's JWT authorizer
└── web-app/                  # Local web app: server.ts, public/
```

## The Agent

`withAccessToken` fetches the user's Google token from the Token Vault and passes it to `listUpcomingEvents`. Until the
user has consented it calls `onAuthUrl` and keeps waiting, so the tool yields the URL as a stream event:

```typescript
callback: async function* ({ maxResults }): AsyncGenerator<{ authUrl: string }, CalendarEvent[], never> {
  let resolveAuthUrl: (url: string) => void = () => {}
  const authUrl = new Promise<string>((resolve) => {
    resolveAuthUrl = resolve
  })

  const events = withAccessToken({
    providerName,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    authFlow: 'USER_FEDERATION',
    callbackUrl,
    customParameters: { access_type: 'offline', prompt: 'consent' },
    onAuthUrl: resolveAuthUrl,
  })(listUpcomingEvents)(maxResults)

  const first = await Promise.race([events, authUrl])
  if (typeof first === 'string') {
    yield { authUrl: first }
  }
  return await events
},
```

The handler forwards it as an `auth_url` event next to the text:

```typescript
for await (const event of getAgent(context.sessionId).stream(request.prompt)) {
  if (event.type === 'toolStreamUpdateEvent') {
    yield { event: 'auth_url', data: event.event.data }
  }
  // ...yield text deltas as message events
}
```

→ [Full source](./app/agent/main.ts)

## How It Works

```
Browser ── Cognito token ──▶ web app ── JWT ──▶ AgentCore Runtime (JWT authorizer) ──▶ agent
   ▲                           │                                                       │
   │                           │ CompleteResourceTokenAuth            withAccessToken  │
   └──── Google consent ───────┴──────────────▶ AgentCore Identity ◀───────────────────┘
```

1. The user signs in with Cognito and chats through the local web app, which calls the runtime with their JWT.
2. The agent's `getCalendar` tool asks AgentCore Identity for that user's Google token. The first time there is none,
   so Identity returns an authorization URL, which the agent streams to the web app.
3. The user consents at Google. Google redirects to AgentCore, which redirects to the web app's `callback.html`.
4. The callback page opens in a new tab, so the web app keeps the user's JWT in `localStorage`, where that tab can
   read it. The page sends the `session_id` and the JWT to the web app, which calls `CompleteResourceTokenAuth`:

   ```typescript
   await identityClient.send(new CompleteResourceTokenAuthCommand({ sessionUri, userIdentifier: { userToken } }))
   ```

   AgentCore Identity completes the flow only if the JWT belongs to the user the authorization URL was issued for, so
   a URL sent to someone else can't link their Google account to the sender's agent. The tool, still waiting, receives
   the token and reads the calendar. Later calls get the stored token right away.

→ [Full source](./web-app/server.ts)

## Run Locally

`withAccessToken` needs a workload access token, which AgentCore issues only to the deployed runtime for a signed-in
user. Locally (`agentcore dev`) the agent answers with an error event, so deploy to try it.

## Deploy

Add the Google OAuth client as an AgentCore Identity credential provider. The CLI keeps the client ID in
`agentcore.json` and the secret, read from stdin, in `agentcore/.env.local`:

```bash
read -rsp 'Google client secret: ' GOOGLE_CLIENT_SECRET
printf '%s' "$GOOGLE_CLIENT_SECRET" | agentcore add credentials oauth --name google-cal --vendor GoogleOauth2 \
  --provider-configuration '{"googleOauth2ProviderConfig": {"clientId": "<your-client-id>.apps.googleusercontent.com"}}' \
  --client-secret -
```

Deploy the runtime, the Cognito user pool and the credential provider:

```bash
npm install --prefix app/agent
npm install --prefix agentcore/cdk
agentcore deploy
```

The deploy grants the runtime access to the provider and sets `CREDENTIAL_GOOGLE_CAL_NAME`, which the agent reads.

Add AgentCore's callback URL to your Google OAuth client's **Authorized redirect URIs**:

```bash
aws bedrock-agentcore-control get-oauth2-credential-provider --name OutboundAuthGoogleCal_default_google-cal \
  --query callbackUrl --output text
```

Allow the web app's callback on the runtime's workload identity, and create a Cognito user with a random password:

```bash
STACK=AgentCore-OutboundAuthGoogleCal-default
output() { aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
aws bedrock-agentcore-control update-workload-identity --name "$(output WorkloadIdentityName)" \
  --allowed-resource-oauth2-return-urls http://localhost:9090/callback.html
POOL_ID=$(output UserPoolId) CLIENT_ID=$(output ClientId)
PASSWORD="$(openssl rand -base64 24)Aa1!"
aws cognito-idp admin-create-user --user-pool-id $POOL_ID --username testuser --message-action SUPPRESS > /dev/null
aws cognito-idp admin-set-user-password --user-pool-id $POOL_ID --username testuser --password "$PASSWORD" --permanent
echo "$PASSWORD"
```

To try the runtime without the web app, get a token and invoke it. The stream starts with the `auth_url` event:

```bash
TOKEN=$(aws cognito-idp initiate-auth --client-id $CLIENT_ID --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters "USERNAME=testuser,PASSWORD=$PASSWORD" --query AuthenticationResult.AccessToken --output text)
agentcore invoke --runtime agent --bearer-token "$TOKEN" --payload '{"prompt": "What is on my calendar?"}'
```

Last, run the web app. It runs on your machine and calls the deployed runtime. In the same terminal, pass it the
stack's outputs:

```bash
export RUNTIME_URL=$(output RuntimeUrl) CLIENT_ID=$(output ClientId)
npm install --prefix web-app
npm run dev --prefix web-app
```

Open http://localhost:9090, enter the password and click **Get Token**, then ask "What's on my calendar?". The first
time, an authorization link appears: sign in with a Google test user, and the answer arrives once you've consented.
After that the agent reads the calendar straight away.

Keep the web app on port 9090: the agent's `callbackUrl` and the workload identity's allowed return URL both use it.

## Clean Up

The OAuth client stays in the Google Cloud Console; delete it there if you no longer need it. To delete the rest:

```bash
agentcore remove all --yes
agentcore deploy --yes
```

This deletes the deployed stack. Run `git checkout -- agentcore` to restore the configuration and deploy again.
