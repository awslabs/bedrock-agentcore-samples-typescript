# Customization Guide

This guide explains how to customize common aspects of the SAFE-AI application. Each section includes the files to modify and code examples.

## Table of Contents

1. [Chat Interface](#chat-interface)
2. [Message Appearance](#message-appearance)
3. [AI Models](#ai-models)
4. [Data Schema](#data-schema)
5. [Authentication](#authentication)
6. [Dashboard](#dashboard)
7. [Navigation](#navigation)
8. [Styling](#styling)

---

## Chat Interface

### Add Actions to AI Messages

**File:** `src/components/ChatBox.tsx`

**Location:** Around line 220, inside the `case 'text':` block for assistant messages

**Example: Add a "Share" button**

```typescript
{message.role === 'assistant' && (
  <Actions className="mt-2">
    {i === messages.length - 1 && (
      <Action onClick={() => regenerate()} label="Retry">
        <RefreshCcwIcon className="size-3" />
      </Action>
    )}
    <Action
      onClick={() => navigator.clipboard.writeText(part.text)}
      label="Copy"
    >
      <CopyIcon className="size-3" />
    </Action>
    {/* Add new action here */}
    <Action
      onClick={() => handleShare(part.text)}
      label="Share"
    >
      <ShareIcon className="size-3" />
    </Action>
  </Actions>
)}
```

Don't forget to:
1. Import the icon: `import { ShareIcon } from 'lucide-react';`
2. Create the handler function: `const handleShare = (text: string) => { /* logic */ }`

### Customize Input Placeholder

**File:** `src/components/ai-elements/prompt-input.tsx`

**Location:** In the `PromptInputTextarea` component

```typescript
<textarea
  placeholder="Ask SAFE-AI about safety operations..." // Change this
  // ... other props
/>
```


---

## AI Models

### Add or Remove Models

**File:** `src/components/ChatBox.tsx`

**Location:** Top of the file, in the `models` array

```typescript
const models: { name: string, id: string }[] = [
  {
    name: 'Claude Haiku 3.5',
    id: 'us.anthropic.claude-3-5-haiku-20241022-v1:0'
  },
  {
    name: 'GPT-4',  // Add new model
    id: 'gpt-4'
  },
  // Remove unwanted models by deleting entries
];
```

### Change Default Model

**File:** `src/components/ChatBox.tsx`

**Location:** In the `useState` initialization

```typescript
const [model, setModel] = useState<string>(models[2].id);  // Change index
// Or use specific model ID:
const [model, setModel] = useState<string>('us.anthropic.claude-sonnet-4-5-20250929-v1:0');
```


---

## Data Schema

### Add a New Data Model

**File:** `amplify/data/resource.ts`

**Example: Add a "Training" model**

```typescript
Training: a
  .model({
    title: a.string().required(),
    description: a.string(),
    scheduledDate: a.datetime().required(),
    completedDate: a.datetime(),
    attendees: a.hasMany('PersonnelTraining', 'trainingId'),
    status: a.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    location: a.string(),
    instructor: a.string(),
    certificationIssued: a.boolean(),
  })
  .authorization((allow) => [allow.authenticated()]),

PersonnelTraining: a
  .model({
    personnelId: a.id().required(),
    personnel: a.belongsTo('Personnel', 'personnelId'),
    trainingId: a.id().required(),
    training: a.belongsTo('Training', 'trainingId'),
    attended: a.boolean(),
    score: a.float(),
  })
  .authorization((allow) => [allow.authenticated()]),
```

**After adding:** Run `npx ampx sandbox` to deploy changes

### Modify Existing Model

**File:** `amplify/data/resource.ts`

**Example: Add a field to Personnel**

```typescript
Personnel: a
  .model({
    // ... existing fields ...
    emergencyContact: a.string(),  // Add new field
    phoneNumber: a.phone(),        // Add another field
  })
  .authorization((allow) => [allow.authenticated()]),
```

### Add Custom Authorization

**File:** `amplify/data/resource.ts`

**Example: Role-based access**

```typescript
SafetyEvent: a
  .model({
    // ... fields ...
  })
  .authorization((allow) => [
    allow.authenticated(),  // All authenticated users can read
    allow.group('SafetyManagers').to(['create', 'update', 'delete']),
    allow.owner(),  // Owners can do everything with their own records
  ]),
```

### Important: Keeping Tools in Sync with Schema Changes

**⚠️ Critical:** When you modify the data schema, you must update multiple files to avoid GraphQL validation errors.

**Step-by-step process:**

1. **Modify the schema** in `amplify/data/resource.ts`
2. **Regenerate GraphQL code**: 
   ```bash
   npx ampx generate graphql-client-code
   ```
3. **Check generated queries** in `amplify/graphql/queries.ts` to see what's available
4. **Update query tools** in both locations:
   - `amplify/agent/server/src/tools/queryTools.ts`
   - `amplify/mcp/server/src/tools/queryTools.ts`
5. **Redeploy**: 
   ```bash
   npx ampx sandbox
   ```

**Common scenarios:**

| Scenario | Required Actions |
|----------|-----------------|
| **Adding a model** | 1. Add to schema<br>2. Regenerate GraphQL<br>3. Add corresponding tool to queryTools.ts<br>4. Export in `allQueryTools` array |
| **Commenting out a model** | 1. Comment in schema<br>2. Regenerate GraphQL<br>3. Remove or comment out its tool<br>4. Remove from `allQueryTools` array |
| **Renaming a model** | 1. Rename in schema<br>2. Regenerate GraphQL<br>3. Update tool name and query references<br>4. Update in `allQueryTools` array |
| **Changing model fields** | 1. Modify in schema<br>2. Regenerate GraphQL<br>3. Update query strings in queryTools.ts if needed |

**Example: Adding a tool for a new model**

After adding a `Training` model and regenerating GraphQL:

```typescript
// In queryTools.ts, add the query string
const queries = {
  // ... existing queries ...
  listTrainings: `query ListTrainings(
    $filter: ModelTrainingFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listTrainings(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        scheduledDate
        status
        __typename
      }
      nextToken
      __typename
    }
  }`,
};

// Create the tool
export const listTrainingsTool = createListTool(
  "list-trainings",
  "List all training sessions. Returns training details including title, date, and status.",
  queries.listTrainings
);

// Add to exports
export const allQueryTools = [
  // ... existing tools ...
  listTrainingsTool,  // Add here
];
```

**Warning signs of sync issues:**
- ❌ `GraphQL validation error: Field 'listXXX' in type 'Query' is undefined`
- ❌ `Field undefined` errors when calling tools
- ❌ TypeScript errors in queryTools.ts after schema changes

These indicate tools are referencing queries that no longer exist in the generated schema.

---


---

## Dashboard

### Customize Dashboard Metrics

**File:** `src/components/SafetyDashboard.tsx`

**Location:** Modify the metrics displayed

```typescript
// Add a new metric card
<Card>
  <CardHeader>
    <CardTitle>New Metric</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">
      {/* Your metric value */}
    </div>
  </CardContent>
</Card>
```

### Change Refresh Interval

**File:** `src/components/SafetyDashboard.tsx`

**Location:** In the `useEffect` hook

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    loadData();
  }, 5000);  // Change from 10000 (10s) to 5000 (5s) or any value
  
  return () => clearInterval(interval);
}, []);
```

### Add Custom Data Visualization

**File:** `src/components/SafetyDashboard.tsx`

**Example: Add a chart**

```typescript
import { LineChart, Line, XAxis, YAxis } from 'recharts';

// In your component:
<Card>
  <CardHeader>
    <CardTitle>Safety Trends</CardTitle>
  </CardHeader>
  <CardContent>
    <LineChart width={400} height={200} data={trendData}>
      <XAxis dataKey="date" />
      <YAxis />
      <Line type="monotone" dataKey="incidents" stroke="#8884d8" />
    </LineChart>
  </CardContent>
</Card>
```

---

## Navigation

### Add Navigation Items

**File:** `src/components/Navigation.tsx`

```typescript
<NavigationMenuList>
  <NavigationMenuItem>
    <Link href="/dashboard">Dashboard</Link>
  </NavigationMenuItem>
  <NavigationMenuItem>
    <Link href="/reports">Reports</Link>  {/* Add new item */}
  </NavigationMenuItem>
  {/* ... */}
</NavigationMenuList>
```

### Customize User Menu

**File:** `src/components/UserMenu.tsx`

**Example: Add menu items**

```typescript
<DropdownMenuContent>
  <DropdownMenuItem onClick={handleProfile}>
    Profile
  </DropdownMenuItem>
  <DropdownMenuItem onClick={handleSettings}>
    Settings  {/* Add new item */}
  </DropdownMenuItem>
  <DropdownMenuItem onClick={handleSignOut}>
    Sign Out
  </DropdownMenuItem>
</DropdownMenuContent>
```

---

## Styling

### Change Theme Colors

**File:** `src/app/(with-layout)/globals.css`

**Location:** CSS variables section

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;  /* Change primary color */
  --secondary: 210 40% 96.1%;     /* Change secondary color */
  /* ... */
}
```

### Add Custom Fonts

**File:** `src/app/(with-layout)/layout.tsx`

```typescript
import { Inter, Roboto } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const roboto = Roboto({ 
  weight: ['400', '700'],
  subsets: ['latin'] 
});

// Apply to body:
<body className={roboto.className}>
```

### Customize Component Styles

**File:** Relevant component file

**Example: Change button styles globally**

```typescript
// In src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700",  // Customize
        // ... other variants
      },
    },
  }
);
```

---

## Common Patterns

### Add a New Page

1. Create file in `src/app/(with-layout)/(with-auth)/your-page/page.tsx`
2. Add the page component:

```typescript
export default function YourPage() {
  return (
    <div>
      <h1>Your Page</h1>
      {/* Content */}
    </div>
  );
}
```

3. Add to navigation (see [Navigation](#navigation) section)

### Add API Endpoint

1. Create file in `src/app/api/your-endpoint/route.ts`
2. Add handler:

```typescript
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Your logic
  return NextResponse.json({ data: 'response' });
}

export async function POST(request: Request) {
  const body = await request.json();
  // Your logic
  return NextResponse.json({ success: true });
}
```

### Add MCP Tool

1. Edit `amplify/mcp/server/src/tools/queryTools.ts`
2. Add tool definition:

```typescript
server.tool(
  "your_tool_name",
  "Description of what your tool does",
  {
    // Input schema
    param1: z.string().describe("Parameter description"),
  },
  async ({ param1 }) => {
    // Tool logic
    const result = await yourFunction(param1);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);
```

3. Redeploy: `npx ampx sandbox`

---

## Testing Changes

### Test Frontend Changes

```bash
npm run dev
# Navigate to http://localhost:3000
```

### Test Backend Changes

```bash
npx ampx sandbox
# Wait for deployment to complete
# Test through the frontend
```

### Test Specific Component

Create a test page:

```typescript
// src/app/(with-layout)/test/page.tsx
import { YourComponent } from '@/components/YourComponent';

export default function TestPage() {
  return <YourComponent />;
}
```

---

## Troubleshooting

### Changes Not Appearing

1. **Frontend changes:** Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
2. **Backend changes:** Redeploy with `npx ampx sandbox`
3. **CSS changes:** Clear browser cache or restart dev server

### GraphQL Schema Issues

1. Check `amplify/data/resource.ts` for syntax errors
2. Ensure all relationships are bidirectional
3. Run `npx ampx sandbox` to see detailed errors
4. Check generated types in `amplify/graphql/`

### GraphQL Query Tool Errors

**Symptom:** Errors like:
- `"Field 'listProcessEquipment' in type 'Query' is undefined"`
- `"Field undefined"` when calling AI agent tools
- `GraphQL validation error`

**Common Causes:**
1. Tools in `queryTools.ts` reference models that are commented out or removed
2. GraphQL schema wasn't regenerated after model changes
3. Tool query strings don't match the generated GraphQL queries (e.g., wrong plural form)

**Solution Steps:**

1. **Identify which models are active:**
   ```bash
   # Check your schema
   cat amplify/data/resource.ts | grep "\.model"
   ```

2. **Check generated queries:**
   ```bash
   # See what queries actually exist
   cat amplify/graphql/queries.ts | grep "export const"
   ```

3. **Compare with your tools:**
   - Open `amplify/agent/server/src/tools/queryTools.ts`
   - Open `amplify/mcp/server/src/tools/queryTools.ts`
   - Ensure only active models have tools

4. **Regenerate if needed:**
   ```bash
   npx ampx generate graphql-client-code
   ```

5. **Update queryTools.ts files:**
   - Remove tools for commented-out models
   - Fix any plural form mismatches (e.g., `listProcessEquipment` → `listProcessEquipments`)
   - Update the `allQueryTools` export array

6. **Rebuild and test:**
   ```bash
   cd amplify/agent/server && npm run build
   cd ../../../amplify/mcp/server && npm run build
   ```

**Quick Fix Example:**
If you see `Field 'listEquipment' is undefined` but Equipment is commented out in your schema:

```typescript
// Remove or comment out in queryTools.ts:
// export const listEquipmentTool = createListTool(...);

// And remove from exports:
export const allQueryTools = [
  listAreasTool,
  // listEquipmentTool,  // ← Comment out or remove
  listPersonnelTool,
];
```

### Build Errors

1. Check TypeScript errors: `npm run type-check`
2. Check linting: `npm run lint`
3. Clear cache: `rm -rf .next node_modules && npm install`

---

## Best Practices

1. **Always test locally** before deploying to production
2. **Version control** - Commit changes frequently
3. **Document customizations** - Add comments explaining why
4. **Follow naming conventions** - Use consistent naming patterns
5. **Keep dependencies updated** - Run `npm outdated` regularly
6. **Test across browsers** - Verify in Chrome, Firefox, Safari
7. **Mobile responsive** - Test on mobile devices
8. **Accessibility** - Ensure keyboard navigation works

---

## Getting Help

- **Project Structure:** See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- **Demo Guide:** See [DEMO_GUIDE.md](./DEMO_GUIDE.md)
- **README:** See [README.md](../README.md)
- **AWS Amplify Docs:** https://docs.amplify.aws/
- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS Docs:** https://tailwindcss.com/docs
