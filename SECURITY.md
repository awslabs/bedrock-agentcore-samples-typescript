# Security Policy

## Reporting a Vulnerability

If you discover a potential security issue in this project, we ask that you notify AWS Security via our [vulnerability reporting page](https://aws.amazon.com/security/vulnerability-reporting/) or directly via email to [aws-security@amazon.com](mailto:aws-security@amazon.com). Please do **not** create a public GitHub issue for security vulnerabilities.

When reporting, please include:

- Type of issue (e.g., credential exposure, injection vulnerability, etc.)
- Full paths of source file(s) related to the issue
- Location of affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

We will acknowledge your report within 48 hours and provide an initial assessment within 5 business days.

## Supported Versions

We release patches for security vulnerabilities for the latest version only.

| Version  | Supported          |
| -------- | ------------------ |
| Latest   | :white_check_mark: |
| < Latest | :x:                |

## Using These Samples Safely

The samples are written to be adapted, not deployed as-is. When you build on them:

- **Credentials**: never hardcode AWS credentials. The samples rely on the AWS credential provider chain: your local
  profile or SSO session during development, and the runtime's IAM role once deployed.
- **Least privilege**: the AgentCore CLI grants each runtime only what it needs. When you add resources in
  `agentcore/cdk/lib/cdk-stack.ts`, use the CDK `grant*` methods rather than broad managed policies.
- **Callers**: deployed runtimes require IAM (SigV4) or a JWT from your identity provider. The Cognito samples create
  user pools without self sign-up and with no default users.
- **Untrusted input**: prompts, uploaded files and web pages can carry instructions meant for the model. Keep Code
  Interpreter sessions in sandbox network mode unless they need the internet, and treat what a Browser session reads
  as untrusted.
- **Validation**: give every invocation handler a Zod `requestSchema`, and pass only prompt text to the agent.
- **Local apps**: a local web server that acts with your AWS credentials, like the browser live view sample's, should
  listen on `127.0.0.1` only and refuse requests from other origins.
- **Clean up**: delete the stacks you deploy (`agentcore remove all --yes && agentcore deploy --yes`) and stop Code
  Interpreter and Browser sessions when you are done with them.
- **Dependencies**: keep them current; Dependabot watches every sample in this repository.

## Additional Resources

- [AWS Security Best Practices](https://aws.amazon.com/security/security-resources/)
- [Amazon Bedrock Security](https://docs.aws.amazon.com/bedrock/latest/userguide/security.html)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/)
