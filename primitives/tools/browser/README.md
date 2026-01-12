# Browser

Build AI agents that browse the web using AgentCore's Browser tool.

## Capabilities

| Tool         | Description                          |
| ------------ | ------------------------------------ |
| `navigate`   | Go to a URL                          |
| `click`      | Click an element by selector or text |
| `type`       | Enter text into an input field       |
| `getText`    | Read text content from the page      |
| `screenshot` | Capture the current page             |

**Session persistence:** Browser state (cookies, login, cart) persists within a session. Sessions timeout after inactivity.

**Note:** These samples use [Playwright](https://playwright.dev/) as the client library to communicate with the remote AWS browser via CDP (Chrome DevTools Protocol).

## Quick Start

```bash
cd strands  # or vercel-ai
npm install
npm start                    # HTTP server on :8080
npm run start:interactive    # Interactive shell
```

## Example

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Go to amazon.com and search for Echo Show devices. Open the product page of one, and save a screenshot."}'
```

## Notes

- Sessions timeout after inactivity
- Real sites may have anti-bot measures; results may vary
