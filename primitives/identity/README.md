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

| Sample                            | What it shows                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------- |
| [inbound-auth](./inbound-auth/)   | Control who can call your agent                                               |
| [outbound-auth](./outbound-auth/) | Let your agent call external services with credentials it never stores itself |
