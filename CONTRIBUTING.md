# Contributing

Thanks for your interest in contributing!

## Reporting Issues

Use [GitHub Issues](../../issues) to report bugs or suggest features. Check existing issues first to avoid duplicates.

## Pull Requests

1. Fork the repo and branch from `main`
2. Make your changes
3. Run `npm run validate` from root (format + lint)
4. Submit a PR

## Adding Examples

Each example should be **self-sufficient**:

```
primitives/runtime/your-example/
├── src/index.ts        # Entry point using BedrockAgentCoreApp
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
├── Dockerfile          # Container build
├── docker-compose.yaml # Local development
├── Makefile            # Build, deploy, delete commands
├── template.yaml       # CloudFormation template
└── README.md           # Documentation
```

### Code Style

- Keep it simple - samples should be easy to understand
- Use single quotes, no semicolons (Prettier handles this)
- Minimal comments - code should be self-explanatory

### README Format

```markdown
# Example Title

One-line description.

|                         |         |
| ----------------------- | ------- |
| **AgentCore component** | Runtime |

## Quick Start

\`\`\`bash
npm install
make dev
\`\`\`
```

## Code of Conduct

See [Code of Conduct](https://aws.github.io/code-of-conduct).

## Security

Report security issues via [AWS vulnerability reporting](http://aws.amazon.com/security/vulnerability-reporting/). Do not create public issues.

## License

See [LICENSE](LICENSE). By contributing, you agree to license your contribution under the same terms.
