import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { z } from 'zod'

const warrantyAgent = new Agent({
  name: 'warranty_agent',
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  systemPrompt: `You are a warranty specialist. You help customers check warranty status and explain warranty policies.
Always be professional and provide clear information about warranty coverage.`,
  tools: [
    tool({
      name: 'check_warranty',
      description: 'Check warranty status for a product by serial number',
      inputSchema: z.object({
        serialNumber: z.string().describe('Product serial number'),
      }),
      callback: ({ serialNumber }) => {
        const warranties: Record<string, { status: string; expiresAt: string; product: string }> = {
          MNO33333333: { status: 'active', expiresAt: '2025-12-31', product: 'Gaming Console Pro' },
          ABC12345678: { status: 'expired', expiresAt: '2024-01-15', product: 'Smart Watch Series X' },
        }
        const warranty = warranties[serialNumber]
        if (!warranty) return { found: false, message: 'No warranty found for this serial number' }
        return { found: true, ...warranty }
      },
    }),
  ],
})

const techSupportAgent = new Agent({
  name: 'tech_support_agent',
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  systemPrompt: `You are a technical support specialist. You help customers troubleshoot device issues.
Provide step-by-step guidance and ask clarifying questions when needed.`,
  tools: [
    tool({
      name: 'get_troubleshooting_guide',
      description: 'Get troubleshooting steps for a specific issue',
      inputSchema: z.object({
        _product: z.string().describe('Product name'),
        issue: z.string().describe('Issue description'),
      }),
      callback: ({ _product, issue }) => {
        if (issue.toLowerCase().includes('overheat')) {
          return {
            steps: [
              '1. Turn off the device and unplug it',
              '2. Let it cool for 30 minutes',
              '3. Check ventilation - ensure vents are not blocked',
              '4. Clean dust from vents with compressed air',
              '5. Restart and monitor temperature',
            ],
            warning: 'If overheating persists, contact support for repair options.',
          }
        }
        return { steps: ['Please describe your issue in more detail.'] }
      },
    }),
  ],
})

const schedulingAgent = new Agent({
  name: 'scheduling_agent',
  model: new BedrockModel({
    modelId: 'global.amazon.nova-2-lite-v1:0',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
  }),
  systemPrompt: 'You are a scheduling assistant. You help customers schedule support calls and appointments.',
  tools: [
    tool({
      name: 'create_appointment',
      description: 'Schedule a support appointment',
      inputSchema: z.object({
        reason: z.string().describe('Reason for appointment'),
        preferredDate: z.string().optional().describe('Preferred date (YYYY-MM-DD)'),
      }),
      callback: ({ reason, preferredDate }) => {
        const date = preferredDate || new Date(Date.now() + 86400000).toISOString().split('T')[0]
        return {
          confirmed: true,
          appointmentId: `APT-${Date.now()}`,
          date,
          time: '10:00 AM',
          reason,
        }
      },
    }),
    tool({
      name: 'get_available_slots',
      description: 'Get available appointment slots',
      inputSchema: z.object({}),
      callback: () => ({
        slots: [
          { date: '2026-01-20', times: ['9:00 AM', '11:00 AM', '2:00 PM'] },
          { date: '2026-01-21', times: ['10:00 AM', '1:00 PM', '4:00 PM'] },
        ],
      }),
    }),
  ],
})

export const warrantyTool = tool({
  name: 'warranty_specialist',
  description:
    'Handles warranty checks and warranty policy questions. Use for serial number lookups and warranty status.',
  inputSchema: z.object({
    query: z.string().describe('The warranty-related question or request'),
  }),
  callback: async ({ query }) => {
    const result = await warrantyAgent.invoke(query)
    return result.message?.content?.[0]?.text ?? result.output ?? String(result)
  },
})

export const techSupportTool = tool({
  name: 'tech_support_specialist',
  description: 'Handles technical issues and troubleshooting. Use for device problems, errors, and technical guidance.',
  inputSchema: z.object({
    query: z.string().describe('The technical issue or troubleshooting request'),
  }),
  callback: async ({ query }) => {
    const result = await techSupportAgent.invoke(query)
    return result.message?.content?.[0]?.text ?? result.output ?? String(result)
  },
})

export const schedulingTool = tool({
  name: 'scheduling_specialist',
  description: 'Handles appointment scheduling and calendar management. Use for booking support calls.',
  inputSchema: z.object({
    query: z.string().describe('The scheduling request'),
  }),
  callback: async ({ query }) => {
    const result = await schedulingAgent.invoke(query)
    return result.message?.content?.[0]?.text ?? result.output ?? String(result)
  },
})

export const specialistTools = [warrantyTool, techSupportTool, schedulingTool]
