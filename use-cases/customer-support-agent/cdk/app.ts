#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { AgentStack } from './agent-stack.js'

const app = new cdk.App()
new AgentStack(app, 'CustomerSupportMultiagent', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
})
