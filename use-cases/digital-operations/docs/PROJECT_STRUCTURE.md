# Project Structure Guide

This document provides a comprehensive overview of the SAFE-AI project structure and explains the purpose of each directory and key files.

## Directory Overview

```
ai-chatbot/
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
  - Sign-in/sign-up flows
  - Password policies

### `/amplify/data/`
- **`resource.ts`** - GraphQL data schema and authorization
  - All data models (Area, Personnel, SafetyEvent, etc.)
  - Relationships between models
  - Authorization rules
  - **⚠️ Changes here require `npx ampx sandbox` to redeploy**

### `/amplify/mcp/`
Model Context Protocol server for AI tool integration.

- **`mcpServer.ts`** - MCP server resource definition
- **`server/`** - MCP server implementation
  - `src/index.ts` - Server entry point
  - `src/server.ts` - MCP server configuration
  - `src/tools/` - Tool implementations
    - `queryTools.ts` - Data query tools for AI
    - `executeGraphql.ts` - GraphQL execution
    - `amplifyUtils.ts` - Amplify helper functions
  - `Dockerfile` - Container configuration
  - `QUERY_TOOLS.md` - MCP tools documentation

### Root Backend Files
- **`backend.ts`** - Main Amplify backend configuration
  - Imports auth, data, and MCP resources
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
- **`chats/page.tsx`** - Chat history/list page
- **`demo-setup/page.tsx`** - Demo data creation page
- **`test/page.tsx`** - Testing page

##### `/src/app/(with-layout)/(without-auth)/`
Public routes (no login required).

#### `/src/app/(without-layout)/`
Pages without the main layout.

#### `/src/app/api/`
API route handlers.

- **`chat/route.ts`** - Main chat API endpoint
  - Handles AI message streaming
  - Integrates with MCP tools
  - Manages chat state
- **`chat/warmup/route.ts`** - MCP cache warmup endpoint
  - Pre-loads MCP tools to reduce latency

---

### `/src/components/` - React Components

#### Core Application Components

- **`ChatBox.tsx`** - Main chat interface component
  - Message rendering
  - Input handling
  - Tool result display
  - **🎯 Customize chat interface here**

- **`SafetyDashboard.tsx`** - Safety metrics dashboard
  - Real-time data display
  - Metrics cards
  - Alert indicators

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

- **`mcpCache.ts`** - MCP cache management
  - Tool result caching
  - Performance optimization

---

## Utility Functions (`/utils`)

Shared utility functions used across the application.

- **`amplifyServerUtils.ts`** - Server-side Amplify utilities
- **`amplifyUtils.ts`** - Client-side Amplify utilities
- **`chatStore.ts`** - Chat persistence functions
  - `saveChat()` - Save chat messages
  - `loadChat()` - Load chat history
- **`testUtils.ts`** - Testing utilities

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
           → /api/chat/route.ts
           ↓
           → MCP Server (amplify/mcp/server/)
           ↓
           → GraphQL API (amplify/data/)
           ↓
           → Response back to ChatBox.tsx
           ↓
           → Render with message.tsx, response.tsx, actions.tsx
```

### Data Flow
```
Data Models (amplify/data/resource.ts)
           ↓
           → Auto-generated GraphQL Schema
           ↓
           → MCP Query Tools (amplify/mcp/server/src/tools/)
           ↓
           → AI accesses via chat API
           ↓
           → Dashboard displays (SafetyDashboard.tsx)
```

### Authentication Flow
```
User Login → Cognito (amplify/auth/)
          ↓
          → WithAuth.tsx validates
          ↓
          → Protected routes accessible
          ↓
          → User data in UserAttributesProvider.tsx
```

---

## Important Notes

### When to Redeploy Backend
Run `npx ampx sandbox` after changes to:
- `amplify/data/resource.ts` (schema changes)
- `amplify/auth/resource.ts` (auth config)
- `amplify/backend.ts` (backend config)
- `amplify/mcp/` files (MCP server changes)

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
- See [DEMO_GUIDE.md](./DEMO_GUIDE.md) for demo walkthrough
- See [README.md](../README.md) for getting started
