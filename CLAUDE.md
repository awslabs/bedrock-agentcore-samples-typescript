- This is an examples repo for the AWS Bedrock AgentCore Typescript SDK.
- All code and content in this repo tries to illustrate how the AgentCore Typescript SDK can be used to simplify Agent development, using any Typescript agent framework, inclduing Strands agent SDK, Vercel AI SDK, Mastra AI SDK, OpenAI Agents SDK and so on.
- Code should be self-documenting, and comments should only be ued when necessary.
- Comments should NEVER refer to previous implementations
- Always consider READMEs at all levels of the repo hierarchy (e.g., `primitives/`, `primitives/tools/`, `primitives/tools/code-interpreter/`, `primitives/tools/code-interpreter/strands/`). When making updates, ensure consistency across parent and child READMEs.
- Simplicity and readibility is key, especially for the code!
- The READMEs are world-class readmes that targets a modern Typescript developer, familiar with the typescript domain and ecosystem.
- When updating the READMEs, always think about the best-in-class READMEs in the world, and consider that we also want the READMEs in this project to be super high-class.

## Default model

Always use Amazon Bedrock with model ID `global.amazon.nova-2-lite-v1:0` unless there's a specific reason to use another model.

## Framework-specific patterns

### Vercel AI SDK

- Always use `ToolLoopAgent` for agentic workflows with tools (not `generateText` with `maxSteps`)
- Use `instructions` property for system prompts (not `system`)
- Required packages: `@ai-sdk/amazon-bedrock@^4.0.0`, `ai@^6.0.0`, `zod@^4.0.0`
