import { Agent, BedrockModel, tool, type JSONValue } from '@strands-agents/sdk'
import { z } from 'zod'

const warrantyExpiryBySerial: Record<string, { product: string; expiresAt: string }> = {
  MNO33333333: { product: 'Gaming Console Pro', expiresAt: '2027-12-31' },
  ABC12345678: { product: 'Smart Watch Series X', expiresAt: '2024-01-15' },
}

function daysFromToday(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
}

const checkWarranty = tool({
  name: 'checkWarranty',
  description: 'Check warranty status for a product by serial number',
  inputSchema: z.object({
    serialNumber: z.string().describe('Product serial number'),
  }),
  callback: ({ serialNumber }): JSONValue => {
    const warranty = warrantyExpiryBySerial[serialNumber]
    if (!warranty) return { found: false, message: 'No warranty found for this serial number' }
    const status = warranty.expiresAt >= daysFromToday(0) ? 'active' : 'expired'
    return { found: true, status, ...warranty }
  },
})

const getTroubleshootingGuide = tool({
  name: 'getTroubleshootingGuide',
  description: 'Get troubleshooting steps for a specific issue',
  inputSchema: z.object({
    product: z.string().describe('Product name'),
    issue: z.string().describe('Issue description'),
  }),
  callback: ({ product, issue }): JSONValue => {
    if (!issue.toLowerCase().includes('overheat')) {
      return { product, steps: ['Please describe your issue in more detail.'] }
    }
    return {
      product,
      steps: [
        '1. Turn off the device and unplug it',
        '2. Let it cool for 30 minutes',
        '3. Check ventilation - ensure vents are not blocked',
        '4. Clean dust from vents with compressed air',
        '5. Restart and monitor temperature',
      ],
      warning: 'If overheating persists, contact support for repair options.',
    }
  },
})

const getAvailableSlots = tool({
  name: 'getAvailableSlots',
  description: 'Get available appointment slots',
  inputSchema: z.object({}),
  callback: (): JSONValue => ({
    slots: [
      { date: daysFromToday(1), times: ['9:00 AM', '11:00 AM', '2:00 PM'] },
      { date: daysFromToday(2), times: ['10:00 AM', '1:00 PM', '4:00 PM'] },
    ],
  }),
})

const createAppointment = tool({
  name: 'createAppointment',
  description: 'Schedule a support appointment',
  inputSchema: z.object({
    reason: z.string().describe('Reason for appointment'),
    date: z.string().optional().describe('Appointment date (YYYY-MM-DD)'),
    time: z.string().optional().describe('Appointment time, e.g. 10:00 AM'),
  }),
  callback: ({ reason, date, time }): JSONValue => ({
    confirmed: true,
    appointmentId: `APT-${Date.now()}`,
    date: date ?? daysFromToday(1),
    time: time ?? '10:00 AM',
    reason,
  }),
})

export function createSpecialists(model: BedrockModel): Agent[] {
  return [
    new Agent({
      name: 'warrantySpecialist',
      description: 'Checks warranty status by serial number and answers warranty policy questions.',
      model,
      systemPrompt:
        'You are a warranty specialist. Check warranty status and explain coverage clearly and professionally.',
      tools: [checkWarranty],
    }),
    new Agent({
      name: 'techSupportSpecialist',
      description: 'Troubleshoots device problems with step-by-step guidance.',
      model,
      systemPrompt: 'You are a technical support specialist. Give step-by-step troubleshooting guidance.',
      tools: [getTroubleshootingGuide],
    }),
    new Agent({
      name: 'schedulingSpecialist',
      description: 'Lists available slots and books support appointments.',
      model,
      systemPrompt: 'You are a scheduling assistant. Help customers find a slot and book support appointments.',
      tools: [getAvailableSlots, createAppointment],
    }),
  ]
}
