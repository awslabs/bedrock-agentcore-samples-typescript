# Inbound Authentication

Authenticate clients that call your agent.

By default an AgentCore Runtime accepts AWS IAM (SigV4) requests. With a `CUSTOM_JWT` authorizer it accepts OAuth access
tokens from your identity provider instead: AgentCore checks each token's signature, issuer and client (or audience,
scopes and claims) against the provider's OIDC discovery URL and rejects the request before it reaches your code.

| Sample                | Identity provider | Description                                                              |
| --------------------- | ----------------- | ------------------------------------------------------------------------ |
| [cognito](./cognito/) | Amazon Cognito    | One `agentcore deploy` creates the user pool and the JWT-protected agent |
