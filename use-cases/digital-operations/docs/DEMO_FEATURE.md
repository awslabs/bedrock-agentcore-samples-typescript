# Demo Feature Implementation

## Overview
Implemented a demo system that shows alerts in both the chat and dashboard when the user starts a new chat session.

## Features

### 1. Demo Context (`src/contexts/DemoContext.tsx`)
- Manages demo state across components
- Creates demo data including:
  - Heat Exchanger E-1503 with CRITICAL health status
  - Digital Twin Alert with 89% failure probability
  - Equipment health metrics showing declining efficiency (85% → 72%)
  - Vibration metrics showing increasing values (2.5 → 7.5 mm/s)

### 2. Enhanced ChatBox (`src/components/ChatBox.tsx`)
- Shows "Start Demo" button when no messages exist
- On click:
  1. Creates demo data in database
  2. Injects AI assistant message describing the alert
  3. Message includes:
     - Equipment details (E-1503)
     - Alert severity and status
     - Current efficiency (72%)
     - Failure probability (89%)
     - Time to failure (72 hours)
     - Recommended actions
- Button shows loading state while creating demo data

### 3. Auto-Refreshing Dashboard (`src/components/MaintenanceDashboard.tsx`)
- Listens for demo activation
- Automatically refreshes data 1 second after demo starts
- Displays:
  - Critical alert in red-bordered card
  - Equipment in Equipment Health Monitor section
  - Trend data showing declining performance

### 4. Integration (`src/app/(with-layout)/(with-auth)/chat/page.tsx`)
- Wraps page with DemoProvider to share state

## User Flow

1. **Start**: User opens a new chat (no messages)
2. **Action**: User sees "Start Demo" button in center of chat
3. **Click**: User clicks the button
4. **Processing**: 
   - Button shows "Starting Demo..." with spinner
   - System creates equipment and alert data
5. **Result**:
   - AI message appears in chat describing the critical alert
   - Dashboard shows alert in "Digital Twin Alerts" section
   - Equipment appears in "Equipment Health Monitor"
   - Trend charts show declining efficiency and rising vibration

## Demo Data Created

### Equipment
- **Tag**: E-1503
- **Name**: Critical Heat Exchanger
- **Type**: HEAT_EXCHANGER
- **Status**: CRITICAL
- **Efficiency**: 72%

### Alert
- **Title**: "Anomaly detected in Heat Exchanger E-1503"
- **Severity**: CRITICAL
- **Status**: ACTIVE
- **Failure Probability**: 89%
- **Time to Failure**: 72 hours
- **Recommended Actions**:
  1. Reduce flow by 15%
  2. Schedule emergency inspection within 12 hours
  3. Prepare for bearing replacement within 48 hours
  4. Duration: 6-8 hours
  5. Resources: 2 mechanics, 1 instrument tech

### Health Metrics
- **Efficiency metrics** (5 data points over 48 hours): 85% → 72%
- **Vibration metrics** (5 data points over 48 hours): 2.5 → 7.5 mm/s

## Based on Script
The demo follows the script in `docs/script.md`, specifically the "Prologue: The Digital Warning" section where:
- Digital twin detects anomaly in E-1503
- Vibration analysis shows bearing deterioration
- Efficiency at 72% and declining
- 89% probability of failure within 72 hours
- System generates recommended actions

## Technical Details

### State Management
- Uses React Context API for cross-component state
- `isDemoActive` boolean tracks demo state
- `startDemo()` async function creates all demo data
- `resetDemo()` async function cleans up demo data (not currently exposed in UI)

### Database Operations
- Creates/updates records using AWS Amplify Data client
- Checks for existing data to avoid duplicates
- Uses proper relationships (equipment → alerts → metrics)

### Auto-Refresh
- Dashboard uses `useEffect` hook to watch `isDemoActive`
- 1-second delay allows database writes to complete
- Fetches all data after demo activation

## Future Enhancements
- Add "Reset Demo" button to clean up demo data
- Add more demo scenarios (multiple alerts, work orders)
- Animate the alert appearance in dashboard
- Add sound/notification when alert appears
