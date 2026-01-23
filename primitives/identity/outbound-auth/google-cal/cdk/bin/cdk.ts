#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { CognitoStack } from '../lib/cognito-stack.js'

const app = new cdk.App()
new CognitoStack(app, 'OutboundAuthCognito')
