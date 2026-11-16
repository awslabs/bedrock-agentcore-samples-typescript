import { AgentCoreApplication, type AgentCoreApplicationProps } from '@aws/agentcore-cdk'
import { Stack, type StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'

export interface AgentCoreStackProps extends StackProps {
  /** Props for the AgentCore application, produced by transformAgentCoreJson from agentcore/agentcore.json. */
  application: AgentCoreApplicationProps
}

/** The stack the AgentCore CLI deploys, with permission for the runtime to use the AWS-managed Browser. */
export class AgentCoreStack extends Stack {
  public readonly application: AgentCoreApplication

  constructor(scope: Construct, id: string, props: AgentCoreStackProps) {
    super(scope, id, props)
    this.application = new AgentCoreApplication(this, 'Application', props.application)

    const runtime = this.application.runtimes.get('agent')
    // After `agentcore remove all` there is no runtime, and an empty stack lets the CLI delete it
    if (!runtime) return

    // The runtime role can call Bedrock models but not the AWS-managed Browser the agent's tools use
    runtime.grant(
      [
        'bedrock-agentcore:StartBrowserSession',
        'bedrock-agentcore:ConnectBrowserAutomationStream',
        'bedrock-agentcore:StopBrowserSession',
      ],
      [`arn:${this.partition}:bedrock-agentcore:${this.region}:aws:browser/aws.browser.v1`]
    )
  }
}
