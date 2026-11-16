# Browser

Build agents that browse the web in a cloud browser with AgentCore Browser.

→ See the [parent README](../README.md) for how the tools samples run.

| Sample                    | Framework     | Import                                           |
| ------------------------- | ------------- | ------------------------------------------------ |
| [strands](./strands/)     | Strands       | `bedrock-agentcore/experimental/browser/strands` |
| [vercel-ai](./vercel-ai/) | Vercel AI SDK | `bedrock-agentcore/browser/vercel-ai`            |

```typescript
const browser = new BrowserTools({ region })
const agent = new Agent({ model, tools: browser.tools, toolExecutor: 'sequential' })
```

`browser.tools` gives the agent seven tools:

| Tool         | Description                                      |
| ------------ | ------------------------------------------------ |
| `navigate`   | Go to a URL                                      |
| `click`      | Click an element by CSS selector                 |
| `type`       | Enter text into an input field                   |
| `getText`    | Read the text of the page or an element          |
| `getHtml`    | Read the HTML of the page or an element          |
| `screenshot` | Capture the page, optionally saving it to a file |
| `evaluate`   | Run JavaScript in the page                       |

The browser session starts on the first tool call and keeps its page, cookies and login state across tool calls. It
isn't tied to the runtime session: left alone it runs until it times out (1 hour by default), so the samples call
`browser.stopSession()` when each request finishes. The agent still remembers the conversation.

The tools drive the remote browser with [Playwright](https://playwright.dev/) over the Chrome DevTools Protocol, so
`playwright` is a dependency of both samples. Playwright can't be bundled into a single file, so the samples deploy as
a container: the `Dockerfile` in `app/agent/` installs the dependencies and runs `main.ts` with Node.js. `agentcore dev`
builds and runs the same image locally, with Docker, Podman or Finch.

Real sites may block automated browsers, so results vary from site to site.
