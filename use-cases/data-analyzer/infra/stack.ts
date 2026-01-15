import * as path from 'path'
import { fileURLToPath } from 'url'
import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as cr from 'aws-cdk-lib/custom-resources'
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

    // Cognito User Pool - no self-signup, minimal password policy
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 6,
        requireUppercase: false,
        requireLowercase: false,
        requireDigits: false,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Cognito domain with Managed Login v2
    userPool.addDomain('Domain', {
      cognitoDomain: { domainPrefix: `data-analyzer-${this.account}` },
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    })

    // Web client for frontend (no secret, auth code flow)
    const webClient = userPool.addClient('WebClient', {
      generateSecret: false,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls: ['http://localhost:3000/callback'],
        logoutUrls: ['http://localhost:3000/'],
      },
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
    })

    // Managed Login Branding (required for v2)
    new cognito.CfnManagedLoginBranding(this, 'ManagedLoginBranding', {
      userPoolId: userPool.userPoolId,
      clientId: webClient.userPoolClientId,
      useCognitoProvidedValues: true,
    })

    // Create test user (user@example.com / password)
    const createUser = new cr.AwsCustomResource(this, 'CreateTestUser', {
      onCreate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'adminCreateUser',
        parameters: {
          UserPoolId: userPool.userPoolId,
          Username: 'user@example.com',
          TemporaryPassword: 'TempPass1!',
          MessageAction: 'SUPPRESS',
          UserAttributes: [
            { Name: 'email', Value: 'user@example.com' },
            { Name: 'email_verified', Value: 'true' },
          ],
        },
        physicalResourceId: cr.PhysicalResourceId.of('TestUser'),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: [userPool.userPoolArn] }),
    })

    // Set permanent password for test user
    const setPassword = new cr.AwsCustomResource(this, 'SetUserPassword', {
      onCreate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'adminSetUserPassword',
        parameters: {
          UserPoolId: userPool.userPoolId,
          Username: 'user@example.com',
          Password: 'password',
          Permanent: true,
        },
        physicalResourceId: cr.PhysicalResourceId.of('TestUserPassword'),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: [userPool.userPoolArn] }),
    })
    setPassword.node.addDependency(createUser)

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
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')],
    })

    // Bedrock permissions
    runtimeRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'],
      })
    )

    // AgentCore permissions (Code Interpreter, etc.)
    runtimeRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('BedrockAgentCoreFullAccess'))

    // S3 permissions for artifact storage
    artifactBucket.grantReadWrite(runtimeRole)

    // ECR permissions - use managed policy for reliable propagation
    runtimeRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'))

    // AgentCore Runtime
    const runtime = new bedrockagentcore.CfnRuntime(this, 'Runtime', {
      agentRuntimeName: 'dataAnalyzer',
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
      authorizerConfiguration: {
        customJwtAuthorizer: {
          discoveryUrl: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}/.well-known/openid-configuration`,
          allowedClients: [webClient.userPoolClientId],
        },
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
      description: 'AgentCore Runtime ARN (for VITE_RUNTIME_ARN)',
    })

    new cdk.CfnOutput(this, 'ImageUri', {
      value: imageAsset.imageUri,
      description: 'Docker image URI',
    })

    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: `data-analyzer-${this.account}`,
      description: 'Cognito domain prefix (for VITE_COGNITO_DOMAIN)',
    })

    new cdk.CfnOutput(this, 'WebClientId', {
      value: webClient.userPoolClientId,
      description: 'Web client ID (for VITE_CLIENT_ID)',
    })

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    })

    new cdk.CfnOutput(this, 'TestCredentials', {
      value: 'user@example.com / password',
      description: 'Test user credentials for local development',
    })
  }
}
