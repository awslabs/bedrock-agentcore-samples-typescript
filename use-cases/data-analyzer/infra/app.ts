#!/usr/bin/env node
import 'dotenv/config'
import * as cdk from 'aws-cdk-lib'
import { DataAnalyzerStack } from './stack.js'

const app = new cdk.App()

new DataAnalyzerStack(app, 'DataAnalyzerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.AWS_REGION ?? 'us-east-1',
  },
})
