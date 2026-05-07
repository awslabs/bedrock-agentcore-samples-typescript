# Amazon Bedrock AgentCore Runtime container for a Claude Agent SDK agent.
#
# Requirements (per AgentCore Runtime):
#   - Platform: ARM64
#   - Listens on 0.0.0.0:8080
#   - Runs as non-root user
#
# The Claude Agent SDK spawns the Claude Code CLI as a subprocess, so it
# must be installed globally in the container.

FROM --platform=linux/arm64 public.ecr.aws/docker/library/node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json agent.ts ./
RUN npm run build

FROM --platform=linux/arm64 public.ecr.aws/docker/library/node:20-slim

WORKDIR /app

RUN npm install -g @anthropic-ai/claude-code@latest

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

RUN useradd -m -u 1001 bedrock_agentcore
USER bedrock_agentcore

ENV CLAUDE_CODE_USE_BEDROCK=1

EXPOSE 8080

CMD ["node", "--require", "@opentelemetry/auto-instrumentations-node/register", "dist/agent.js"]
