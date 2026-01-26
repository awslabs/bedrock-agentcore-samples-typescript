# SAFE-AI: Refinery Safety Management Demo

This is a demonstration application showcasing an AI-powered safety management system for refinery operations, built with Next.js, AWS Amplify, and AI capabilities.

## Overview

This application demonstrates two key scenarios for AI-enhanced refinery operations:

### 1. Safety Management with SAFE-AI

The "A Day in Refinery Safety Management with SAFE-AI" scenario features five key scenes that demonstrate how AI can enhance safety operations:

1. **Morning Safety Brief** - Comprehensive safety status integration
2. **Critical Decision Point** - FCCU catalyst changeout safety assessment
3. **Emergency Response Planning** - 24-hour risk forecasting
4. **Incident Prevention Analysis** - Safety indicator pattern analysis
5. **End of Shift Review** - Comprehensive handover reporting

### 2. Digital Twin & Predictive Maintenance

The **Digital Twin and Maintenance Management Demo** showcases how AI-powered digital twins can predict equipment failures and optimize maintenance operations:

#### How It Works

1. **Throughput Prediction System**
   - Real-time monitoring of process equipment (compressors, heat exchangers, distillation columns)
   - Each equipment stage has redundant units for reliability (e.g., 3 compressors in parallel)
   - System calculates throughput based on operational equipment capacity
   - Bottleneck detection identifies which stage limits overall system throughput

2. **Failure Prediction & Impact Analysis**
   - Digital twin analyzes equipment health metrics (vibration, temperature, efficiency)
   - Predicts equipment failures with probability and time-to-failure estimates
   - **Automatically calculates throughput impact** when equipment failures are predicted
   - Example: If 1 of 3 compressors fails, throughput drops from 3000 to 2000 barrels/hour

3. **Maintenance Operations Center Dashboard**
   - **Throughput Chart**: Displays historical throughput (past 24 hours) and predicted future throughput (next 48 hours)
   - **Step-down visualization**: When a failure is predicted, the chart shows exactly when and how much throughput will drop
   - Real-time equipment health monitoring with efficiency tracking
   - Active alerts from the digital twin system
   - FLS PAL work orders automatically generated from predictions
   - Budget and resource utilization tracking

4. **Demo Flow**
   - Click "Start Demo" to trigger a critical equipment failure prediction
   - System creates a compressor failure alert predicted to occur in 12 hours
   - Dashboard automatically refreshes and displays:
     - Critical alert with failure details
     - Throughput chart showing the predicted step-down at 12 hours
     - Reduced throughput from 3000 → 2000 barrels/hour
     - Recommended maintenance actions

#### Data Model for Throughput Prediction

The system uses a sophisticated equipment model with redundancy:

```typescript
ProcessEquipment {
  equipmentTag: string           // e.g., "C-401"
  type: enum                     // COMPRESSOR, HEAT_EXCHANGER, etc.
  throughputCapacity: number     // barrels/hour per unit
  quantityAvailable: number      // total units installed
  quantityOperational: number    // currently operational units
  processSequence: number        // position in process flow (1, 2, 3...)
  equipmentGroup: string         // e.g., "COMPRESSION_STAGE"
}

DigitalTwinAlert {
  predictedFailureTime: datetime // when failure will occur
  affectsOperationalCount: bool  // will this take a unit offline?
  failureProbability: number     // 0-1 confidence
  timeToFailure: string         // human-readable estimate
}

ThroughputMeasurement {
  timestamp: datetime
  actualThroughput: number       // barrels/hour
  unit: string                   // "barrels/hour"
}
```

#### Key Features

- **Real-time Throughput Tracking**: Historical data persisted in database
- **Predictive Analytics**: Calculates future throughput based on predicted equipment states
- **Bottleneck Detection**: Identifies which equipment stage limits system capacity
- **Redundancy Modeling**: Accounts for multiple units at each stage
- **Visual Impact Analysis**: Chart clearly shows when and how failures affect production
- **Automated Maintenance Planning**: Work orders generated automatically from predictions
- **Intelligent Work Order Integration**: When the AI agent creates a work order to address a predicted failure, that alert is automatically filtered from throughput calculations - the system assumes the maintenance will prevent the failure, so the predicted throughput remains flat (no step-down shown)

