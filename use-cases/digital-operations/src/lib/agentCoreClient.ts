import { fetchAuthSession } from 'aws-amplify/auth'
import { loadOutputs } from '@/../utils/amplifyUtils'

let outputs: any = null

const getOutputs = () => {
  if (!outputs) {
    outputs = loadOutputs()
  }
  if (!outputs) {
    throw new Error('amplify_outputs.json not found')
  }
  return outputs
}

/**
 * Get the AgentCore Runtime endpoint URL for the agent
 * @param agentArnKey - The key in outputs.custom that contains the agent ARN
 * @returns The full AgentCore endpoint URL
 */
export function getAgentCoreUrl(agentArnKey: string = 'agentServerAgentArn'): string {
  const outputs = getOutputs()
  const agentArn = outputs.custom[agentArnKey]

  //   console.log({agentArn})

  if (!agentArn) {
    throw new Error(`Agent ARN not found in outputs.custom.${agentArnKey}`)
  }

  // URL encode the ARN (replace : with %3A and / with %2F)
  const encodedArn = agentArn.replace(/:/g, '%3A').replace(/\//g, '%2F')

  // Construct the AgentCore endpoint URL
  const url = `https://bedrock-agentcore.${outputs.auth.aws_region}.amazonaws.com/runtimes/${encodedArn}/invocations?qualifier=DEFAULT`

  //   console.log({agentCoreAgentUrl: url})
  return url
}

/**
 * Get authentication headers for AgentCore requests
 * Uses Cognito access token for Bearer authentication
 * @returns Headers object with Authorization and Content-Type
 */
export async function getAgentCoreHeaders(): Promise<Record<string, string>> {
  const { tokens } = await fetchAuthSession()

  if (!tokens?.accessToken) {
    throw new Error('No access token available. User may not be authenticated.')
  }

  return {
    Authorization: `Bearer ${tokens.accessToken.toString()}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Check if the agent ARN is configured in Amplify outputs
 * @param agentArnKey - The key in outputs.custom that contains the agent ARN
 * @returns Boolean indicating if the agent ARN is configured
 */
export function isAgentConfigured(agentArnKey: string = 'agentServerAgentArn'): boolean {
  return Boolean(outputs.custom?.[agentArnKey])
}
