# Primitives

Building blocks for AI agents using Amazon Bedrock AgentCore.

## Structure

```
primitives/
├── runtime/                      # AgentCore Runtime samples
│   ├── hosting-agent/            # Deploy agents (Strands, Vercel AI)
│   ├── bidirectional-streaming/  # WebSocket communication
│   └── async-agent/              # Long-running tasks
├── identity/                     # AgentCore Identity samples
│   ├── inbound-auth/             # Authenticate callers
│   └── outbound-auth/            # Access external services
└── tools/                        # AgentCore Tools samples
    ├── code-interpreter/         # Execute code in secure sandbox
    └── browser/                  # Browser automation
```

See individual sample READMEs for details.
