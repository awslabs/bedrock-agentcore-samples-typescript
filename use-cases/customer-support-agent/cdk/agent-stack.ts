import * as cdk from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export class AgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const imageUri = new cdk.CfnParameter(this, 'ContainerImageUri', {
      type: 'String',
      description: 'ECR image URI',
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
            ContainerUri: imageUri.valueAsString,
          },
        },
        ProtocolConfiguration: 'HTTP',
        RoleArn: runtimeRole.roleArn,
        NetworkConfiguration: {
          NetworkMode: 'PUBLIC',
        },
      },
    })

    new cdk.CfnOutput(this, 'RuntimeArn', {
      description: 'Agent Runtime ARN',
      value: runtime.getAtt('AgentRuntimeArn').toString(),
    })
  }
}
