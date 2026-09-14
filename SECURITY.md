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

## Security Best Practices

When using these examples, please follow these security best practices:

### AWS Credentials

**❌ NEVER hardcode AWS credentials:**

```typescript
// BAD - Never do this
const codeInterpreter = new CodeInterpreterTools({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  },
})
```

**✅ Use AWS credential provider chain:**

```typescript
// GOOD - Let AWS SDK handle credentials
const codeInterpreter = new CodeInterpreterTools({
  region: 'us-east-1',
  // Credentials loaded from environment, IAM role, or AWS config
})
```

**General best practices:**

- Never commit AWS credentials to source control
- Use IAM roles with least-privilege permissions
- Rotate credentials regularly
- Use environment variables or AWS credential providers

### Code Execution

**Example with proper session cleanup:**

```typescript
const codeInterpreter = new CodeInterpreterTools()

try {
  await codeInterpreter.startSession()

  const result = await codeInterpreter.executeCode({
    code: 'print("Hello, secure world!")',
    language: 'python',
  })

  console.log(result)
} finally {
  // Always cleanup, even on error
  await codeInterpreter.stopSession()
}
```

**Best practices:**

- The Code Interpreter runs in isolated environments, but review any code before execution
- Be cautious when executing code from untrusted sources
- Monitor AWS CloudWatch for unusual activity
- Validate user inputs before passing to agent prompts
- Set execution timeouts to prevent resource exhaustion

### Browser Automation

**Example with URL validation:**

```typescript
const browser = new BrowserTools()

// Validate URLs before navigation
function isAllowedDomain(url: string): boolean {
  const allowed = ['example.com', 'trusted-site.com']
  try {
    const hostname = new URL(url).hostname
    return allowed.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
  } catch {
    return false // Invalid URL
  }
}

// Only navigate to validated URLs
if (isAllowedDomain(userUrl)) {
  await browser.navigate({ url: userUrl })
} else {
  throw new Error('Domain not allowed')
}
```

**Best practices:**

- Be mindful of the websites you automate against
- Respect robots.txt and terms of service
- Avoid storing sensitive data extracted from web pages
- Implement rate limiting to avoid overwhelming target sites

### Dependencies

**Regular security checks:**

```bash
# Check for known vulnerabilities
npm audit

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

**Best practices:**

- Keep dependencies up to date
- Review security advisories for dependencies
- Use `npm audit` to check for known vulnerabilities

## Built-in Security Features

- **AWS SDK Integration**: Leverages AWS SDK's credential provider chain and request signing
- **Input Validation**: Zod schemas validate tool inputs and keep runtime prompts typed as strings
- **Session Isolation**: Each CodeInterpreter/Browser session is isolated in AWS infrastructure
- **HTTPS Only**: All communication with AWS services uses HTTPS
- **No Credential Storage**: SDK never persists credentials to disk
- **AWS Signature Version 4**: All requests are signed with AWS SigV4 authentication
- **TLS 1.2+**: Secure communication enforced

## Security Tools & Scanning

**Recommended tools for your projects using these examples:**

```bash
# Dependency vulnerability scanning
npm audit

# Check for outdated/vulnerable packages
npm outdated

# Fix vulnerabilities automatically
npm audit fix
```

**GitHub Security Features:**

- Enable Dependabot alerts in your repository
- Use CodeQL for automated security scanning
- Configure secret scanning to prevent credential commits

## Compliance & Standards

These examples follow:

- [AWS Well-Architected Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) guidelines
- AWS SDK security best practices
- [AWS Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/)

## Security Updates

Security patches are released as soon as possible after discovery. Subscribe to this repository's releases to stay informed about security updates.

## Additional Resources

- [AWS Security Best Practices](https://aws.amazon.com/security/security-resources/)
- [Amazon Bedrock Security](https://docs.aws.amazon.com/bedrock/latest/userguide/security.html)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/)
