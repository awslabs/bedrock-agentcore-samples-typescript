# SAFE-AI Demo Guide

This guide walks you through the complete SAFE-AI refinery safety management demonstration, following Firas Toumi through his day as a safety manager.

## Prerequisites

1. **Deploy Backend**: Run `npx ampx sandbox` to deploy the Amplify backend
2. **Start Application**: Run `npm run dev` to start the development server
3. **Create Demo Data**: Navigate to `/demo-setup` and click "Create All Demo Data"
4. **Open Chat**: Navigate to `/chat?id=<your-session-id>` to start the demo

## Demo Structure

The demo is organized into 5 scenes that demonstrate different aspects of refinery safety management throughout a typical day. Each scene showcases specific capabilities of SAFE-AI.

---

## Scene 1: Morning Safety Brief

**Context**: Firas Toumi arrives at the refinery control room for his shift and needs a comprehensive overview of the current safety status.

**What You'll See in Dashboard**:
- 2 active near-miss events in Area 4
- Weather alert for afternoon winds
- 2 active work permits
- 2 fatigued contractors
- Safety metrics showing permit compliance

**Prompt to Use**:
```
SAFE-AI, provide a comprehensive safety status integrating overnight events, current risks, and weather impacts for all planned operations today.
```

**What SAFE-AI Should Cover**:
- Overview of the 2 near-miss incidents in Area 4
- Current weather conditions and afternoon wind warning
- Active work permits and their status
- Personnel concerns (fatigued contractors)
- High-risk areas requiring attention (FCCU Unit, Area 4)
- Recommendations for the day

**Key Observations**:
- Dashboard shows real-time data matching AI's response
- Weather alert is prominent
- Personnel alerts visible for fatigued workers

---

## Scene 2: Critical Decision Point

**Context**: During FCCU unit walkthrough, Firas needs a detailed safety assessment before proceeding with the catalyst changeout operation.

**What You'll See in Dashboard**:
- FCCU Unit marked as CRITICAL risk
- FCCU Catalyst Changeout operation IN_PROGRESS
- Hot work and confined space permits ACTIVE
- Crane lift permit SUSPENDED due to weather
- Fatigued personnel still on site

**Prompt to Use**:
```
SAFE-AI, show me a consolidated safety assessment for the FCCU catalyst changeout, including all permits, personnel readiness, atmospheric conditions, and historical risk factors.
```

**What SAFE-AI Should Cover**:
- Status of the FCCU catalyst changeout operation
- Review of active permits (hot work, confined space)
- Personnel readiness assessment (note fatigued workers)
- Atmospheric conditions and gas monitoring status
- Weather impact on operations
- Recommended controls and precautions

**Expected Actions to Discuss**:
- Suspension of fatigued team members (Bob Wilson, Sarah Johnson)
- Enhanced gas testing protocols
- Verification of isolation points
- Updated Job Safety Analysis
- Additional emergency equipment positioning

---

## Scene 3: Emergency Response Planning

**Context**: Following a safety committee meeting, Firas needs to generate a comprehensive 24-hour risk forecast.

**What You'll See in Dashboard**:
- Current operations status
- Active and suspended permits
- Weather forecast details
- Equipment deployment status
- Safety metrics and trends

**Prompt to Use**:
```
SAFE-AI, generate a complete 24-hour risk forecast analyzing all planned operations, resource availability, and potential emergency scenarios.
```

**What SAFE-AI Should Cover**:
- 24-hour operational forecast
- Critical lifts scheduled (crane operations affected by weather)
- Resource availability assessment
- Potential emergency scenarios based on:
  - Weather conditions (high winds)
  - Fatigued personnel
  - Active high-risk operations
  - Near-miss patterns in Area 4
- Contingency plans for weather delays
- Emergency response team readiness

**Key Planning Items**:
- Rescheduling crane operations around weather window
- Gas monitor deployment strategy
- Emergency response route updates
- Backup power equipment staging
- Shift supervisor briefing requirements

---

## Scene 4: Incident Prevention Analysis

**Context**: During operations review, Firas analyzes safety indicators to identify potential risk patterns and implement preventive actions.

**What You'll See in Dashboard**:
- Safety metrics with trends:
  - 0 Recordable Incidents (STABLE)
  - 15 Safety Observations (POSITIVE trend)
  - 2 Near Miss Reports (ATTENTION_NEEDED)
  - 100% Permit Compliance (STABLE)
- Active events still under investigation
- Personnel status

**Prompt to Use**:
```
SAFE-AI, analyze all leading and lagging safety indicators to identify potential risk patterns and recommend preventive actions.
```

**What SAFE-AI Should Cover**:
- Analysis of leading indicators:
  - Safety observations (positive trend)
  - Near-miss reports (attention needed)
  - Permit compliance (100%)
- Analysis of lagging indicators:
  - Recordable incidents (zero - good)
- Risk pattern identification:
  - Two near-misses in Area 4 (pattern requiring attention)
  - Weather-related operational constraints
  - Fatigue-related risks
