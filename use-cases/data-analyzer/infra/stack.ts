import * as path from 'path'
import { fileURLToPath } from 'url'
import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets'
import * as bedrockagentcore from 'aws-cdk-lib/aws-bedrockagentcore'
import { Construct } from 'constructs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class DataAnalyzerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // S3 bucket for artifacts
    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      bucketName: `data-analyzer-artifacts-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    // Code Interpreter with PUBLIC network mode (internet access)
    const codeInterpreter = new bedrockagentcore.CfnCodeInterpreterCustom(this, 'CodeInterpreter', {
      name: 'data_analyzer_interpreter',
      networkConfiguration: {
        networkMode: 'PUBLIC',
      },
    })

    // Build and push Docker image during cdk deploy
    const imageAsset = new ecr_assets.DockerImageAsset(this, 'AgentImage', {
      directory: path.join(__dirname, '..'),
      platform: ecr_assets.Platform.LINUX_ARM64,
    })

    // IAM role for the agent runtime
    const runtimeRole = new iam.Role(this, 'RuntimeRole', {
      description: 'Execution role for data analyzer AgentCore runtime',
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
        new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
      ],
    })

    // Bedrock permissions
    runtimeRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'],
      })
    )

    // Code Interpreter permissions
    runtimeRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock-agentcore:CreateCodeInterpreterSession',
          'bedrock-agentcore:ExecuteCodeInterpreter',
          'bedrock-agentcore:GetCodeInterpreterSession',
          'bedrock-agentcore:DeleteCodeInterpreterSession',
        ],
        resources: ['*'],
      })
    )

    // S3 permissions for artifact storage
    artifactBucket.grantReadWrite(runtimeRole)

    // ECR permissions - use managed policy for reliable propagation
    runtimeRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly')
    )

    // AgentCore Runtime
    const runtime = new bedrockagentcore.CfnRuntime(this, 'Runtime', {
      agentRuntimeName: 'data_analyzer',
      roleArn: runtimeRole.roleArn,
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: imageAsset.imageUri,
        },
      },
      networkConfiguration: {
        networkMode: 'PUBLIC',
      },
      protocolConfiguration: 'HTTP',
      environmentVariables: {
        AWS_REGION: this.region,
        BEDROCK_REGION: process.env['BEDROCK_REGION'] ?? this.region,
        BEDROCK_MODEL_ID: process.env['BEDROCK_MODEL_ID'] ?? 'global.anthropic.claude-haiku-4-5-20251001-v1:0',
        ARTIFACT_BUCKET: artifactBucket.bucketName,
        CODE_INTERPRETER_ID: codeInterpreter.ref,
      },
    })

    // Ensure IAM policy is fully deployed before Runtime validation
    runtime.node.addDependency(runtimeRole)

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: artifactBucket.bucketName,
      description: 'S3 bucket for storing generated artifacts',
    })

    new cdk.CfnOutput(this, 'CodeInterpreterId', {
      value: codeInterpreter.ref,
      description: 'Code Interpreter ID with PUBLIC network mode',
    })

    new cdk.CfnOutput(this, 'RuntimeArn', {
      value: runtime.attrAgentRuntimeArn,
      description: 'AgentCore Runtime ARN',
    })

    new cdk.CfnOutput(this, 'ImageUri', {
      value: imageAsset.imageUri,
      description: 'Docker image URI',
    })
  }
}
