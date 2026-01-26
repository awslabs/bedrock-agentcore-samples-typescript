# Work Order Draft & Approval Flow

This document describes how the work order draft and approval system works in the SAFE-AI application.

## Overview

When users request to create a work order, the AI first presents a draft for approval rather than creating it immediately. This gives users control over what gets created in the system.

## Architecture

### Components

1. **Backend Tools** (`amplify/agent/server/src/tools/mutationTools.ts`)
   - `draft-work-order`: Creates a draft for user approval
   - `create-work-order`: Actually creates the work order after approval

2. **UI Component** (`src/components/ai-elements/work-order-draft.tsx`)
   - Displays the work order draft with all details
   - Provides Approve/Reject buttons
   - Shows status (pending, approved, rejected)

3. **Integration** (`src/components/ChatBox.tsx`)
   - Detects draft-work-order tool calls
   - Renders the WorkOrderDraft component
   - Handles approve/reject actions
   - Manages state for draft statuses

## Flow Diagram

```
User: "Create a work order for equipment repair"
    ↓
AI calls: draft-work-order tool
    ↓
UI displays: WorkOrderDraft component (status: pending)
    ↓
User clicks: "Approve & Create" or "Reject"
    ↓
If Approved:
    - UI status changes to "approved"
    - System sends message to AI with create-work-order details
    - AI calls: create-work-order tool
    - Work order is created in database
    - Success message displayed
    ↓
If Rejected:
    - UI status changes to "rejected"
    - No work order is created
    - User can explain reason or continue conversation
```

## Tool Specifications

### draft-work-order

**Purpose**: Create a draft work order for user review

**Input Parameters**:
- `title` (required): Title/summary of the work order
- `description` (required): Detailed description of work
- `type` (required): EMERGENCY | SCHEDULED | REGULATORY | PREVENTIVE | CORRECTIVE
- `priority` (required): CRITICAL | HIGH | MEDIUM | LOW
- `equipmentId` (optional): ID of equipment
- `digitalTwinAlertId` (optional): ID of alert that triggered this
- `assignedPersonnelId` (optional): ID of assigned personnel
- `estimatedCost` (optional): Estimated cost in dollars
- `estimatedDuration` (optional): Duration (e.g., "2 hours")
- `scheduledStartDate` (optional): ISO format date/time
- `scheduledEndDate` (optional): ISO format date/time
- `requiredResources` (optional): Array of resource strings
- `safetyRequirements` (optional): Array of safety requirement strings

**Output**: 
- Returns draft data with special UI marker
- UI component is automatically rendered

### create-work-order

**Purpose**: Create the actual work order in the database

**Input Parameters**:
- All parameters from draft-work-order, plus:
- `workOrderNumber` (required): Unique work order number (auto-generated)
- `status` (required): Work order status (set to "CREATED")

**Output**:
- Created work order object
- Success/error message

## UI Component Features

### Display Elements

1. **Header**
   - Icon based on work order type
   - Status badge (Draft/Approved/Rejected)
   - Type and priority badges

2. **Details Section**
   - Title and description
   - Estimated cost and duration
   - Scheduled dates
   - Required resources list
   - Safety requirements list

3. **Action Buttons** (only when status is "pending")
   - "Reject" button (outlined, with X icon)
   - "Approve & Create" button (primary, with checkmark icon)

4. **Status Messages**
   - Approved: Green checkmark with success message
   - Rejected: Red X with rejection message

### Color Coding

**Priority Badges**:
- CRITICAL: Red (`bg-red-500`)
- HIGH: Orange (`bg-orange-500`)
- MEDIUM: Yellow (`bg-yellow-500`)
- LOW: Blue (`bg-blue-500`)

**Type Colors**:
- EMERGENCY: Red (`text-red-600`)
- SCHEDULED: Blue (`text-blue-600`)
- REGULATORY: Purple (`text-purple-600`)
- PREVENTIVE: Green (`text-green-600`)
- CORRECTIVE: Orange (`text-orange-600`)

