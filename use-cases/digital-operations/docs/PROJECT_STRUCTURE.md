# Project Structure Guide

This document provides a comprehensive overview of the Digital Operations Agent project structure and explains the purpose of each directory and key files.

## Directory Overview

```
use-cases/digital-operations/
├── amplify/                 # AWS Amplify backend configuration
├── docs/                    # Documentation files
├── public/                  # Static assets
├── scripts/                 # Utility scripts
├── src/                     # Frontend source code
├── utils/                   # Shared utility functions
└── configuration files      # Root-level config files
```

---

## Amplify Backend (`/amplify`)

AWS Amplify Gen 2 backend configuration and infrastructure.

### `/amplify/auth/`

- **`resource.ts`** - Cognito authentication configuration
  - User pool settings
  - Admin-only user creation (self-signup disabled)
  - Password policies

### `/amplify/data/`

- **`resource.ts`** - GraphQL data schema and authorization
  - All data models (ChatSession, MapLayer, WorkoverJob, etc.)
  - Relationships between models
  - Authorization rules
  - **⚠️ Changes here require `npm run sandbox` to redeploy**

### `/amplify/agent/`

AgentCore Runtime agent implementation.

- **`server/`** - Agent server implementation
  - `src/index.ts` - Express server entry point
  - `src/server.ts` - Agent request handler
  - `src/init.ts` - Agent initialization
  - `src/context.ts` - Request context management
  - `src/tools/` - Tool implementations
    - `queryTools.ts` - GraphQL query tools
    - `mutationTools.ts` - GraphQL mutation tools
    - `executeGraphql.ts` - GraphQL execution
    - `amplifyUtils.ts` - Amplify helper functions
  - `Dockerfile` - Container configuration for ARM64
  - `package.json` - Agent dependencies

### `/amplify/mcp/`

Model Context Protocol server (optional integration).

- **`server/`** - MCP server implementation
  - Similar structure to agent server
  - Provides MCP protocol interface
  - Can be used alongside or instead of agent

### `/amplify/functions/`

Lambda functions for backend operations.

- **`athena-query/`** - Athena query execution
  - `handler.ts` - Lambda handler for SQL queries
  - `resource.ts` - Lambda resource definition

### `/amplify/custom/`

Custom CDK constructs and utilities.

- **`agentCoreRuntimeWithBuild.ts`** - AgentCore Runtime deployment
- **`seedData.ts`** - Database seeding
- **`cdkNagHelper.ts`** - CDK Nag security checks

### Root Backend Files

- **`backend.ts`** - Main Amplify backend configuration
  - Imports auth, data, agent, and function resources
  - Configures IAM permissions
  - Defines backend stack

---

## Source Code (`/src`)

Frontend application code built with Next.js 15 and React 19.

### `/src/app/` - Next.js App Router

Application pages and routing structure.

#### `/src/app/(with-layout)/`

Pages that include the main navigation and layout.

- **`layout.tsx`** - Main layout wrapper with navigation
- **`page.tsx`** - Landing page (redirects to chat)
- **`globals.css`** - Global styles and Tailwind configuration

##### `/src/app/(with-layout)/(with-auth)/`

Authenticated routes (require login).

- **`layout.tsx`** - Auth layout wrapper
- **`chat/page.tsx`** - Main chat interface page
- **`map/page.tsx`** - Interactive map viewer page

##### `/src/app/(with-layout)/(without-auth)/`

Public routes (no login required).

#### `/src/app/(without-layout)/`

Pages without the main layout.

---

### `/src/components/` - React Components

#### Core Application Components

- **`ChatBox.tsx`** - Main chat interface component
  - Message rendering
  - Input handling
  - Streaming responses
  - **🎯 Customize chat interface here**

- **`MapViewer.tsx`** - Interactive map component
  - MapLibre GL integration
  - Query-driven layer rendering
  - Real-time layer updates via subscriptions

- **`Navigation.tsx`** - Top navigation bar
- **`UserMenu.tsx`** - User profile dropdown
- **`AmplifyThemeProvider.tsx`** - Theme configuration
- **`ConfigureAmplify.tsx`** - Amplify client setup
- **`Providers.tsx`** - React context providers
- **`UserAttributesProvider.tsx`** - User data context
- **`WithAuth.tsx`** - Authentication wrapper

#### `/src/components/ai-elements/`

Reusable AI-powered UI components.

**Core Chat Components:**

- **`message.tsx`** - Message container and styling
  - `Message` - Wrapper for user/assistant messages
  - `MessageContent` - Message content with variants
  - `MessageAvatar` - User/AI avatars
  - **🎨 Customize message appearance here**

- **`response.tsx`** - AI response renderer
  - Uses Streamdown for markdown rendering
  - **📝 Customize AI message formatting here**

- **`conversation.tsx`** - Chat conversation container
  - Scroll management
  - Auto-scroll to bottom
  - Scroll button

- **`actions.tsx`** - Action buttons (Copy, Retry, etc.)
  - `Actions` - Button container
  - `Action` - Individual action button with tooltip
  - **🔘 Add new message actions here**

**Input Components:**

- **`prompt-input.tsx`** - Chat input system
  - Text input with attachments
  - Model selection
  - Submit handling
  - **⌨️ Customize input behavior here**

**Content Display Components:**

- **`tool.tsx`** - Tool execution display
- **`reasoning.tsx`** - AI reasoning display
- **`sources.tsx`** - Source citations display
- **`code-block.tsx`** - Code syntax highlighting
- **`artifact.tsx`** - Artifact display
- **`image.tsx`** - Image rendering
- **`loader.tsx`** - Loading indicators

**Advanced Components:**

