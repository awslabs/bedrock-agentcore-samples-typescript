import { AgentCoreApplication, type AgentCoreApplicationProps } from '@aws/agentcore-cdk'
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib'
import * as agentcore from 'aws-cdk-lib/aws-bedrockagentcore'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'

export interface AgentCoreStackProps extends StackProps {
  /** Props for the AgentCore application, produced by transformAgentCoreJson from agentcore/agentcore.json. */
  application: AgentCoreApplicationProps
}

/**
 * The stack the AgentCore CLI deploys: the runtime from agentcore/agentcore.json, a Cognito user pool that signs in
 * the web frontend and authorizes its calls to the runtime, a sandboxed Code Interpreter, and a private bucket for
 * the files the agent creates.
 */
export class AgentCoreStack extends Stack {
  public readonly application: AgentCoreApplication

  constructor(scope: Construct, id: string, props: AgentCoreStackProps) {
    super(scope, id, props)
    this.application = new AgentCoreApplication(this, 'Application', props.application)

    // After `agentcore remove all` the project has no runtime and the stack must be empty so the CLI can delete it.
    const runtime = this.application.runtimes.get('agent')
    if (!runtime) return

    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000'

    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      removalPolicy: RemovalPolicy.DESTROY,
    })
    const domain = userPool.addDomain('Domain', {
      cognitoDomain: { domainPrefix: `data-analyzer-${this.account}` },
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    })
    const client = userPool.addClient('WebClient', {
      generateSecret: false,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: [`${frontendUrl}/callback`],
        logoutUrls: [frontendUrl],
      },
    })
    new cognito.CfnManagedLoginBranding(this, 'ManagedLoginBranding', {
      userPoolId: userPool.userPoolId,
      clientId: client.userPoolClientId,
      useCognitoProvidedValues: true,
    })

    // agentcore.json can't name a pool created in this stack, so the runtime's JWT authorizer is set on the
    // underlying CloudFormation resource.
    const cfnRuntime = runtime.resource.node.defaultChild as agentcore.CfnRuntime
    cfnRuntime.authorizerConfiguration = {
      customJwtAuthorizer: {
        discoveryUrl: `${userPool.userPoolProviderUrl}/.well-known/openid-configuration`,
        allowedClients: [client.userPoolClientId],
      },
    }

    const codeInterpreter = new agentcore.CodeInterpreterCustom(this, 'CodeInterpreter', {
      networkConfiguration: agentcore.CodeInterpreterNetworkConfiguration.usingSandboxNetwork(),
    })
    codeInterpreter.grantUse(runtime)
    runtime.addEnvironmentVariable('CODE_INTERPRETER_ID', codeInterpreter.codeInterpreterId)

    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [{ expiration: Duration.days(7) }],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })
    artifactBucket.grantPut(runtime)
    artifactBucket.grantRead(runtime)
    runtime.addEnvironmentVariable('ARTIFACT_BUCKET', artifactBucket.bucketName)

    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId })
    new CfnOutput(this, 'ClientId', { value: client.userPoolClientId })
    new CfnOutput(this, 'RuntimeUrl', { value: runtime.invocationUrl })
    new CfnOutput(this, 'CognitoDomain', { value: domain.baseUrl() })
    new CfnOutput(this, 'CodeInterpreterId', { value: codeInterpreter.codeInterpreterId })
    new CfnOutput(this, 'ArtifactBucketName', { value: artifactBucket.bucketName })
  }
}
