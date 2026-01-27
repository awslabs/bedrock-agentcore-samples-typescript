import { defineBackend } from '@aws-amplify/backend'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { athenaQuery } from './functions/athena-query/resource'
import { AgentCoreRuntimeWithBuild } from './custom/agentCoreRuntimeWithBuild'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

import { SeedDataConstruct } from './custom/seedData'
import { applyCdkNag } from './custom/cdkNagHelper'

import { aws_iam as iam } from 'aws-cdk-lib'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const backend = defineBackend({
  auth,
  data,
  athenaQuery,
})

backend.stack.tags.setTag('Project', 'digitalhse')

//This will disable the ability for users to sign up in the UI. The administrator will manually create users.
const { cfnUserPool } = backend.auth.resources.cfnResources
cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: true,
}

// Seed the Settings table with the system prompt
const SettingsDdbTable = backend.data.resources.tables['Settings']
new SeedDataConstruct(backend.stack, 'SeedData', {
  settingsTable: SettingsDdbTable,
})

// Deploy MCP server
const mcpServer = new AgentCoreRuntimeWithBuild(backend.stack, 'McpServer', {
  protocolConfiguration: 'MCP',
  imageAssetDirectory: path.join(__dirname, 'mcp/server'),
  cognitoClientId: backend.auth.resources.userPoolClient.userPoolClientId,
  cognitoDiscoveryUrl: `https://cognito-idp.${backend.auth.stack.region}.amazonaws.com/${backend.auth.resources.userPool.userPoolId}/.well-known/openid-configuration`,
  description: 'MCP server for custom tools and resources',
  environment: {
    AMPLIFY_DATA_GRAPHQL_ENDPOINT: backend.data.graphqlUrl,
  },
})

// Grant MCP server runtime permission to execute AppSync GraphQL operations
backend.data.resources.graphqlApi.grantMutation(mcpServer.executionRole, '*')
backend.data.resources.graphqlApi.grantQuery(mcpServer.executionRole, '*')
backend.data.resources.graphqlApi.grantSubscription(mcpServer.executionRole, '*')

// Deploy GenAI Agent to ECR with HTTP protocol
const agentServer = new AgentCoreRuntimeWithBuild(backend.stack, 'AgentServer', {
  protocolConfiguration: 'HTTP',
  imageAssetDirectory: path.join(__dirname, 'agent/server'),
  cognitoClientId: backend.auth.resources.userPoolClient.userPoolClientId,
  cognitoDiscoveryUrl: `https://cognito-idp.${backend.auth.stack.region}.amazonaws.com/${backend.auth.resources.userPool.userPoolId}/.well-known/openid-configuration`,
  description: 'GenAI conversational agent with Bedrock integration',
  environment: {
    AMPLIFY_DATA_GRAPHQL_ENDPOINT: backend.data.graphqlUrl,
    AWS_REGION: backend.stack.region,
  },
})

// Grant Agent server runtime permission to execute AppSync GraphQL operations
backend.data.resources.graphqlApi.grantMutation(agentServer.executionRole, '*')
backend.data.resources.graphqlApi.grantQuery(agentServer.executionRole, '*')
backend.data.resources.graphqlApi.grantSubscription(agentServer.executionRole, '*')

// Grant Agent server permission to invoke Bedrock models
agentServer.executionRole.addToPrincipalPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
    resources: [
      'arn:aws:bedrock:*::foundation-model/*',
      `arn:aws:bedrock:*:${backend.stack.account}:inference-profile/*`,
    ],
  })
)

// Add custom Bedrock permissions to authenticated users
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
    resources: [
      // Specific model ARN or use * for all models
      'arn:aws:bedrock:*::foundation-model/*',
      `arn:aws:bedrock:*:${backend.stack.account}:inference-profile/*`, // inference profiles may call for responses from multiple regions
    ],
  })
)

// Add S3 permissions for accessing spatial data management assets
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['s3:GetObject', 's3:ListBucket'],
    resources: [
      'arn:aws:s3:::spatialdatamanagement-ass-assetencrypteds3encrypte-jrozbyvnxoe0/SpatialDataManagementAssets/*',
      'arn:aws:s3:::spatialdatamanagement-ass-assetencrypteds3encrypte-jrozbyvnxoe0',
    ],
  })
)

// Add AgentCore Runtime permissions
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['bedrock-agentcore:InvokeAgentRuntime', 'bedrock-agentcore:GetAgentRuntime'],
    resources: ['*'],
  })
)

// Add Athena permissions to Lambda function
backend.athenaQuery.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'athena:StartQueryExecution',
      'athena:GetQueryExecution',
      'athena:GetQueryResults',
      'athena:StopQueryExecution',
      'athena:GetWorkGroup',
    ],
    resources: ['*'], // Lambda will have access to all Athena resources
  })
)

// Add S3 permissions for Athena query results
backend.athenaQuery.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['s3:GetBucketLocation', 's3:GetObject', 's3:ListBucket', 's3:PutObject'],
    resources: [
      `arn:aws:s3:::aws-athena-query-results-${backend.stack.account}-${backend.stack.region}`,
      `arn:aws:s3:::aws-athena-query-results-${backend.stack.account}-${backend.stack.region}/*`,
    ],
  })
)

// Add S3 permissions for source data buckets (for Athena table data) from the prod a4e storage bucket
backend.athenaQuery.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['s3:GetObject', 's3:ListBucket'],
    resources: [
      'arn:aws:s3:::amplify-d2l9ed3lys4sp6-ma-workshopstoragebucketd9b-n2b8vnbheqyu',
      'arn:aws:s3:::amplify-d2l9ed3lys4sp6-ma-workshopstoragebucketd9b-n2b8vnbheqyu/*',
    ],
  })
)

// Add Glue permissions for Athena (to access data catalog)
backend.athenaQuery.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'glue:GetDatabase',
      'glue:GetDatabases',
      'glue:GetTable',
      'glue:GetTables',
      'glue:GetPartition',
      'glue:GetPartitions',
    ],
    resources: ['*'], // Lambda will have access to all Glue resources
  })
)

// Add Athena permissions to Agent server (so AI agent can execute queries via GraphQL)
agentServer.executionRole.addToPrincipalPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'athena:StartQueryExecution',
      'athena:GetQueryExecution',
      'athena:GetQueryResults',
      'athena:StopQueryExecution',
    ],
    resources: ['*'],
  })
)

backend.addOutput({
  custom: {
    mcpServerAgentArn: mcpServer.runtime.attrAgentRuntimeArn,
    agentServerAgentArn: agentServer.runtime.attrAgentRuntimeArn,
  },
})

// Apply CDK Nag checks only in sandbox environments
// Sandbox stacks follow the naming convention: amplify-<app-name>-<username>-sandbox-<hash>
const isSandbox = backend.stack.stackName.includes('-sandbox-')
if (isSandbox) {
  console.log('Applying cdk nag')
  applyCdkNag(backend.stack)

  // Also apply to nested stacks (auth, data, function)
  const authStack = backend.auth.stack
  const dataStack = backend.data.stack

  if (authStack) {
    applyCdkNag(authStack)
  }
  if (dataStack) {
    applyCdkNag(dataStack)
  }
}
