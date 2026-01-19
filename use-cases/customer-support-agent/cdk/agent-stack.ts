import * as cdk from 'aws-cdk-lib'
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import * as path from 'node:path'
import * as url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export class AgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const imageAsset = new ecr_assets.DockerImageAsset(this, 'AgentImage', {
      directory: path.join(__dirname, '..'),
      platform: ecr_assets.Platform.LINUX_ARM64,
    })

    const runtimeRole = new iam.Role(this, 'RuntimeRole', {
      assumedBy: new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')],
      inlinePolicies: {
        BedrockAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
              resources: ['*'],
            }),
          ],
        }),
        ECRAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'ecr:GetAuthorizationToken',
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    })

    const runtime = new cdk.CfnResource(this, 'AgentRuntime', {
      type: 'AWS::BedrockAgentCore::Runtime',
      properties: {
        AgentRuntimeName: 'customer_support_multiagent',
        AgentRuntimeArtifact: {
          ContainerConfiguration: {
            ContainerUri: imageAsset.imageUri,
          },
        },
        ProtocolConfiguration: 'HTTP',
        RoleArn: runtimeRole.roleArn,
        NetworkConfiguration: {
          NetworkMode: 'PUBLIC',
        },
      },
    })
    runtime.node.addDependency(runtimeRole)

    new cdk.CfnOutput(this, 'RuntimeArn', {
      description: 'Agent Runtime ARN',
      value: runtime.getAtt('AgentRuntimeArn').toString(),
    })
  }
}
