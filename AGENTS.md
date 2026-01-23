# Amazon Bedrock AgentCore TypeScript Samples - Guidelines for AI Assistants

## Project Overview

This is an examples and samples repository for the **Amazon Bedrock AgentCore TypeScript SDK**. The primary goal is to demonstrate how the AgentCore SDK simplifies AI agent development across various TypeScript agent frameworks, including:

- Strands Agents SDK
- Vercel AI SDK
- Mastra AI SDK
- OpenAI Agents SDK
- Other TypeScript agent frameworks

### Key Use Cases Covered

This repository demonstrates the following AgentCore capabilities:

- **Hosting an agent** — Deploy agents using the AgentCore Runtime
- **Streaming responses** — Real-time response streaming from agents
- **Bidirectional streaming** — WebSocket-based two-way communication
- **Async long-running agents** — Handle long-running tasks asynchronously
- **Framework integrations** — Strands and Vercel AI SDK integration examples
- **Inbound authentication** — Authenticate and authorize incoming requests to agents
- **Outbound authentication** — Securely access external services from agents

## Core Principles

### 1. Code Quality and Readability

- **Self-documenting code is paramount** — variable names, function names, and structure should clearly convey intent
- **Minimal comments** — only add comments when the code logic is genuinely non-obvious or requires domain-specific explanation
- **Comments must NEVER refer to previous implementations** — no "changed from X to Y" or "used to be Z"
- **Simplicity over cleverness** — favor straightforward implementations that are easy to understand and maintain
- **No over-engineering** — stick to the minimal solution that demonstrates the concept

### 2. Documentation Standards

- **World-class READMEs** — target modern TypeScript developers familiar with the ecosystem
- **Hierarchical consistency** — always consider READMEs at all levels (e.g., `primitives/`, `primitives/tools/`, `primitives/tools/code-interpreter/`, `primitives/tools/code-interpreter/strands/`)
- **Keep parent and child READMEs consistent** — when updating examples, ensure parent README reflects any structural or conceptual changes
- **Show, don't tell** — use code examples liberally to demonstrate concepts
- **Progressive disclosure** — start with the simplest example, then build complexity

### 3. Code Style Conventions

- **Modern TypeScript** — use latest stable TypeScript features (ES modules, async/await, async generators)
- **Explicit types** — leverage TypeScript's type system, especially Zod schemas for validation
- **Functional patterns** — prefer functional programming patterns where appropriate
- **Error handling** — use proper async error handling with try/catch in examples where it adds clarity
- **No unused variables** — keep code clean; if a parameter is unused, prefix with `_` (e.g., `_context`)
- **Async/await always** — never use raw Promises (.then/.catch chains); always use async/await
- **Explicit return types** — always provide explicit return types for functions

## SDK Dependency

All samples in this repository depend on `bedrock-agentcore` (the public npm package).

When making changes to samples, ensure compatibility with the current SDK version.

## Default Configurations

### AWS Region

Default to `us-east-1` with environment variable override: `process.env['AWS_REGION'] ?? 'us-east-1'`

### Model Selection

Examples can use any appropriate Bedrock model. Choose models based on the specific use case requirements (latency, cost, capabilities, etc.).

## Framework-Specific Patterns

### Strands Agents SDK

- Use `Agent` class for agent orchestration
- Use `tool()` function for defining tools with Zod schemas
- Use `agent.stream()` for streaming responses
- Handle events via async iteration and filter for `modelContentBlockDeltaEvent` with `textDelta`

```typescript
const agent = new Agent({
  model: new BedrockModel({ modelId: 'global.amazon.nova-2-lite-v1:0', region: 'us-east-1' }),
  tools: [myTool],
})

for await (const event of agent.stream(prompt)) {
  if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
    yield { event: 'message', data: { text: event.delta.text } }
  }
}
```

### Vercel AI SDK

- **Always use `ToolLoopAgent`** for agentic workflows with tools (not `generateText` with `maxSteps`)
- Use `instructions` property for system prompts (not `system`)
- Required packages: `@ai-sdk/amazon-bedrock@^4.0.0`, `ai@^6.0.0`, `zod@^4.0.0`

