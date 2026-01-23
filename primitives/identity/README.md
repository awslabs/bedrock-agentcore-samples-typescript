# AgentCore Identity

Amazon Bedrock AgentCore Identity provides secure credential management for AI agents.

## What is AgentCore Identity?

AgentCore Identity handles authentication in both directions:

- **Inbound auth** — Verifying who is calling your agent
- **Outbound auth** — Your agent securely accessing external services

```
                    ┌─────────────────────────────────┐
                    │       AgentCore Identity        │
                    │                                 │
   Inbound          │  ┌───────────────────────────┐  │          Outbound
   ─────────────────┼──│  Credential Management    │──┼─────────────────
   (verify caller)  │  │  - Token validation       │  │  (access external)
                    │  │  - OAuth flows            │  │
                    │  │  - API key management     │  │
                    │  └───────────────────────────┘  │
                    └─────────────────────────────────┘
```

## Samples

### [inbound-auth](./inbound-auth/)

Authenticate clients calling your agent.

### [outbound-auth](./outbound-auth/)

Your agent accessing external services on behalf of users.
