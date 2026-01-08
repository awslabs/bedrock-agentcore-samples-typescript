# Examples

This directory contains examples demonstrating Amazon Bedrock AgentCore capabilities.

## Structure

```
examples/
├── runtime/                    # AgentCore Runtime samples
│   ├── hosting-agent/          # Deploy agents (Strands, Vercel AI)
│   ├── bidirectional-streaming/  # WebSocket communication
│   └── async-agent/            # Long-running tasks
├── identity/                   # AgentCore Identity samples
│   ├── inbound-auth/           # Authenticate callers
│   └── outbound-auth/          # Access external services
├── tools/                      # AgentCore Tools samples
│   └── (coming soon)
└── end-to-end/                 # Complete deployment examples
    ├── cloudformation/
    ├── cdk/
    └── terraform/
```

## Self-Sufficient Samples

Each sample is self-contained with:

- `src/` — TypeScript source code
- `package.json` — Dependencies
- `Dockerfile` — Container build
- `docker-compose.yaml` — Local development
- `Makefile` — Build, deploy, delete commands
- `template.yaml` — CloudFormation template
- `README.md` — Documentation

## Quick Start

```bash
cd runtime/hosting-agent/strands
make dev
```

See individual sample READMEs for details.
