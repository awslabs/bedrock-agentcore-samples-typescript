# AWS Amplify Deployment Guide

This guide walks you through deploying the Digital Operations Agent using AWS Amplify Hosting with Git-based continuous deployment.

## Prerequisites

- AWS Account with Amplify and related service permissions
- GitHub account (or GitLab/Bitbucket)
- This repository forked to your GitHub account

## Overview

This project is part of a monorepo and requires:
- **Monorepo configuration** — Specify the app root path
- **Custom build image** — Support for Docker multi-architecture builds with ARM64 emulation
- **Git-based deployment** — Amplify connects to your repository for CI/CD

## Deployment Steps

### 1. Fork the Repository

Fork the [bedrock-agentcore-typescript-samples](https://github.com/awslabs/bedrock-agentcore-typescript-samples) repository to your GitHub account.

### 2. Create Amplify App

1. Navigate to the [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"New app"** → **"Host web app"**
3. Select **GitHub** as your Git provider
4. Click **"Authorize AWS Amplify"** to grant repository access
5. Select your forked repository
6. Select the branch to deploy (typically `main`)

### 3. Configure Monorepo Settings

Since this is a monorepo, you must specify the app location:

1. Check the box **"My app is a monorepo"**
2. Set the **app root path**:
   ```
   use-cases/digital-operations
   ```
3. Click **"Next"**

**What this does:**
- Sets the `AMPLIFY_MONOREPO_APP_ROOT` environment variable automatically
- Tells Amplify to look for `amplify.yml` with the `applications` key structure
- Ensures builds run from the correct directory

**Important:** The `amplify.yml` file uses the monorepo format with the `applications` key:
```yaml
version: 1
applications:
  - appRoot: use-cases/digital-operations
    backend:
      phases:
        build:
          commands: [...]
    frontend:
      phases:
        build:
          commands: [...]
```

### 4. Configure Build Settings

The `amplify.yml` file in `use-cases/digital-operations/amplify.yml` will be automatically detected. Review the build settings:

- **Backend phase** — Builds Docker images for AgentCore Runtime (agent and MCP servers)
- **Frontend phase** — Builds the Next.js application

Click **"Next"** to proceed.

### 5. Set Custom Build Image

**CRITICAL**: This project requires a custom CodeBuild image to support Docker multi-architecture builds.

1. After creating the app, go to **App settings** → **Build settings**
2. Click **"Edit"** in the **Build image** section
3. Select **"Custom image"**
4. Enter the image:
   ```
   aws/codebuild/amazonlinux2-x86_64-standard:5.0
   ```
5. Click **"Save"**

**Why this is required:**
- AgentCore Runtime requires ARM64 Docker images
- The standard Amplify image lacks QEMU emulation for cross-platform builds
- This image includes Docker and necessary build tools for ARM64 emulation

### 6. Deploy

1. Click **"Save and deploy"**
2. Amplify will automatically:
   - Clone your repository
   - Set up QEMU for ARM64 emulation
   - Install Node.js 20
   - Build Docker images for AgentCore Runtime
   - Deploy backend resources (Cognito, AppSync, DynamoDB, AgentCore)
   - Build and deploy the Next.js frontend to CDN

### 7. Monitor Deployment

Watch the build logs in the Amplify Console:

1. **Provision** — Sets up build environment
2. **Backend Build** — 
   - Installs QEMU for ARM64 emulation
   - Builds agent and MCP server Docker images
   - Deploys Amplify backend with `npx ampx pipeline-deploy`
3. **Frontend Build** — Builds Next.js application
4. **Deploy** — Publishes to Amplify CDN

Build typically takes 10-15 minutes on first deployment.

## Post-Deployment

### Access Your Application

1. After deployment completes, find your app URL in the Amplify Console
2. The URL format: `https://main.xxxxxx.amplifyapp.com`
3. Open the URL to access the Digital Operations Agent

### Create Users

The application uses Cognito with admin-only user creation:

1. Go to **Amazon Cognito** in AWS Console
2. Find the user pool created by Amplify (check Amplify outputs)
3. Click **"Create user"**
4. Enter email and temporary password
5. User will be prompted to change password on first login

### Verify Backend Resources

Check that all resources were created:

1. **AgentCore Runtime** — Two runtimes (agent and MCP server)
2. **Cognito User Pool** — Authentication
3. **AppSync API** — GraphQL endpoint
4. **DynamoDB Tables** — Data storage

View outputs in Amplify Console under **Backend environments**.

## Continuous Deployment

Once configured, Amplify automatically deploys on every push to your connected branch:

1. Make changes to your forked repository
2. Push to the connected branch
3. Amplify automatically triggers a new build
4. Monitor progress in the Amplify Console

## Environment Variables

Amplify automatically sets required environment variables:

- `AMPLIFY_MONOREPO_APP_ROOT` — Set to `use-cases/digital-operations`
- `AWS_BRANCH` — Current branch name
- `AWS_APP_ID` — Amplify app ID
- `AMPLIFY_DATA_GRAPHQL_ENDPOINT` — AppSync endpoint (set by backend)

Additional variables are configured in the backend deployment.

## Troubleshooting

### "Monorepo spec provided without 'applications' key"

**Cause**: The `amplify.yml` file doesn't use the monorepo format when the app is configured as a monorepo in the Amplify Console.

**Solution**: 
1. Ensure your `amplify.yml` uses the `applications` key structure:
   ```yaml
   version: 1
   applications:
     - appRoot: use-cases/digital-operations
       backend:
         phases:
           build:
             commands: [...]
       frontend:
         phases:
           build:
             commands: [...]
   ```
2. Commit and push the updated `amplify.yml` to your repository
3. Retry the deployment in Amplify Console

### "My app is a monorepo" option not visible

**Cause**: Using an older version of the Amplify Console.

**Solution**: Manually set the environment variable:
1. Go to **App settings** → **Environment variables**
2. Add variable:
   - Key: `AMPLIFY_MONOREPO_APP_ROOT`
   - Value: `use-cases/digital-operations`

### Build Fails with "exec format error"

**Cause**: The build image doesn't support Docker multi-architecture builds.

**Solution**: Ensure you've set the custom build image to `aws/codebuild/amazonlinux2-x86_64-standard:5.0`.

### Docker build fails with "403 Forbidden" or "unauthorized"

**Cause**: Unable to pull Docker images from public registries.

**Solution**: The QEMU setup in `amplify.yml` uses public ECR images. Ensure your AWS account can access public ECR. The build commands handle this automatically.

### Backend build fails with "amplify/ folder not found"

**Cause**: Monorepo app root not configured correctly.

**Solution**: 
1. Verify `AMPLIFY_MONOREPO_APP_ROOT=use-cases/digital-operations`
2. Check that `amplify/` folder exists at `use-cases/digital-operations/amplify/`
3. Ensure the `appRoot` in `amplify.yml` matches the environment variable

### Frontend build fails with "Module not found"

**Cause**: Dependencies not installed or wrong Node.js version.

**Solution**: The `amplify.yml` installs Node.js 20 using `n`. Check build logs to verify:
```
Frontend - Node.js version: v20.x.x
```

### AgentCore Runtime deployment fails

**Cause**: Docker images failed to build or push.

**Solution**: 
1. Check backend build logs for Docker errors
2. Verify QEMU emulation setup succeeded
3. Ensure Docker buildx is configured correctly
4. Confirm custom build image is set to `aws/codebuild/amazonlinux2-x86_64-standard:5.0`

## Architecture Notes

This project deploys:

1. **Frontend**: Next.js application hosted on Amplify's CDN
2. **Backend**: 
   - AWS AgentCore Runtime with two Docker containers:
     - Agent Server (custom agent tools)
     - MCP Server (Model Context Protocol server)
   - Amazon Cognito for authentication
   - AWS AppSync for GraphQL API
   - DynamoDB for data storage

The Docker containers are built for `linux/arm64` architecture to match AWS AgentCore Runtime's requirements.

## Additional Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [AWS CodeBuild Build Images](https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-available.html)
- [Docker Multi-Platform Builds](https://docs.docker.com/build/building/multi-platform/)

## Support

For issues related to:
- **Amplify deployment**: Check AWS Amplify Console logs
- **Docker builds**: Review the backend build phase logs
- **Application issues**: Check CloudWatch logs for your deployed resources