### Other Frameworks

- Ensure examples are idiomatic to each framework
- Document any framework-specific quirks or best practices in comments only when necessary

## Repository Structure

The repository is organized into two main categories:

### Primitives

Focused examples demonstrating individual AgentCore capabilities:

- **`primitives/runtime/`** — Core runtime features
  - Hosting agents with Strands and Vercel AI SDK
  - Streaming responses
  - Bidirectional streaming (WebSocket)
  - Async long-running agents
- **`primitives/identity/`** — Authentication and authorization
  - Inbound authentication (authenticating requests to your agent)
  - Outbound authentication (agent accessing external services)

Each primitive example is self-contained and demonstrates a single concept clearly.

### Use Cases

Complete, end-to-end examples that combine multiple primitives into production-ready applications. These demonstrate how to build real-world agents by composing runtime, identity, and tool capabilities together.

Examples include customer support agents, data analyzers, and other practical applications.

```
├── primitives/
│   ├── runtime/          # Runtime primitives (hosting, streaming, async)
│   └── identity/         # Auth primitives (inbound, outbound)
├── use-cases/           # End-to-end examples combining primitives
└── .github/             # GitHub-specific configuration
```

## File Naming and Organization

- Use kebab-case for directory names (e.g., `code-interpreter`, `customer-support-agent`)
- Use kebab-case for multi-word file names
- Main entry point should be `src/index.ts` or `index.ts` (when using AgentCore Starter Toolkit, use flat structure with `agent.ts`)
- Keep examples focused and in separate directories

## Dependencies

- Minimize external dependencies — only include what's necessary for the example
- Use workspace/monorepo structure to avoid duplicate dependencies
- Pin major versions for stability
- Node.js 20+ is the minimum required version

## Security and Best Practices

- Never hardcode credentials — use environment variables or AWS SDK credential chain
- Demonstrate proper error handling in production-ready examples
- Use secure defaults (e.g., input validation with Zod schemas)
- Follow AWS security best practices

## Testing and Validation

- All examples must be runnable
- Use `npm run validate` to check formatting and linting before committing
- Examples should work with minimal setup (documented in each README)
- Testing requirements: **To be defined**

## Common Patterns to Follow

### BedrockAgentCoreApp Wrapper

All runtime examples should use the `BedrockAgentCoreApp` wrapper:

```typescript
const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request, context) {
      // Agent logic here
    },
  },
})

app.run()
```

### Tool Definitions

Use Zod for input schemas and provide clear descriptions:

```typescript
const myTool = tool({
  name: 'toolName',
  description: 'Clear, concise description of what this tool does',
  inputSchema: z.object({
    param: z.string().describe('What this parameter does'),
  }),
  callback: async (input) => {
    // Implementation
  },
})
```

## What to Avoid

- Overly complex examples that obscure the core concept
- Unnecessary abstractions or helper functions
- Comments explaining obvious code
- Generic variable names like `data`, `result`, `temp`
- Nested ternary operators or overly clever one-liners
- Examples that require extensive setup or configuration
- Hardcoded values that should be environment-specific

## When Adding New Examples

1. Check if a similar example already exists
2. Place in the appropriate directory (primitives vs use-cases)
3. Create a comprehensive README with:
   - Clear title and description
   - Prerequisites section
   - Step-by-step setup instructions
   - Code explanation (if needed)
   - How to run the example
4. Ensure parent READMEs reference the new example
5. Test the example from scratch in a clean environment
6. Run validation: `npm run validate`

## AI Assistant Behavior

When working on this codebase:

- **Read before modifying** — always read existing files to understand patterns
- **Maintain consistency** — follow existing patterns in similar examples
- **Ask clarifying questions** — if requirements are ambiguous, ask before implementing
- **Test your changes** — ensure examples are runnable
- **Update documentation** — keep READMEs in sync with code changes
- **Focus on clarity** — these are educational examples, not production applications