- **`canvas.tsx`** - Canvas rendering
- **`chain-of-thought.tsx`** - Reasoning chains
- **`plan.tsx`** - Plan display
- **`task.tsx`** - Task tracking
- **`confirmation.tsx`** - User confirmations
- **`suggestion.tsx`** - AI suggestions
- **`queue.tsx`** - Message queue
- **`web-preview.tsx`** - Web preview
- **`toolbar.tsx`** - Toolbar components

**Specialized Components:**

- **`branch.tsx`** - Conversation branches
- **`connection.tsx`** - Connection status
- **`context.tsx`** - Context display
- **`controls.tsx`** - Control elements
- **`edge.tsx`** - Graph edges
- **`inline-citation.tsx`** - Inline citations
- **`node.tsx`** - Graph nodes
- **`open-in-chat.tsx`** - Open in chat button
- **`panel.tsx`** - Panel layouts
- **`shimmer.tsx`** - Loading animations

#### `/src/components/ui/`

Base UI components from shadcn/ui.

- **`button.tsx`** - Button component
- **`input.tsx`** - Input fields
- **`card.tsx`** - Card containers
- **`dialog.tsx`** - Modal dialogs
- **`dropdown-menu.tsx`** - Dropdown menus
- **`tooltip.tsx`** - Tooltips
- **`avatar.tsx`** - Avatar display
- **`badge.tsx`** - Badge/tag display
- **`alert.tsx`** - Alert messages
- And more standard UI components...

---

### `/src/lib/` - Utility Functions

- **`utils.ts`** - General utility functions
  - `cn()` - Tailwind class name merging
  - Other helper functions

- **`agentCoreClient.ts`** - AgentCore Runtime client
  - URL construction and authentication
  - Bearer token management

- **`agentCoreTransport.ts`** - Custom transport for useChat
  - Streaming response handling
  - AgentCore protocol implementation

- **`htmlPreprocessing.ts`** - HTML preprocessing for visualizations
  - iframe srcdoc processing
  - Auto-resize script injection

- **`s3Utils.ts`** - S3 utilities for file operations
- **`athenaUtils.ts`** - Athena query utilities
- **`mcpCache.ts`** - MCP cache management (if using MCP)
- **`demoMessages.ts`** - Demo message templates

---

## Utility Functions (`/utils`)

Shared utility functions used across the application.

- **`amplifyUtils.ts`** - Amplify helper functions
- **`chatStore.ts`** - Chat persistence functions
  - `saveChat()` - Save chat messages
  - `loadChat()` - Load chat history
- **`testUtils.ts`** - Testing utilities

---

## Scripts (`/scripts`)

Utility scripts for development and maintenance.

- **`createUser.js`** - Create Cognito users (for sandbox)
- **`runGraphql.ts`** - Execute GraphQL queries
- **`cleanupInvalidMapLayers.ts`** - Clean up invalid map layers

---

## Configuration Files (Root)

### Build & Development

- **`package.json`** - Dependencies and scripts
- **`tsconfig.json`** - TypeScript configuration
- **`next.config.ts`** - Next.js configuration
- **`amplify.yml`** - Amplify hosting build settings

### Styling

- **`tailwind.config.js`** - Tailwind CSS configuration (if exists)
- **`postcss.config.mjs`** - PostCSS configuration
- **`components.json`** - shadcn/ui configuration

### Code Quality

- **`eslint.config.mjs`** - ESLint configuration
- **`.gitignore`** - Git ignore patterns

---

## Key File Relationships

### Chat Flow

```
User Input → ChatBox.tsx
           ↓
           → AgentCore Runtime (amplify/agent/server/)
           ↓
           → Bedrock Model (Nova/Claude)
           ↓
           → GraphQL Tools (query/mutation)
           ↓
           → Amplify Data (amplify/data/)
           ↓
           → Response streamed back to ChatBox.tsx
           ↓
           → Render with ai-elements components
```

### Map Layer Flow

```
Agent creates MapLayer → Amplify Data (DynamoDB)
                      ↓
                      → GraphQL subscription
                      ↓
                      → MapViewer.tsx receives update
                      ↓
                      → Execute Athena query
                      ↓
                      → Convert results to GeoJSON
                      ↓
                      → Render on MapLibre map
```

### Data Flow

```
Data Models (amplify/data/resource.ts)
           ↓
           → Auto-generated GraphQL Schema
           ↓
           → Agent Query Tools (amplify/agent/server/src/tools/)
           ↓
           → Agent accesses via GraphQL
           ↓
           → Frontend displays via components
```

### Authentication Flow

```
User Login → Cognito (amplify/auth/)
          ↓
          → WithAuth.tsx validates
          ↓
          → Bearer token for AgentCore
          ↓
          → Protected routes accessible
          ↓
          → User data in UserAttributesProvider.tsx
```

---

## Important Notes

### When to Redeploy Backend

Run `npm run sandbox` after changes to:

- `amplify/data/resource.ts` (schema changes)
- `amplify/auth/resource.ts` (auth config)
- `amplify/backend.ts` (backend config)
- `amplify/agent/` files (agent server changes)
- `amplify/functions/` files (Lambda changes)

### When to Restart Dev Server

Restart `npm run dev` after changes to:

- Environment variables
- Next.js configuration
- Major dependency updates

### Hot Reload

These changes hot-reload automatically:

- React components in `/src`
- CSS files
- Most TypeScript files

---

## Next Steps

- See [CUSTOMIZATION_GUIDE.md](./CUSTOMIZATION_GUIDE.md) for common customization patterns
- See [AMPLIFY_DEPLOYMENT_GUIDE.md](./AMPLIFY_DEPLOYMENT_GUIDE.md) for deployment instructions
- See [README.md](../README.md) for getting started
