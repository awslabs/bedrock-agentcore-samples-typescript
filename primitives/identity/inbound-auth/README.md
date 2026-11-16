# Inbound Authentication

Control who can call your agent.

By default an AgentCore Runtime accepts AWS IAM (SigV4) requests. With a `CUSTOM_JWT` authorizer it accepts OAuth access
tokens from your identity provider instead. AgentCore checks each token's signature, issuer and client against the
provider's OIDC discovery URL, and rejects the request before it reaches your code.

## Samples

| Sample                | What it shows                                                             |
| --------------------- | ------------------------------------------------------------------------- |
| [cognito](./cognito/) | An agent that only accepts access tokens from an Amazon Cognito user pool |
