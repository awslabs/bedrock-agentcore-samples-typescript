import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { BedrockAgentCoreApp, RequestContext } from 'bedrock-agentcore/runtime'
import { z } from 'zod'

// Request schema
const requestSchema = z.object({
  prompt: z.string(),
})

const calculatorSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
  a: z.number(),
  b: z.number(),
})

const calculator = tool({
  name: 'calculator',
  description: 'Performs basic arithmetic',
  inputSchema: calculatorSchema,
  callback: (input: z.infer<typeof calculatorSchema>): number => {
    const { operation, a, b } = input
    switch (operation) {
      case 'add':
        return a + b
      case 'subtract':
        return a - b
      case 'multiply':
        return a * b
      case 'divide':
        return a / b
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  },
})


const get_user = (context: RequestContext): string => {
  const authorization_jwt = context.headers.authorization;
  
  if (!authorization_jwt) {
    throw new Error('No authorization header provided');
  }
  
  // Remove "Bearer " prefix if present
  const token = authorization_jwt.replace(/^Bearer\s+/i, '');
  
  // JWT has three parts: header.payload.signature
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  
  // Decode the payload (second part)
  const payload = parts[1];
  
  // Base64 decode (handle URL-safe base64)
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
  
  // Parse the JSON payload
  const claims = JSON.parse(jsonPayload);
  
  // Extract the sub claim (user identifier)
  const sub = claims.sub;
  
  if (!sub) {
    throw new Error('No sub claim found in JWT');
  }
  
  return sub;
}

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  tools: [calculator],
  systemPrompt: 'You are a helpful and empathetic assistant.',
});

const app = new BedrockAgentCoreApp({
  config: {
    logging: {
      level: 'warn'
    }
  },
  invocationHandler: {
    requestSchema,
    process: async function* (request, context) {
      console.log("Received request:", request);
      const getUserSub = tool({
        name: 'get_user_sub',
        description: 'obtains the user sub from the authorization header',
        callback: (): string => {
          return get_user(context);
        },
      })
      // Clearing the tools array to rebuild it with a dynamic tool
      // An alternative, but less secure way would have been to store the context variable
      // in a global var. 
     
      agent.toolRegistry.clear();
      
      agent.toolRegistry.add(calculator);
      agent.toolRegistry.add(getUserSub);

      console.log("Calling agent");
      for await (const event of agent.stream(request.prompt)) {
        if (event.type === 'modelContentBlockDeltaEvent' && event.delta?.type === 'textDelta') {
          yield { event: 'message', data: { text: event.delta.text } }
        }
      }
    },
  },
})

app.run()
