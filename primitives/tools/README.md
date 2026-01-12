# AgentCore Tools

Amazon Bedrock AgentCore provides built-in tools to extend agent capabilities.

## Code Interpreter

The Code Interpreter tool allows agents to execute code in a secure sandbox environment. Use it for:

- Data analysis and visualization
- File processing
- Mathematical calculations
- Running scripts

**Features:**

- Session persistence — variables and files remain available across invocations
- Artifact retrieval — generated files (charts, reports) are automatically saved locally
- Pre-installed libraries — pandas, numpy, matplotlib, seaborn, scipy, scikit-learn

**Example prompt:**

```
Create a bar chart of fibonacci numbers 1-10 and save it
```

[Code Interpreter Examples →](./code-interpreter/)

## Browser Tool

The Browser tool enables agents to navigate websites and interact with web pages. Use it for:

- Web scraping and data extraction
- Form filling and automation
- E-commerce workflows
- Research and information gathering

**Features:**

- Live View URL — watch the browser in real-time and take control for human handoff
- Session persistence — browser state maintained across invocations

**Example prompt:**

```
Add milk, eggs, and butter to my willys.se cart
```

[Browser Examples →](./browser/)

## Quick Start

Each example includes two run modes:

```bash
cd code-interpreter/strands
npm install

# Server mode - HTTP server on :8080
npm start

# Interactive mode - Readline REPL for multi-turn conversations
npm run start:interactive
```

**Server mode test:**

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test" \
  -d '{"prompt": "Calculate the first 10 fibonacci numbers"}'
```

## How It Works

These samples use `BedrockAgentCoreApp` which creates an HTTP server following the AgentCore Runtime protocol. The same code runs locally for development and deploys to AWS without changes.

For full deployment setup with Docker and CloudFormation, see [runtime examples](../runtime/).

## Network Access (Code Interpreter)

By default, Code Interpreter sandboxes have no network access. To enable it:

```typescript
const codeInterpreter = new CodeInterpreterTools({
  region: 'us-east-1',
  networkConfiguration: {
    enableInternetAccess: true,
  },
})
```
