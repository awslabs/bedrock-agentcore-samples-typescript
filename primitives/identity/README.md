# AgentCore Identity

Amazon Bedrock AgentCore Identity handles authentication in both directions:

- **Inbound**: who may call your agent. AgentCore Runtime checks each caller's token before your code runs.
- **Outbound**: how your agent calls other services. AgentCore keeps the OAuth tokens and API keys, and the SDK passes
  them to your code.

```
caller ── token ──▶ AgentCore Runtime ──▶ your agent ── token from the Token Vault ──▶ external service
          inbound                                       outbound
```

## Samples

| Folder                            | Sample                                    | What it shows                                |
| --------------------------------- | ----------------------------------------- | -------------------------------------------- |
| [inbound-auth](./inbound-auth/)   | [cognito](./inbound-auth/cognito/)        | An agent only Cognito users can call         |
| [outbound-auth](./outbound-auth/) | [google-cal](./outbound-auth/google-cal/) | An agent that reads a user's Google Calendar |
