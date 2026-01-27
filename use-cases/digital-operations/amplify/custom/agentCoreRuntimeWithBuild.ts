import { Construct } from 'constructs'
import cdk, { aws_ecr_assets as ecr_assets, aws_bedrockagentcore as bedrock_agent_core } from 'aws-cdk-lib'

import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface AgentCoreRuntimeWithBuildProps {
  /**
   * Protocol configuration for the runtime ('MCP', 'HTTP', or 'A2A')
   */
  protocolConfiguration: 'MCP' | 'HTTP' | 'A2A'

  /**
   * Directory path containing the Dockerfile and application code
   */
  imageAssetDirectory: string

  /**
   * Optional environment variables to pass to the container
   */
  environment?: Record<string, string>

  /**
   * Optional build arguments for Docker
   */
  buildArgs?: Record<string, string>

  /**
   * Optional description for the runtime
   */
  description?: string

  // For authentication with the cognito client
  cognitoClientId: string
  cognitoDiscoveryUrl: string
}

/**
 * CDK Construct that builds and deploys a container to ECR
 * and creates a Bedrock AgentCore Runtime to host it.
 * Supports MCP, HTTP, and A2A protocol configurations.
 */
export class AgentCoreRuntimeWithBuild extends Construct {
  /**
   * The Docker image asset for the container
   */
  public readonly imageAsset: ecr_assets.DockerImageAsset

  /**
   * The full ECR image URI (includes registry, repository, and tag)
   */
  public readonly imageUri: string

  /**
   * Just the image tag (hash-based)
   */
  public readonly imageTag: string

  /**
   * The Bedrock AgentCore Runtime
   */
  public readonly runtime: bedrock_agent_core.CfnRuntime

  /**
   * The IAM execution role for the runtime
   */
  public readonly executionRole: cdk.aws_iam.Role

  constructor(scope: Construct, id: string, props: AgentCoreRuntimeWithBuildProps) {
    super(scope, id)

    // Build and push Docker image to ECR automatically
    this.imageAsset = new ecr_assets.DockerImageAsset(this, 'RuntimeImage', {
      directory: props.imageAssetDirectory,

      // Build arguments (can be used in Dockerfile)
      buildArgs: {
        NODE_ENV: 'production',
        ...props?.buildArgs,
      },

      // Exclude unnecessary files from build context for faster builds
      exclude: ['node_modules', '.git', '*.md', 'dist', '.DS_Store', '*.log'],

      // Platform targeting
      platform: ecr_assets.Platform.LINUX_ARM64,
    })

    // Make URI and tag easily accessible
    this.imageUri = this.imageAsset.imageUri
    this.imageTag = this.imageAsset.imageTag

    // Create an execution role for the runtime
    this.executionRole = new cdk.aws_iam.Role(this, 'RuntimeExecutionRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
      description: `Execution role for ${props.protocolConfiguration} runtime`,
    })

    // Grant the role permission to pull from ECR
    this.imageAsset.repository.grantPull(this.executionRole)

    // Add ECR authorization token permission (required for ECR authentication)
    this.executionRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['ecr:GetAuthorizationToken'],
        resources: ['*'], // This permission applies globally, not to specific repositories
      })
    )

    // Add CloudWatch Logs permissions for log groups
    this.executionRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['logs:DescribeLogStreams', 'logs:CreateLogGroup'],
        resources: [
          `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/bedrock-agentcore/runtimes/*`,
        ],
      })
    )

    // Add CloudWatch Logs permissions for describing log groups
    this.executionRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['logs:DescribeLogGroups'],
        resources: [`arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:*`],
      })
    )

    // Add CloudWatch Logs permissions for log streams
    this.executionRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [
          `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/bedrock-agentcore/runtimes/*:log-stream:*`,
        ],
      })
    )

    // Add X-Ray permissions
    this.executionRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords',
          'xray:GetSamplingRules',
          'xray:GetSamplingTargets',
        ],
        resources: ['*'],
      })
    )

    // Add CloudWatch Metrics permissions
    this.executionRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'cloudwatch:namespace': 'bedrock-agentcore',
          },
        },
      })
    )

    // Generate a unique runtime name that includes stack context
    // Bedrock requires: [a-zA-Z][a-zA-Z0-9_]{0,47} (max 48 chars, alphanumeric + underscore only)
    const stackName = cdk.Stack.of(this).stackName.slice(0, 20)
    const uniqueSuffix = cdk.Names.uniqueId(this).slice(-8)
    const agentRuntimeName = `${stackName}_${props.protocolConfiguration}_${uniqueSuffix}`
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .slice(0, 48) // Bedrock has a 48 character limit

    // Create the Bedrock AgentCore Runtime
    this.runtime = new bedrock_agent_core.CfnRuntime(this, 'AgentRuntime', {
      agentRuntimeName: agentRuntimeName,

      protocolConfiguration: props.protocolConfiguration,

      // Configure the container artifact
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: this.imageUri,
        },
      },

      // Configure Authentication
      authorizerConfiguration: {
        customJwtAuthorizer: {
          allowedClients: [props.cognitoClientId],
          discoveryUrl: props.cognitoDiscoveryUrl,
        },
      },

      // Network configuration
      networkConfiguration: {
        networkMode: 'PUBLIC',
      },

      // Execution role ARN
      roleArn: this.executionRole.roleArn,

      // Optional: Environment variables for the container
      environmentVariables: props?.environment,

      // Description
      description: props.description || `${props.protocolConfiguration} runtime for Bedrock AgentCore`,

      // Allow custom headers to be passed through to the container
      // This enables passing chatSessionId and other context via headers
      // Note: Custom headers must follow AWS pattern: X-Amzn-Bedrock-AgentCore-Runtime-Custom-*
      requestHeaderConfiguration: {
        requestHeaderAllowlist: ['X-Amzn-Bedrock-AgentCore-Runtime-Custom-Chat-Session-Id'],
      },
    })

    // Add explicit CloudFormation dependencies to ensure proper resource ordering
    // This ensures IAM policies are fully propagated before Bedrock validates ECR access
    this.runtime.node.addDependency(this.executionRole)
    this.runtime.node.addDependency(this.imageAsset)

    // // Output the runtime details with unique export names based on construct ID
    // const constructId = id;

    // new cdk.CfnOutput(this, 'RuntimeImageUri', {
    //   value: this.imageUri,
    //   description: `ECR URI for the ${constructId} runtime Docker image`,
    //   exportName: `${stackName}-${constructId}-RuntimeImageUri`,
    // });

    // new cdk.CfnOutput(this, 'RuntimeImageTag', {
    //   value: this.imageTag,
    //   description: `Docker image tag for the ${constructId} runtime`,
    // });

    // new cdk.CfnOutput(this, 'RuntimeArn', {
    //   value: this.runtime.attrAgentRuntimeArn,
    //   description: `ARN of the ${constructId} Bedrock AgentCore Runtime`,
    //   exportName: `${stackName}-${constructId}-RuntimeArn`,
    // });

    // new cdk.CfnOutput(this, 'RuntimeId', {
    //   value: this.runtime.attrAgentRuntimeId,
    //   description: `ID of the ${constructId} Bedrock AgentCore Runtime`,
    // });

    // new cdk.CfnOutput(this, 'ExecutionRoleArn', {
    //   value: this.executionRole.roleArn,
    //   description: `ARN of the ${constructId} execution role`,
    // });
  }
}