#### Demo Setup

1. Navigate to `/demo-setup` page
2. Click "Create All Demo Data" to populate:
   - Process equipment with throughput capacity (compressors, heat exchangers, columns)
   - 24 hours of historical throughput measurements
   - Equipment health metrics showing trends
   - Personnel and maintenance schedules
3. Return to main dashboard
4. Click "Start Demo" to trigger failure prediction
5. Observe the throughput chart update with predicted step-down


## Data Schema

The application includes a comprehensive data schema to support refinery safety management operations:

### Core Entities

- **Area/Location** - Refinery areas with risk levels and status tracking
- **Personnel** - Staff members with roles, shifts, and fatigue monitoring
- **SafetyEvent** - Near-misses, incidents, observations, and hazards
- **WorkPermit** - Permit management with weather restrictions
- **Weather** - Current conditions and forecasts affecting operations
- **Operation** - Planned and active operations with risk assessments
- **Equipment** - Safety equipment and monitoring devices
- **JobSafetyAnalysis (JSA)** - Risk assessments and control measures
- **EmergencyResponse** - Team assignments and response protocols
- **SafetyIndicator** - Leading and lagging safety metrics
- **MaintenanceItem** - Critical maintenance tracking
- **ShiftHandover** - Shift-to-shift communication
- **SafetyBypass** - Temporary safety system bypasses
- **GasMonitoring** - Real-time atmospheric monitoring

### Key Features

- Many-to-many relationships between Personnel, Operations, Permits, and Events
- Real-time monitoring capabilities for weather and gas detection
- Historical tracking for compliance and trend analysis
- Role-based authorization for different user types

## Technology Stack

