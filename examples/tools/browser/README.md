# Browser Automation Examples

These examples demonstrate how to build AI agents that can browse the web using AgentCore's Browser tool.

## Use Case: Grocery Shopping Agent

The agent can:
- Navigate to willys.se (Swedish grocery store)
- Search for ingredients
- Add items to shopping cart
- Provide Live View URL for user to complete checkout

## Available Implementations

| Framework | Directory | Description |
|-----------|-----------|-------------|
| Strands SDK | [strands/](./strands/) | Uses `@strands-agents/sdk` with streaming |
| Vercel AI SDK | [vercel-ai/](./vercel-ai/) | Uses `ai` package with `generateText` |

## Human-in-the-Loop Handoff

This example demonstrates how an agent can automate routine tasks while handing control to a human for sensitive operations:

```
┌──────────────────────────────────────────────────────────────┐
│  1. USER REQUEST                                             │
│     "I want to make Swedish meatballs for 4 people"          │
└──────────────────┬───────────────────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  2. AGENT AUTOMATION                                         │
│     • Opens browser session                                  │
│     • Navigates to willys.se                                 │
│     • Searches and adds ingredients to cart                  │
│     • Proceeds to checkout                                   │
└──────────────────┬───────────────────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  3. HANDOFF TO USER                                          │
│     • Agent stops at payment step                            │
│     • Returns Live View URL                                  │
│     • User takes control via browser stream                  │
│     • User completes payment                                 │
└──────────────────────────────────────────────────────────────┘
```

## Example Prompts

```
I want to make Swedish meatballs for 4 people.
Find the ingredients and add them to my willys.se cart.
```

```
Add milk, eggs, butter, and bread to my willys.se shopping cart.
```

```
Navigate to willys.se and find the cheapest option for 1kg of ground beef.
```

## Quick Start

```bash
cd strands  # or vercel-ai
npm install
npm start                    # HTTP server on :8080
npm run start:interactive    # Interactive shell
```

### Test

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Navigate to willys.se and search for milk"}'
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  BedrockAgentCoreApp                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Agent (Strands/Vercel AI)                            │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  BrowserTools                                   │  │  │
│  │  │  - navigate: Go to URLs                         │  │  │
│  │  │  - click: Click elements                        │  │  │
│  │  │  - type: Enter text                             │  │  │
│  │  │  - getText: Read page content                   │  │  │
│  │  │  - screenshot: Capture page                     │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  AgentCore Browser Service    │
              │  - Managed Chromium browser   │
              │  - Live View streaming        │
              │  - Session persistence        │
              └───────────────────────────────┘
```

## Live View Feature

The browser session provides a Live View URL that allows users to:
- See the browser in real-time
- Take control of the session
- Complete sensitive operations (like payment)

```typescript
const session = await browserTools.getClient().getSession()
const liveViewUrl = session.streams?.liveViewStream?.streamEndpoint
```

## Swedish Grocery Terms

Since willys.se is in Swedish, here are common terms:

| Swedish | English |
|---------|---------|
| Sök | Search |
| Lägg i varukorg | Add to cart |
| Varukorg | Shopping cart |
| Till kassan | To checkout |
| Köp | Buy |

## Notes

- The agent never attempts to enter payment information
- Browser sessions timeout automatically after inactivity
- Real sites may have anti-bot measures; results may vary
