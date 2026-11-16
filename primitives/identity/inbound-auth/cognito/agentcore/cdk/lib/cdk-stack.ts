import { AgentCoreApplication, type AgentCoreApplicationProps } from '@aws/agentcore-cdk'
import { CfnOutput, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib'
import { CfnRuntime } from 'aws-cdk-lib/aws-bedrockagentcore'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { Construct } from 'constructs'

export interface AgentCoreStackProps extends StackProps {
  /** Props for the AgentCore application, produced by transformAgentCoreJson from agentcore/agentcore.json. */
  application: AgentCoreApplicationProps
}

/**
 * The stack the AgentCore CLI deploys: the runtime declared in agentcore/agentcore.json, a Cognito
 * user pool, and a JWT authorizer on the runtime that only accepts access tokens from that pool.
 */
export class AgentCoreStack extends Stack {
  public readonly application: AgentCoreApplication

  constructor(scope: Construct, id: string, props: AgentCoreStackProps) {
    super(scope, id, props)
    this.application = new AgentCoreApplication(this, 'Application', props.application)

    // After `agentcore remove all` there is no runtime, and an empty stack tells the CLI to delete it.
    const agent = this.application.runtimes.get('agent')
    if (!agent) return

    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: false,
      removalPolicy: RemovalPolicy.DESTROY,
    })
    const userPoolClient = userPool.addClient('Client', { authFlows: { userPassword: true } })

    // agentcore.json only takes literal URLs, and the pool's id is known only at deploy time,
    // so the authorizer is set on the underlying CloudFormation resource instead.
    const runtime = agent.resource.node.defaultChild as CfnRuntime
    runtime.authorizerConfiguration = {
      customJwtAuthorizer: {
        discoveryUrl: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}/.well-known/openid-configuration`,
        allowedClients: [userPoolClient.userPoolClientId],
      },
    }

    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId })
    new CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId })
  }
}
