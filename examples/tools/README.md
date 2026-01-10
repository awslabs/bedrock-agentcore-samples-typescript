# AgentCore Tools Examples

Amazon Bedrock AgentCore provides built-in tools to enhance agent capabilities. These examples demonstrate how to integrate AgentCore tools with popular AI frameworks.

## Available Examples

| Tool | Framework | Description |
|------|-----------|-------------|
| [Code Interpreter](./code-interpreter/strands/) | Strands SDK | Data analysis agent that executes Python code |
| [Code Interpreter](./code-interpreter/vercel-ai/) | Vercel AI SDK | Data analysis agent that executes Python code |
| [Browser](./browser/strands/) | Strands SDK | Grocery shopping agent with browser automation |
| [Browser](./browser/vercel-ai/) | Vercel AI SDK | Grocery shopping agent with browser automation |

## Code Interpreter

The Code Interpreter tool allows agents to execute code in a secure sandbox environment. Use it for:
- Data analysis and visualization
- File processing
- Mathematical calculations
- Running scripts

**Example prompt:**
```
Download the Titanic dataset and analyze survival rates by passenger class.
Create a visualization showing the results.
```

[Code Interpreter Examples →](./code-interpreter/)

## Browser Tool

The Browser tool enables agents to navigate websites and interact with web pages. Use it for:
- Web scraping and data extraction
- Form filling and automation
- E-commerce workflows
- Research and information gathering

**Example prompt:**
```
I want to make Swedish meatballs for 4 people.
Find the ingredients and add them to my willys.se cart.
```

[Browser Examples →](./browser/)

## Quick Start

Each example includes:
- `src/index.ts` - Agent implementation
- `Makefile` - Build and deployment commands
- `Dockerfile` - Container configuration
- `template.yaml` - CloudFormation for AgentCore deployment

```bash
# Run locally
cd code-interpreter/strands
npm install
make dev

# Test
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test" \
  -d '{"prompt": "Calculate the first 10 fibonacci numbers"}'
```
