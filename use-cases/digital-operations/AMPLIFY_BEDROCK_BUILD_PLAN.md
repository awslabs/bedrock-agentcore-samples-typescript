# AWS Amplify Gen2 + Amazon Bedrock Integration Build Plan

## Overview

This document outlines the implementation plan for integrating your existing Next.js chatbot application with AWS Amplify Gen2 for authentication and Amazon Bedrock for LLM capabilities.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Existing Components (@ai-sdk/react)                       │ │
│  │  - Conversation UI                                         │ │
│  │  - Message components                                      │ │
│  │  - Chat interface                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   AWS Amplify Gen2 (Auth)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Amazon Cognito User Pool                                  │ │
│  │  - User registration/login                                 │ │
│  │  - Password management                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Amazon Cognito Identity Pool                              │ │
│  │  - Exchange tokens for AWS credentials                     │ │
│  │  - Temporary credentials (via STS)                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    IAM Role (Assumed by Users)                  │
│  Policies:                                                      │
│  - bedrock:InvokeModel                                          │
│  - bedrock:InvokeModelWithResponseStream                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Amazon Bedrock                             │
│  - Claude models                                                │
│  - Other foundation models                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. AWS Account Setup

- [ x] AWS Account with appropriate permissions
- [ x] AWS CLI configured locally
- [ x] Node.js 18+ installed
- [ x] npm/pnpm/yarn installed

### 2. Amazon Bedrock Access

- [ x] Enable model access in Amazon Bedrock console
- [ x] Choose region (e.g., us-east-1, us-west-2)
- [ x] Enable at least one model (e.g., Claude 3 Sonnet)

### 3. Development Tools

- [ x] AWS Amplify CLI: `npm install -g @aws-amplify/cli`
- [ ]x AWS CDK (if using custom resources)

## Implementation Steps

### Phase 1: Install Dependencies

```bash
# AWS Amplify packages
npm install aws-amplify @aws-amplify/ui-react

# AWS SDK for Bedrock (if using direct integration)
npm install @aws-sdk/client-bedrock-runtime @aws-sdk/credential-providers

# AI SDK Bedrock provider (if using this approach)
npm install @ai-sdk/amazon-bedrock
```

### Phase 2: Initialize Amplify Gen2

#### 2.1 Create Amplify Backend

Create `amplify/backend.ts`:

