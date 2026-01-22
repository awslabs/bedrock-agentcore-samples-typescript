import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as cr from 'aws-cdk-lib/custom-resources'
import { Construct } from 'constructs'

export class CognitoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // User Pool - no self-signup, lenient password policy for dev
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

    // Web client (public, no secret) - for user authentication
    const webClient = userPool.addClient('WebClient', {
      generateSecret: false,
      authFlows: { userPassword: true, userSrp: true },
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

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    })

    new cdk.CfnOutput(this, 'DiscoveryUrl', {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}/.well-known/openid-configuration`,
      description: 'OIDC discovery URL (use in agentcore configure)',
    })

    new cdk.CfnOutput(this, 'ClientId', {
      value: webClient.userPoolClientId,
      description: 'Cognito client ID',
    })

    new cdk.CfnOutput(this, 'TestCredentials', {
      value: 'user@example.com / password',
      description: 'Test user credentials',
    })
  }
}
