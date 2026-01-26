# Stage 1: Build the application
# Use ARM64 platform for AgentCore Runtime compatibility
FROM --platform=linux/arm64 public.ecr.aws/docker/library/node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
# --verbose --loglevel=silly

COPY . .
RUN npm run build

# Stage 2: Create the production image
# Use ARM64 platform for AgentCore Runtime compatibility
FROM --platform=linux/arm64 public.ecr.aws/docker/library/node:20-alpine

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist 

# Expose port 8080 for AgentCore Runtime
EXPOSE 8080

CMD ["node", "dist/index.js"]
