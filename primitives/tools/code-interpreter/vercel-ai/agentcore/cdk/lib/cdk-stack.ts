import { AgentCoreApplication, type AgentCoreApplicationProps } from '@aws/agentcore-cdk'
import { Stack, type StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'

export interface AgentCoreStackProps extends StackProps {
  /** Props for the AgentCore application, produced by transformAgentCoreJson from agentcore/agentcore.json. */
  application: AgentCoreApplicationProps
}

/**
 * The stack the AgentCore CLI deploys. Everything declared in agentcore/agentcore.json is
 * created by the AgentCoreApplication construct. Add your own resources below it and wire
 * them to your runtimes and harnesses through the application's accessors.
 */
export class AgentCoreStack extends Stack {
  public readonly application: AgentCoreApplication

  constructor(scope: Construct, id: string, props: AgentCoreStackProps) {
    super(scope, id, props)
    this.application = new AgentCoreApplication(this, 'Application', props.application)

    const runtime = this.application.runtimes.get('agent')
    // After `agentcore remove all` the stack must be empty so the CLI can delete it
    if (!runtime) return

    // The runtime role can call Bedrock models but not the AWS-managed Code Interpreter the agent's tools use
    runtime.grant(
      [
        'bedrock-agentcore:StartCodeInterpreterSession',
        'bedrock-agentcore:InvokeCodeInterpreter',
        'bedrock-agentcore:StopCodeInterpreterSession',
      ],
      [`arn:${this.partition}:bedrock-agentcore:${this.region}:aws:code-interpreter/aws.codeinterpreter.v1`]
    )
  }
}