## Implementation Details

### State Management

The ChatBox component maintains draft statuses:

```typescript
const [workOrderDraftStatuses, setWorkOrderDraftStatuses] = useState<
  Record<string, 'pending' | 'approved' | 'rejected'>
>({});
```

Each draft is tracked by a unique key: `${message.id}-${partIndex}`

### Approval Handler

When user clicks "Approve & Create":

1. Generate unique work order number: `WO-${timestamp}`
2. Update draft status to "approved"
3. Send message to AI with create-work-order tool parameters
4. AI automatically calls create-work-order
5. Work order is created in database

### Rejection Handler

When user clicks "Reject":

1. Update draft status to "rejected"
2. No database mutation occurs
3. User can provide feedback or continue conversation

## System Prompt Instructions

The AI is instructed in the system prompt:

```
WORK ORDER CREATION:
- When the user asks you to create a work order, ALWAYS use the 'draft-work-order' tool first
- This will present a draft to the user for approval
- DO NOT use 'create-work-order' directly - that tool is only called automatically after user approval
- The draft will show the user all details and allow them to approve or reject
- After approval, the system will automatically call create-work-order with the approved details
```

## Usage Examples

### Example 1: Creating Emergency Work Order

**User**: "Create an emergency work order for heat exchanger E-1503 repair"

**AI Response**: 
1. Calls `draft-work-order` with:
   - title: "Emergency Repair - Heat Exchanger E-1503"
   - type: "EMERGENCY"
   - priority: "CRITICAL"
   - description: "Immediate repair required..."
   - equipmentId: "..."
   - estimatedCost: 25000
   - estimatedDuration: "8 hours"

2. UI displays draft with all details

3. User clicks "Approve & Create"

4. System creates work order WO-12345678

5. Success message displayed

### Example 2: Rejecting Draft

**User**: "Create a work order for routine maintenance"

**AI Response**: Presents draft

**User Action**: Clicks "Reject"

**Result**: Draft marked as rejected, no work order created

**User**: "Actually, let's schedule that for next week instead"

**AI Response**: Creates new draft with updated scheduling

## Testing the Feature

1. **Start a conversation**
2. **Ask**: "Create an emergency work order for equipment repair"
3. **Verify**: Draft appears with all details
4. **Test Approve**: Click "Approve & Create"
   - Status should change to "approved"
   - Work order should be created
   - Success message should appear
5. **Test Reject**: Create another draft and click "Reject"
   - Status should change to "rejected"
   - No work order should be created

## Future Enhancements

Potential improvements to consider:

1. **Edit Draft**: Allow users to modify draft details before approval
2. **Approval Notes**: Allow users to add notes when approving
3. **Rejection Reasons**: Capture structured rejection reasons
4. **Draft History**: Show history of rejected drafts
5. **Batch Approval**: Approve multiple drafts at once
6. **Notification Integration**: Notify relevant personnel when work orders are created
7. **Template Library**: Pre-fill drafts based on common scenarios

## Troubleshooting

### Draft Not Appearing

- Check that `draft-work-order` tool is registered in server.ts
- Verify AI is using the tool (check tool calls in message parts)
- Ensure WorkOrderDraft component is imported in ChatBox

### Approve Not Working

- Check browser console for errors
- Verify sendMessage is being called with correct parameters
- Check that work order number is being generated
- Verify create-work-order tool is executing

### Styling Issues

- Ensure all icon imports are present
- Check that Badge and Button components are available
- Verify Tailwind classes are configured correctly

## Related Files

- `amplify/agent/server/src/tools/mutationTools.ts` - Backend tools
- `src/components/ai-elements/work-order-draft.tsx` - UI component
- `src/components/ChatBox.tsx` - Integration logic
- `amplify/agent/server/src/server.ts` - System prompt and tool registration
- `amplify/graphql/mutations.ts` - GraphQL mutations
