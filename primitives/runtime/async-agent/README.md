# Async Agent

An agent that starts long-running background work and keeps its AgentCore Runtime session alive until the work is done.

→ See the [parent README](../README.md) for how AgentCore Runtime works.

## Prerequisites

- Node.js 22+
- AWS credentials with access to Amazon Bedrock and AgentCore
- The [AgentCore CLI](https://github.com/aws/agentcore-cli):

```bash
npm install -g @aws/agentcore
```

## Project Structure

```
async-agent/
├── app/agent/          # The agent: main.ts, package.json
└── agentcore/
    ├── agentcore.json  # Runtime configuration read by the AgentCore CLI
    └── cdk/            # CDK app the CLI deploys
```

## The Agent

AgentCore Runtime polls each session's `/ping` endpoint. A session that reports `Healthy` for 15 minutes is stopped; one
that reports `HealthyBusy` is kept running. `BedrockAgentCoreApp` tracks this for you: register work with
`addAsyncTask()` and `/ping` reports `HealthyBusy` until every task is finished with `completeAsyncTask()`.

```typescript
const startBackgroundTask = tool({
  name: 'startBackgroundTask',
  description: 'Start a background task that runs for the given number of seconds',
  inputSchema: z.object({
    duration: z.number().int().min(1).max(3600).default(5).describe('Duration in seconds for the background task'),
  }),
  callback: ({ duration }): string => {
    const taskId = app.addAsyncTask('backgroundTask', { duration })

    setTimeout(() => {
      app.completeAsyncTask(taskId)
    }, duration * 1000)

    return `Started background task ${taskId} for ${duration} seconds. The agent reports HealthyBusy until it finishes.`
  },
})
```

The agent answers immediately while the task keeps running in the background.

→ [Full source](./app/agent/main.ts)

## Run Locally

```bash
agentcore dev
```

The first run installs the agent's dependencies. In a second terminal, check the status, start a task, and check again:

```bash
curl http://localhost:8080/ping
agentcore invoke --runtime agent --local --payload '{"prompt": "Start a 10 second background task"}'
curl http://localhost:8080/ping
```

```
{"status":"Healthy","time_of_last_update":1794840830}
...
{"status":"HealthyBusy","time_of_last_update":1794840834}
```

After 10 seconds `/ping` reports `Healthy` again. `time_of_last_update` is a Unix timestamp that changes only when the
status changes.

## Deploy

```bash
npm install --prefix agentcore/cdk
agentcore deploy
agentcore invoke --runtime agent --payload '{"prompt": "Start a 10 second background task"}'
```

A deployed runtime's `/ping` isn't reachable from outside: AgentCore polls it to decide when the session may stop.

## Clean Up

```bash
agentcore remove all --yes
agentcore deploy --yes
```

This deletes the deployed stack. Run `git checkout -- agentcore` to restore the configuration and deploy again.
