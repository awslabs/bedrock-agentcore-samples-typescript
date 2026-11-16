# Amazon Bedrock AgentCore TypeScript Samples - Guidelines for AI Assistants

## Project Overview

This is the samples repository for the **Amazon Bedrock AgentCore TypeScript SDK** (`bedrock-agentcore`). Its goal is to
show how the SDK simplifies building and running AI agents, with the TypeScript agent frameworks it integrates with:

- Strands Agents SDK
- Vercel AI SDK

### Capabilities Covered

- **Hosting an agent** — Deploy an agent to AgentCore Runtime and stream its responses
- **Bidirectional streaming** — WebSocket-based two-way communication
- **Async long-running agents** — Keep a session alive while background work runs
- **Inbound authentication** — Accept only callers with a valid JWT
- **Outbound authentication** — Let an agent call external services with OAuth (3LO)
- **Code Interpreter** — Run code in a secure sandbox
- **Browser** — Drive a cloud browser session
- **Use cases** — Complete applications that combine these

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
- **Explicit return types** — give named and exported functions explicit return types; inline callbacks typed by their
  context (handlers, `tool` callbacks, routes) don't need one

## SDK Dependency

All samples in this repository depend on `bedrock-agentcore` (the public npm package).

When making changes to samples, ensure compatibility with the current SDK version.

## Default Configurations

### AWS Region

Default to `us-east-1` with environment variable override: `process.env['AWS_REGION'] ?? 'us-east-1'`

### Model Selection

Use Claude Haiku 5.5 through its global inference profile, `global.anthropic.claude-haiku-5-5`, unless a sample needs a
different model for its use case.

## Framework-Specific Patterns

### Strands Agents SDK

- Use `Agent` class for agent orchestration
- Use `tool()` function for defining tools with Zod schemas
- Use `agent.stream()` for streaming responses
- Handle events via async iteration: text arrives as a `modelContentBlockDeltaEvent` with a `textDelta`, wrapped in a
  `modelStreamUpdateEvent`
- Pass agents in another agent's `tools` for agents-as-tools (multi-agent) patterns

```typescript
const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.anthropic.claude-haiku-5-5',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  tools: [myTool],
})

for await (const event of agent.stream(prompt)) {
  if (
    event.type === 'modelStreamUpdateEvent' &&
    event.event.type === 'modelContentBlockDeltaEvent' &&
    event.event.delta.type === 'textDelta'
  ) {
    yield { event: 'message', data: { text: event.event.delta.text } }
  }
}
```

### Vercel AI SDK

- **Always use `ToolLoopAgent`** for agentic workflows with tools (not `generateText` with `maxSteps`)
- Use `instructions` property for system prompts (not `system`)
- Pass `credentialProvider: fromNodeProviderChain()` to `createAmazonBedrock`; without it the provider reads only
  credentials from environment variables, which fails with the runtime's IAM role and with SSO profiles
- Required packages: `@ai-sdk/amazon-bedrock@^5.0.0`, `@aws-sdk/credential-providers@^3.0.0`, `ai@^7.0.0`, `zod@^4.0.0`

### Other Frameworks

- Ensure examples are idiomatic to each framework
- Document any framework-specific quirks or best practices in comments only when necessary

## Repository Structure

The repository is organized into two main categories:

### Primitives

Focused examples demonstrating individual AgentCore capabilities:

- **`primitives/runtime/`** — Core runtime features
  - Hosting agents with Strands and Vercel AI SDK
  - Bidirectional streaming (WebSocket)
  - Async long-running agents
- **`primitives/identity/`** — Authentication and authorization
  - Inbound authentication (authenticating requests to your agent)
  - Outbound authentication (agent accessing external services)
- **`primitives/tools/`** — Built-in tools
  - Code Interpreter and Browser, with Strands and Vercel AI SDK

Each primitive example is self-contained and demonstrates a single concept clearly.

### Use Cases

Complete, end-to-end applications that combine several primitives, such as a multi-agent customer support agent and a
data analyzer with a web app. Use cases may have more dependencies than primitives, but the same bar for simplicity.

The full tree is in [README.md](README.md#repository-structure).

## File Naming and Organization

- Use kebab-case for directory names (e.g., `code-interpreter`, `customer-support-agent`)
- Use kebab-case for multi-word file names
- Every primitive, and every use case hosted on AgentCore Runtime, is an [AgentCore CLI](https://github.com/aws/agentcore-cli)
  project, laid out as `agentcore create` and `agentcore add runtime --language typescript` generate it:
  - `app/agent/main.ts` — the entry point (the CLI requires this name), with its own `package.json` and `tsconfig.json`
  - `agentcore/agentcore.json` — the project configuration; let the CLI write it
  - `agentcore/cdk/` — the CDK app the CLI deploys; add a sample's extra AWS resources in `lib/cdk-stack.ts`, and leave
    the other generated files as the CLI writes them
- A use case that runs locally (the browser live view) keeps a `server/` and `src/` layout
- Keep examples focused and in separate directories

## Dependencies

- Minimize external dependencies — only include what's necessary for the example
- Keep each sample self-contained with its own `package.json`, so it can be copied out of the repository
- Pin major versions for stability
- Node.js 22+ is the minimum required version

## Security and Best Practices

- Never hardcode credentials — use environment variables or AWS SDK credential chain
- Handle the errors a reader would hit, without hiding the concept the sample shows
- Use secure defaults (e.g., string input validation with Zod schemas)
- Follow AWS security best practices

## Testing and Validation

- All examples must be runnable
- Use `npm run validate` to check formatting and linting before committing
- CI type-checks every sample against the latest versions its `package.json` allows
- Run a runtime sample with `agentcore dev`, and deploy it with `agentcore deploy` before changing its README
- Examples should work with minimal setup (documented in each README)

## Common Patterns to Follow

### BedrockAgentCoreApp Wrapper

All runtime examples should use the `BedrockAgentCoreApp` wrapper:

```typescript
const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema: z.object({ prompt: z.string() }),
    process: async function* (request) {
      // Agent logic here
    },
  },
})

app.run({ port: parseInt(process.env['PORT'] ?? '8080') })
```

### Agent Lifetime

Deployed, each runtime session runs in its own microVM, so an agent created at module level serves a single session.
Keep one agent per `context.sessionId` (a `Map`) only where a multi-turn conversation is the point of the sample.

### Built-in Tools

Code Interpreter and Browser tools share one session per tool instance, so run their calls one at a time:
`toolExecutor: 'sequential'` (Strands) or `toolCallConcurrency: 1` (Vercel AI SDK).

### Tool Definitions

Use Zod for input schemas, camelCase tool names, and clear descriptions:

```typescript
const myTool = tool({
  name: 'toolName',
  description: 'Clear, concise description of what this tool does',
  inputSchema: z.object({
    param: z.string().describe('What this parameter does'),
  }),
  callback: async ({ param }): Promise<string> => {
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
3. Write its README in the shared format from [CONTRIBUTING.md](CONTRIBUTING.md#readme-format)
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
