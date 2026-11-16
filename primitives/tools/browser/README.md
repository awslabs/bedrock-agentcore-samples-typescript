# Browser

Build agents that browse the web in a cloud browser with AgentCore Browser.

→ See the [parent README](../README.md) for how the tools samples run.

| Sample                    | Framework     | Import                                           |
| ------------------------- | ------------- | ------------------------------------------------ |
| [strands](./strands/)     | Strands       | `bedrock-agentcore/experimental/browser/strands` |
| [vercel-ai](./vercel-ai/) | Vercel AI SDK | `bedrock-agentcore/browser/vercel-ai`            |

## Capabilities

`browserTools.tools` gives the agent seven tools:

| Tool         | Description                                      |
| ------------ | ------------------------------------------------ |
| `navigate`   | Go to a URL                                      |
| `click`      | Click an element by CSS selector                 |
| `type`       | Enter text into an input field                   |
| `getText`    | Read the text of the page or an element          |
| `getHtml`    | Read the HTML of the page or an element          |
| `screenshot` | Capture the page, optionally saving it to a file |
| `evaluate`   | Run JavaScript in the page                       |

The tools drive the remote browser with [Playwright](https://playwright.dev/) over the Chrome DevTools Protocol, so
`playwright` is a dependency of both samples. Playwright runs on your machine; screenshots saved with a path land there
too.

**Session persistence:** Cookies, logins and page state persist across turns within a browser session. A session times
out after 1 hour by default; the samples then start the conversation over with a new browser.

**Sequential tool calls:** All tools share one page, so the samples run tool calls one at a time (`toolExecutor:
'sequential'` in Strands, `toolCallConcurrency: 1` in the Vercel AI SDK). Running them in parallel would also race to
start the browser session and start more than one.

## Example

```bash
curl -N -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-amzn-bedrock-agentcore-runtime-session-id: test-123" \
  -d '{"prompt": "Go to https://news.ycombinator.com, list the top 3 story titles, and save a screenshot to output/hn.png"}'
```

Real sites may block automated browsers, so results vary from site to site.