```typescript
import { defineBackend } from '@aws-amplify/backend'
import { auth } from './auth/resource'
import { data } from './data/resource'

const backend = defineBackend({
  auth,
  data,
})

// Add custom Bedrock permissions to authenticated users
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
    resources: [
      // Specific model ARN or use * for all models
      `arn:aws:bedrock:${backend.stack.region}::foundation-model/*`,
    ],
  })
)
```

#### 2.2 Configure Authentication

Create `amplify/auth/resource.ts`:

```typescript
import { defineAuth } from '@aws-amplify/backend'

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
  },
})
```

#### 2.3 Configure Data (Optional - for conversation history)

Create `amplify/data/resource.ts`:

```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const schema = a.schema({
  Conversation: a
    .model({
      userId: a.string().required(),
      messages: a.json(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),
})

export type Schema = ClientSchema<typeof schema>
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})
```

### Phase 3: Frontend Integration

#### 3.1 Configure Amplify in Your App

Create `src/lib/amplify-config.ts`:

```typescript
import { Amplify } from 'aws-amplify'
import outputs from '@/amplify_outputs.json'

Amplify.configure(outputs)

export default Amplify
```

Update `src/app/layout.tsx`:

```typescript
import './amplify-config';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Authenticator>
          {children}
        </Authenticator>
      </body>
    </html>
  );
}
```

#### 3.2 Option A: Using @ai-sdk/amazon-bedrock Provider

Create `src/lib/bedrock-client.ts`:

```typescript
import { bedrock } from '@ai-sdk/amazon-bedrock'
import { fetchAuthSession } from 'aws-amplify/auth'

export async function getBedrockModel(modelId: string = 'anthropic.claude-3-sonnet-20240229-v1:0') {
  // Get temporary AWS credentials from Cognito
  const session = await fetchAuthSession()

  if (!session.credentials) {
    throw new Error('No credentials available')
  }

  // Create Bedrock model with Cognito credentials
  return bedrock(modelId, {
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: session.credentials.accessKeyId,
      secretAccessKey: session.credentials.secretAccessKey,
      sessionToken: session.credentials.sessionToken,
    },
  })
}
```

Create API route `src/app/api/chat/route.ts`:

```typescript
import { streamText } from 'ai'
import { getBedrockModel } from '@/lib/bedrock-client'

export async function POST(req: Request) {
  const { messages } = await req.json()

  try {
    const model = await getBedrockModel()

    const result = streamText({
      model,
      messages,
      maxTokens: 2048,
      temperature: 0.7,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Bedrock error:', error)
    return new Response('Error calling Bedrock', { status: 500 })
  }
}
```

Use in your components:

```typescript
'use client';

import { useChat } from '@ai-sdk/react';

export default function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

#### 3.3 Option B: Direct AWS SDK Integration

Create `src/lib/bedrock-direct.ts`:

```typescript
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime'
import { fetchAuthSession } from 'aws-amplify/auth'

export async function streamBedrockResponse(
  messages: Array<{ role: string; content: string }>,
  modelId: string = 'anthropic.claude-3-sonnet-20240229-v1:0'
) {
  const session = await fetchAuthSession()

  if (!session.credentials) {
    throw new Error('No credentials available')
  }

  const client = new BedrockRuntimeClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: session.credentials,
  })

  // Format for Claude
  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n\n')

  const command = new InvokeModelWithResponseStreamCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      messages: messages,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  })

  const response = await client.send(command)

  // Return streaming response
  return response.body
}
```

### Phase 4: Environment Configuration

Create `.env.local`:

```env
# AWS Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1

# Optional: Specific model IDs
NEXT_PUBLIC_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

Add to `.gitignore`:

```
# Amplify
amplify_outputs.json
.amplify/
```

### Phase 5: IAM Policy Configuration

The IAM role attached to your Cognito Identity Pool needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
      ]
    }
  ]
}
```

**Security Best Practices:**

- Use least privilege principle
- Specify exact model ARNs instead of wildcards
- Consider adding conditions for IP restrictions
- Implement rate limiting at the API level
- Monitor usage with CloudWatch

### Phase 6: Deployment

#### 6.1 Local Development

```bash
# Start Amplify sandbox
npx ampx sandbox

# In another terminal, start Next.js dev server
npm run dev
```

#### 6.2 Production Deployment

```bash
# Deploy Amplify backend
npx ampx pipeline-deploy --branch main --app-id <your-app-id>

# Deploy Next.js to Amplify Hosting (via GitHub)
# Or use Vercel with Amplify backend
```

## Testing Plan

### 1. Authentication Testing

- [ ] User can sign up with email
- [ ] User can sign in
- [ ] User receives temporary AWS credentials
- [ ] Credentials expire appropriately
- [ ] Sign out clears credentials

### 2. Bedrock Integration Testing

- [ ] Chat messages are sent to Bedrock
- [ ] Responses stream correctly
- [ ] Error handling works properly
- [ ] Different models can be selected
- [ ] Token limits are respected

### 3. Security Testing

- [ ] Unauthenticated users cannot access Bedrock
- [ ] Credentials are not exposed in browser
- [ ] API endpoints require authentication
- [ ] CORS is configured correctly

## Code Migration Strategy

### Minimal Changes Approach

If you want to keep your existing `@ai-sdk/react` components with minimal changes:

1. **Keep your existing components** in `src/components/ai-elements/`
2. **Only modify the API route** to use Bedrock with Cognito credentials
3. **Add authentication wrapper** around your main app
4. **Configure environment** for AWS region and model IDs

### What Changes:

- `src/app/layout.tsx` - Add Authenticator
- `src/app/api/chat/route.ts` - New file for Bedrock integration
- `amplify/` - New directory for backend config
- Environment variables for AWS configuration

### What Stays the Same:

- All your UI components
- Chat flow and UX
- Styling and design
- Component architecture

## Cost Considerations

### Amazon Bedrock Pricing (example for Claude 3 Sonnet)

- Input: ~$0.003 per 1K tokens
- Output: ~$0.015 per 1K tokens

### AWS Amplify Gen2

- Authentication: First 50K MAU free, then $0.0055/MAU
- Hosting: Pay for build minutes and bandwidth

### Estimated Monthly Cost (low usage)

- 1,000 conversations/month
- Average 1K tokens input, 500 tokens output per conversation
- ~$10-20/month for Bedrock
- ~$0-5/month for Amplify (within free tier)

## Security Checklist

- [ ] Enable MFA for Cognito users
- [ ] Use least privilege IAM policies
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Enable CloudWatch logging
- [ ] Set up AWS WAF for API Gateway (if needed)
- [ ] Use environment variables for sensitive config
- [ ] Implement CORS properly
- [ ] Add request timeouts
- [ ] Monitor token usage

## Troubleshooting Common Issues

### Issue: "No credentials available"

**Solution:** Ensure user is authenticated and Identity Pool is configured

### Issue: "Access Denied calling Bedrock"

**Solution:** Check IAM role permissions attached to Identity Pool

### Issue: "Model not found"

**Solution:** Verify model access is enabled in Bedrock console

### Issue: "CORS errors"

**Solution:** Configure API Gateway CORS or Next.js API route CORS headers

## Alternative Approaches

### Approach 1: Vercel AI SDK + Bedrock Provider (Recommended)

**Pros:**

- Minimal code changes
- Keeps existing UI components
- Type-safe
- Streaming support built-in

**Cons:**

- Depends on third-party package
- May lag behind Bedrock features

### Approach 2: Direct AWS SDK Integration

**Pros:**

- Full control over Bedrock API
- No extra dependencies
- Access to all Bedrock features immediately

**Cons:**

- More code to write
- Handle streaming manually
- More complex error handling

### Approach 3: Hybrid (API Gateway + Lambda)

**Pros:**

- Better for complex workflows
- Can add caching/rate limiting
- Centralized logging

**Cons:**

- More infrastructure
- Additional latency
- More complex to maintain

## Recommended Implementation Path

Given your existing setup with `@ai-sdk/react`, I recommend **Approach 1**:

1. Install Amplify Gen2 for authentication
2. Use `@ai-sdk/amazon-bedrock` provider
3. Keep all existing UI components
4. Only modify the API route and add auth wrapper

This gives you the fastest path to production with minimal disruption to your existing codebase.

## Next Steps

1. **Initialize Amplify in your project**

   ```bash
   npm create amplify@latest
   ```

2. **Configure authentication** following Phase 2 steps above

3. **Test authentication flow** locally

4. **Integrate Bedrock** with one of the approaches above

5. **Test end-to-end** chat functionality

6. **Deploy to production**

## Resources

### Documentation

- [AWS Amplify Gen2 Docs](https://docs.amplify.aws/gen2/)
- [Amazon Bedrock User Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/)
- [Cognito Developer Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/)
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)

### Example Projects

- [AWS Amplify Social Room](https://github.com/aws-samples/amplify-social-room)
- [Bedrock + Cognito Chat UI](https://github.com/aws-solutions-library-samples/guidance-for-a-secure-chat-user-interface-for-amazon-bedrock)
- [Amplify AI Examples](https://github.com/aws-samples/amplify-ai-examples)

### AWS SDK References

- [@ai-sdk/amazon-bedrock](https://www.npmjs.com/package/@ai-sdk/amazon-bedrock)
- [@aws-sdk/client-bedrock-runtime](https://www.npmjs.com/package/@aws-sdk/client-bedrock-runtime)
- [aws-amplify](https://www.npmjs.com/package/aws-amplify)

## Questions to Consider

Before implementation, decide on:

1. **Which AWS region** will you deploy to?
2. **Which Bedrock models** do you want to support?
3. **Do you need conversation history** storage?
4. **What's your authentication flow** (email only, social providers)?
5. **Do you need multi-region** support?
6. **What's your rate limiting** strategy?

## Support and Community

- [AWS Amplify Discord](https://discord.gg/amplify)
- [AWS re:Post](https://repost.aws/)
- [GitHub Issues for Amplify](https://github.com/aws-amplify/amplify-js/issues)

---

**Document Version:** 1.0  
**Last Updated:** November 6, 2025  
**Status:** Ready for implementation
