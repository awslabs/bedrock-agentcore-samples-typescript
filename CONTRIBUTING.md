# Contributing Guidelines

Thank you for your interest in contributing to the Amazon Bedrock AgentCore TypeScript Samples! Whether it's a bug report, new example, correction, or additional documentation, we greatly value feedback and contributions from our community.

Please read through this document before submitting any issues or pull requests.

> **Note**: For AI agent-specific development patterns and guidelines, see [AGENTS.md](AGENTS.md).

## Development Environment

### Prerequisites

- **Node.js**: Version 22.0.0 or higher
- **npm**: Version 10.0.0 or higher
- **AWS CLI**: Configured with appropriate credentials
- **Access to Amazon Bedrock AgentCore**: Required for running examples

### Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone <repository-url>
   cd bedrock-agentcore-samples-typescript
   npm install
   ```

2. Verify your setup by running validation:

   ```bash
   npm run validate  # Runs formatting and linting checks
   ```

3. Configure AWS credentials:
   ```bash
   export AWS_REGION=us-east-1
   # Use AWS credential provider chain (environment variables, IAM roles, or AWS config)
   ```

## Testing Examples

Each example should be independently runnable. Samples hosted on AgentCore Runtime use the
[AgentCore CLI](https://github.com/aws/agentcore-cli):

```bash
npm install -g @aws/agentcore
cd primitives/runtime/hosting-agent/strands

agentcore dev                          # Run locally
npm install --prefix agentcore/cdk
agentcore deploy                       # Deploy to AgentCore Runtime
agentcore invoke --runtime agent --payload '{"prompt": "What is 25 * 4?"}'
agentcore remove all --yes && agentcore deploy --yes   # Clean up
```

CI type-checks every sample, but only running it shows that it works: run and deploy each sample you change.

## Reporting Bugs/Feature Requests

We welcome you to use the GitHub issue tracker to report bugs or suggest features.

When filing an issue, please check existing open, or recently closed, issues to make sure somebody else hasn't already reported the issue. Please try to include as much information as you can. Details like these are incredibly useful:

- A reproducible test case or series of steps
- The version of the SDK being used
- Node.js and npm versions
- AWS region and service configuration
- Any modifications you've made relevant to the bug
- Anything unusual about your environment or deployment

## Contributing via Pull Requests

Contributions via pull requests are much appreciated. Before sending us a pull request, please ensure that:

1. You are working against the latest source on the _main_ branch.
2. You check existing open, and recently merged, pull requests to make sure someone else hasn't addressed the problem already.
3. You open an issue to discuss any significant work - we would hate for your time to be wasted.

To send us a pull request, please:

1. Fork the repository.
2. Create a feature branch from `main`.
3. Make your changes following the guidelines in [AGENTS.md](AGENTS.md).
4. Run validation checks:
   ```bash
   npm run validate  # Format and lint checks
   ```
5. Ensure all examples are runnable and include proper documentation.
6. Update relevant README files at all levels of the hierarchy.
7. Commit to your fork using clear, conventional commit messages.
8. Send us a pull request, answering any default questions in the pull request interface.
9. Pay attention to any automated CI failures reported in the pull request, and stay involved in the conversation.

### Pull Request Requirements

- **Code quality**: ESLint passes with no errors
- **Documentation**: Clear README files for all examples
- **Formatting**: Prettier formatting applied consistently
- **Runnable examples**: All examples must work with documented setup steps
- **Conventional commits**: Use conventional commit message format (`feat:`, `fix:`, `docs:`, etc.)

GitHub provides additional documentation on [forking a repository](https://help.github.com/articles/fork-a-repo/) and
[creating a pull request](https://help.github.com/articles/creating-a-pull-request/).

## Adding New Examples

### Example Structure

Each example should be **self-sufficient**. A sample hosted on AgentCore Runtime is an AgentCore CLI project; create
one with `agentcore create --name YourExample` and `agentcore add runtime --name agent --language typescript`:

```
primitives/runtime/your-example/
├── app/agent/
│   ├── main.ts         # Entry point using BedrockAgentCoreApp
│   ├── package.json    # Dependencies
│   └── tsconfig.json   # TypeScript config
├── agentcore/
│   ├── agentcore.json  # Project configuration, written by the AgentCore CLI
│   └── cdk/            # CDK app the CLI deploys; add extra AWS resources in lib/cdk-stack.ts
└── README.md           # Documentation (required)
```

A sample that runs locally (such as the tools samples) keeps `src/index.ts`, `package.json` and `tsconfig.json` in
its folder.

### Code Style

- **Keep it simple** - samples should be easy to understand
- **Self-documenting code** - use clear variable and function names
- **Minimal comments** - only when the logic is non-obvious
- **Follow AGENTS.md** - adhere to all guidelines in [AGENTS.md](AGENTS.md)
- **Modern TypeScript** - use latest stable features (ES modules, async/await)
- **Explicit types** - leverage TypeScript's type system

### README Format

Each example README should follow this structure:

```markdown
# Example Title

One-line description of what this example demonstrates.

|                         |                        |
| ----------------------- | ---------------------- |
| **AgentCore component** | Runtime/Identity/Tools |
| **Framework**           | Strands/Vercel AI/etc  |

## What This Example Demonstrates

- Key feature 1
- Key feature 2
- Key feature 3

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock and AgentCore
- The AgentCore CLI: `npm install -g @aws/agentcore`

## Run Locally

\`\`\`bash
agentcore dev
\`\`\`

## Deploy

\`\`\`bash
npm install --prefix agentcore/cdk
agentcore deploy
\`\`\`

## Clean Up

\`\`\`bash
agentcore remove all --yes
agentcore deploy --yes
\`\`\`

## How It Works

Brief explanation of the implementation.
```

### Documentation Requirements

When adding or updating examples:

1. **Update parent READMEs** - Ensure all parent directories reference the new example
2. **Consistent terminology** - Use the same terms as other examples
3. **Complete setup instructions** - Include all prerequisites and steps
4. **Test from scratch** - Verify the example works in a clean environment

## Finding contributions to work on

Looking at the existing issues is a great way to find something to contribute on. As our projects, by default, use the default GitHub issue labels (enhancement/bug/duplicate/help wanted/invalid/question/wontfix), looking at any 'help wanted' issues is a great place to start.

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](https://aws.github.io/code-of-conduct).
For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq) or contact
opensource-codeofconduct@amazon.com with any additional questions or comments.

## Security issue notifications

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public GitHub issue.

## Licensing

See the [LICENSE](LICENSE) file for our project's licensing. We will ask you to confirm the licensing of your contribution.