- Preventive action recommendations:
  - Safety stand-down in high-risk areas
  - Fast-track critical maintenance
  - Review active safety bypasses
  - Increase supervision in problem areas
  - Launch targeted safety awareness campaign

---

## Scene 5: End of Shift Review

**Context**: As the day shift ends, Firas prepares a comprehensive handover report for the night shift supervisor.

**What You'll See in Dashboard**:
- Summary of all active items
- Updated operation status
- Current permit status
- Personnel alerts
- Safety metrics for the day

**Prompt to Use**:
```
SAFE-AI, prepare a comprehensive handover report highlighting critical safety events, active risks, system status, and priority actions for night shift.
```

**What SAFE-AI Should Cover**:
- Critical Safety Events Summary:
  - Two near-miss investigations ongoing in Area 4
  - Actions taken during the shift
- Active Risks:
  - FCCU catalyst changeout in progress (critical operation)
  - Weather conditions improving (wind subsiding)
  - Fatigued personnel suspended from work
- System Status:
  - All permits properly managed
  - Gas monitoring systems operational
  - Emergency response team ready
- Priority Actions for Night Shift:
  - Continue monitoring FCCU operation
  - Follow up on near-miss investigations
  - Monitor personnel fatigue levels
  - Review weather updates for tomorrow's crane operations
  - Complete scheduled safety checks

**Daily Metrics to Highlight**:
- ✅ Zero recordable incidents
- ✅ 100% permit compliance
- ✅ All emergency responses within target times
- ✅ Complete safety system functionality
- ✅ Five proactive interventions implemented
- ✅ Three potential incidents prevented
- ✅ 100% completion of scheduled safety checks

---

## Additional Demo Prompts

### For Deeper Exploration

**Investigate Specific Event**:
```
Tell me more about the near-miss events in Area 4. What were the root causes and what actions have been taken?
```

**Personnel Management**:
```
What's the status of all personnel currently on site? Are there any fatigue or certification concerns?
```

**Equipment Status**:
```
Show me the status of all safety equipment and gas monitoring systems. Are any inspections due?
```

**Weather Impact**:
```
How will the weather forecast impact our operations over the next 24 hours?
```

**Compliance Check**:
```
Are we in compliance with all permit requirements? Show me any permits that need attention.
```

**Risk Assessment**:
```
Which areas of the refinery currently present the highest risk levels and why?
```

---

## Tips for Effective Demo

1. **Follow the Dashboard**: As you ask questions, observe how the dashboard data supports the AI's responses
2. **Reference Specific Items**: Mention specific permit numbers, personnel names, or area identifiers from the dashboard
3. **Ask Follow-up Questions**: Dig deeper into any concerns raised by SAFE-AI
4. **Simulate Decision Making**: Ask "what if" questions about alternative courses of action
5. **Check Data Refresh**: Use the refresh button on the dashboard to see real-time updates

---

## Troubleshooting

**No Data in Dashboard**:
- Ensure you've created demo data via `/demo-setup`
- Check that the Amplify sandbox is running
- Refresh the page

**AI Not Responding with Expected Detail**:
- Be more specific in your prompts
- Reference specific items from the dashboard (e.g., "the near-miss in Area 4")
- Ask follow-up questions to get more detail

**Dashboard Not Updating**:
- Click the refresh button
- The dashboard auto-refreshes every 10 seconds
- Check browser console for errors

---

## Demo Flow Summary

```
1. Setup (5 min)
   └─ Create demo data at /demo-setup

2. Scene 1: Morning Brief (5 min)
   └─ Get comprehensive safety status
   └─ Review overnight events and weather

3. Scene 2: Critical Decision (5 min)
   └─ Assess FCCU catalyst changeout
   └─ Review permits and personnel readiness

4. Scene 3: Emergency Planning (5 min)
   └─ Generate 24-hour risk forecast
   └─ Plan for weather-impacted operations

5. Scene 4: Incident Prevention (5 min)
   └─ Analyze safety indicators
   └─ Identify risk patterns

6. Scene 5: Shift Handover (5 min)
   └─ Prepare comprehensive handover report
   └─ Review daily metrics

Total Demo Time: ~30 minutes
```

---

## Key Messages

The SAFE-AI demo showcases:

✅ **Comprehensive Integration**: Real-time data from multiple safety systems
✅ **Proactive Risk Management**: Predictive analytics and pattern recognition
✅ **Decision Support**: Contextual recommendations based on multiple factors
✅ **Operational Efficiency**: Streamlined safety processes and reporting
✅ **Compliance**: Automated permit tracking and regulatory adherence
✅ **Communication**: Clear, actionable information for shift handovers

---

## Post-Demo

After completing the demo, you can:
- Clear demo data using the "Clear All Demo Data" button on `/demo-setup`
- Create fresh data for another demo run
- Modify the prompts to explore different scenarios
- Add your own data through the GraphQL API or AWS console
