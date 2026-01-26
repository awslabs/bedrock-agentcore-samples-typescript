# AWS Amplify Deployment Guide

This guide walks you through deploying this project using AWS Amplify Hosting.

## Prerequisites

- AWS Account with appropriate permissions
- GitHub repository with this project code
- AWS CLI configured (optional, for command-line deployment)

## Deployment Steps

### 1. Create an Amplify App

1. Navigate to the [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"New app"** → **"Host web app"**
3. Select your Git provider (GitHub, GitLab, Bitbucket, or AWS CodeCommit)
4. Authorize AWS Amplify to access your repository
5. Select the repository and branch you want to deploy

### 2. Configure Build Settings

#### Required: Set Custom Build Image

**IMPORTANT**: This project requires a specific CodeBuild image to support Docker multi-architecture builds with QEMU emulation.

1. In the Amplify Console, go to **App settings** → **Build settings**
2. Click **"Edit"** in the Build image section
3. Select **"Custom image"**
4. Enter the following image:
   ```
   aws/codebuild/amazonlinux2-x86_64-standard:5.0
   ```
5. Click **"Save"**

**Why this image is required:**
- This project builds Docker images for ARM64 architecture (required by AWS AgentCore Runtime)
- The standard Amplify build image may not have the necessary tools for cross-platform Docker builds
- The `amazonlinux2-x86_64-standard:5.0` image includes Docker and the necessary build tools

#### Build Specification

The `amplify.yml` file in the root directory contains the build configuration. It includes:
- Multi-architecture Docker support with QEMU emulation
- Node.js 20 setup
- Backend and frontend build phases

No additional configuration is needed as the `amplify.yml` is automatically detected.

### 3. Deploy

1. Click **"Save and deploy"**
2. Amplify will automatically:
   - Clone your repository
   - Install dependencies
   - Build the backend (including Docker images for AgentCore Runtime)
   - Build the frontend
   - Deploy to a global CDN

### 4. Monitor the Build

1. Watch the build logs in real-time
2. The build process includes:
   - Setting up QEMU for ARM64 emulation
   - Building Docker images for both agent and MCP servers
   - Deploying backend resources
   - Building and deploying the Next.js frontend

## Troubleshooting

### Build Fails with "exec format error"

**Cause**: The build image doesn't support Docker multi-architecture builds.

**Solution**: Ensure you've set the custom build image to `aws/codebuild/amazonlinux2-x86_64-standard:5.0` as described in Step 2.

### Docker Build Fails with 403 Forbidden

**Cause**: Unable to pull Docker images from AWS ECR Public.

**Solution**: This is resolved by the `--platform=linux/arm64` flags in the Dockerfiles, which ensures the correct image architecture is pulled.

### npm ci Fails During Docker Build

**Cause**: Platform-specific dependencies can't be built for ARM64.

**Solution**: The QEMU emulation setup in `amplify.yml` resolves this by allowing ARM64 binaries to run on the x86_64 build host.

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