- **Frontend**: Next.js 15 with React 19
- **Backend**: AWS Amplify Gen 2
- **Database**: AWS AppSync with DynamoDB
- **Authentication**: AWS Cognito
- **AI Integration**: AI SDK with streaming support
- **UI Components**: shadcn/ui with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS Account with appropriate permissions
- AWS CLI configured
- Docker (for running the sandbox environment)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-chatbot
```

2. Install dependencies:
```bash
npm install
```

### Launching the Development Environment

There are two main commands for running the development environment:

#### Option 1: Run Amplify Sandbox (Recommended)

The sandbox command sets up the complete AWS Amplify backend environment with authentication, database, and all required services:

```bash
npm run sandbox
```

This command will:
1. Authenticate with AWS ECR public registry (for Docker images)
2. Launch the Amplify sandbox environment
3. Deploy backend resources (Auth, Data, API, etc.)
4. Watch for changes and hot-reload

**Note:** Keep this terminal window open while developing. The sandbox will run until you stop it with `Ctrl+C`.

#### Option 2: Run Local Development Server

Once the sandbox is running (in a separate terminal), start the Next.js development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Complete Development Workflow

1. **Start the Amplify Sandbox** (Terminal 1):
   ```bash
   npm run sandbox
   ```
   Wait for the sandbox to fully deploy. You'll see output indicating resources are ready.

2. **Start the Development Server** (Terminal 2):
   ```bash
   npm run dev
   ```

3. **Access the Application**:
   Open [http://localhost:3000](http://localhost:3000) in your browser

4. **Making Changes**:
   - Frontend changes: Hot-reload automatically with `npm run dev`
   - Backend schema changes: Auto-deploy with the sandbox watching
   - Stop both processes with `Ctrl+C` when done

### Alternative: Deploy Backend Separately

If you prefer to deploy the backend separately without using the sandbox command:

```bash
npx ampx sandbox
```

Then run the development server as described above.

## Demo Script

The demo follows the daily routine of Firas Toumi, a refinery safety manager, through five key scenarios. See [docs/script.md](docs/script.md) for the complete script and sample prompts.

### Sample Prompts for Each Scene

**Scene 1 - Morning Safety Brief:**
```
SAFE-AI, provide a comprehensive safety status integrating overnight events, current risks, and weather impacts for all planned operations today.
```

**Scene 2 - Critical Decision Point:**
```
SAFE-AI, show me a consolidated safety assessment for the FCCU catalyst changeout, including all permits, personnel readiness, atmospheric conditions, and historical risk factors.
```

**Scene 3 - Emergency Response Planning:**
```
SAFE-AI, generate a complete 24-hour risk forecast analyzing all planned operations, resource availability, and potential emergency scenarios.
```

**Scene 4 - Incident Prevention Analysis:**
```
SAFE-AI, analyze all leading and lagging safety indicators to identify potential risk patterns and recommend preventive actions.
```

**Scene 5 - End of Shift Review:**
```
SAFE-AI, prepare a comprehensive handover report highlighting critical safety events, active risks, system status, and priority actions for night shift.
```

## Project Structure

```
├── amplify/
│   ├── auth/          # Authentication configuration
│   ├── data/          # Data schema and models
│   ├── mcp/           # Model Context Protocol server
│   └── backend.ts     # Amplify backend configuration
├── docs/
│   └── script.md      # Demo script and scenarios
├── src/
│   ├── app/           # Next.js app router pages
│   ├── components/    # React components
│   │   ├── ai-elements/  # AI-powered UI components
│   │   └── ui/           # Base UI components
│   └── lib/           # Utility functions
└── utils/             # Helper utilities
```

## Data Seeding

To populate the demo with realistic data, you can:

1. Use the AWS AppSync console to create sample records
2. Run the GraphQL mutations through the Amplify client
3. Create a seed script using the provided schema

Example areas to create:
- Area 4 (refinery unit with recent near-misses)
- FCCU Unit (Fluid Catalytic Cracking Unit)
- Control Room
- Storage Tanks

## Key Metrics Tracked

The demo tracks these safety metrics:
- Zero recordable incidents
- 100% permit compliance
- Emergency response times
- Safety system functionality
- Proactive interventions
- Potential incidents prevented
- Scheduled safety check completion

## Authorization

All safety data models use authenticated access:
- `allow.authenticated()` - All authenticated users can CRUD operations
- Role-based permissions can be extended for production use

## Development

### Adding New Models

1. Edit `amplify/data/resource.ts`
2. Add new models following the existing pattern
3. Run `npx ampx sandbox` to deploy changes
4. GraphQL types will be auto-generated

### Customizing Authorization

Update the `.authorization()` rules in the schema to implement custom access control based on user roles.

## Deployment

### Deploy to AWS Amplify

1. Push your code to GitHub
2. Connect your repository in AWS Amplify Console
3. Configure build settings (amplify.yml is included)
4. Deploy automatically on push

### Environment Variables

Configure these in Amplify Console:
- Authentication settings (auto-configured)
- API endpoints (auto-configured)
- Custom AI model configurations (if needed)

## Documentation

### Developer Guides
- **[Plotting and Visualization Guide](docs/PLOTTING_AND_VISUALIZATION_GUIDE.md)** - Complete guide to creating charts and visualizations
- **[Plotting Quick Reference](docs/PLOTTING_QUICK_REFERENCE.md)** - Quick reference for common plotting tasks
- **[Demo Script](docs/script.md)** - Complete demo scenarios and prompts

### Testing
- **HTML Preprocessing Tests**: Run `npx tsx scripts/testHtmlPreprocessing.ts`
- **Test Results**: See `scripts/FIX_SUMMARY.md` for recent fixes

## Learn More

### AWS Amplify
- [AWS Amplify Gen 2 Documentation](https://docs.amplify.aws/)
- [Amplify Data Schema](https://docs.amplify.aws/nextjs/build-a-backend/data/)

### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)

### AI Integration
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

### Visualization
- [Plotly.js Documentation](https://plotly.com/javascript/)


## Integration Notes
- AWS Amplify SSR does not support server side routes using HTTP streaming responses, or timeouts longer than 30 seconds, so the default Vercel AI sdk deployment does not work well.
- The DefaultChatTransport for useChat requires response headers to properly interpreat the message stream, so you need a custom transport which accounts for this to connect to the AgentCore runtime
- AWS Amplify requires an x86 build image, but AgentCore requires ARM64 based images, so you need to use a QEMU emulators to allow for building arm64 images inside the x86 aws amplify environment

## Contributing

This is a demo application. For production use, consider:
- Enhanced error handling
- Comprehensive testing
- Production-grade security
- Performance optimization
- Monitoring and alerting
- Backup and disaster recovery

## License

This project is for demonstration purposes.

## Support

For questions or issues related to this demo, please refer to the documentation or contact your AWS solutions architect.
