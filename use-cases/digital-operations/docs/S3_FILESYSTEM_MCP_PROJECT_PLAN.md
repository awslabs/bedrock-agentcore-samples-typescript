# S3 Filesystem MCP Server - Project Plan

## Executive Summary

This document outlines best practices for giving Claude LLM models secure file system access and provides a comprehensive plan for building an S3-backed filesystem MCP server that can be deployed on AWS Bedrock AgentCore Runtime.

The MCP server should have an environmental variable which sets the target s3 bucket.
There should also be a dynamic header for chat session id.

---

## Table of Contents

1. [Best Practices for File System Access](#best-practices)
2. [S3 as File System Architecture](#s3-architecture)
3. [Adapting the Official Filesystem MCP Server](#adapting-filesystem-server)
4. [Implementation Guide](#implementation-guide)
5. [Security & IAM Configuration](#security-configuration)
6. [Deployment Strategy](#deployment-strategy)
7. [Testing & Validation](#testing)

---

## Best Practices for File System Access {#best-practices}

### Security & Access Control

#### 1. Principle of Least Privilege

- **Only grant access to specific directories/buckets** needed for the task
- Start with minimal permissions and expand only when necessary
- Use separate buckets/prefixes for different security contexts

#### 2. Input Validation

```typescript
function validatePath(path: string): void {
  // Prevent directory traversal
  if (path.includes('..') || path.includes('//')) {
    throw new Error('Directory traversal not allowed')
  }

  // Validate characters (alphanumeric, dash, underscore, slash, dot)
  if (!/^[a-zA-Z0-9\-_\/\.]+$/.test(path)) {
    throw new Error('Invalid characters in path')
  }

  // Enforce max path length
  if (path.length > 1024) {
    // S3 key limit
    throw new Error('Path exceeds maximum length')
  }

  // Prevent hidden files unless explicitly allowed
  const parts = path.split('/')
  if (parts.some((p) => p.startsWith('.') && p !== '.')) {
    throw new Error('Hidden files not allowed')
  }
}
```

#### 3. Access Control Patterns

- **Read-Only by Default**: Enable write operations only when necessary
- **Sandboxing**: Isolate operations within specific directories/prefixes
- **Whitelist Approach**: Explicitly list allowed directories rather than blacklisting

#### 4. File Type & Size Restrictions

```typescript
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function validateFileOperation(path: string, size?: number) {
  const ext = path.substring(path.lastIndexOf('.'))

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`File type ${ext} not allowed`)
  }

  if (size && size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds maximum allowed')
  }
}
```

#### 5. Rate Limiting

```typescript
import { RateLimiter } from 'limiter'

const limiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: 'minute',
})

async function withRateLimit<T>(operation: () => Promise<T>): Promise<T> {
  await limiter.removeTokens(1)
  return operation()
}
```

#### 6. Audit Logging

```typescript
interface AuditLog {
  timestamp: string
  operation: string
  path: string
  user?: string
  success: boolean
  error?: string
}

function logOperation(log: AuditLog): void {
  console.log(
    JSON.stringify({
      ...log,
      timestamp: new Date().toISOString(),
    })
  )

  // Could also send to CloudWatch, S3, etc.
}
```

### Implementation Patterns

#### 1. Content Filtering

```typescript
async function scanForSensitiveData(content: string): Promise<boolean> {
  const sensitivePatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{16}\b/, // Credit card
    /password\s*=\s*['"].*?['"]/i,
    /api[_-]?key\s*=\s*['"].*?['"]/i,
  ]

  return sensitivePatterns.some((pattern) => pattern.test(content))
}
```

#### 2. Versioning & History

- Leverage S3 versioning for rollback capability
- Track file modifications with metadata
- Implement "undo" functionality

#### 3. Metadata Tracking

```typescript
const metadata = {
  'x-amz-meta-owner': userId,
  'x-amz-meta-created-by': 'mcp-server',
  'x-amz-meta-timestamp': Date.now().toString(),
  'x-amz-meta-operation': 'write_file',
}
```

---

## S3 as File System Architecture {#s3-architecture}

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                Claude / Bedrock Agent                │
└────────────────────┬────────────────────────────────┘
                     │ MCP Protocol
                     ↓
┌─────────────────────────────────────────────────────┐
│             AgentCore Runtime (ECS/Fargate)          │
│  ┌───────────────────────────────────────────────┐  │
│  │         S3 Filesystem MCP Server              │  │
│  │  (Docker Container on Port 8000/mcp)          │  │
│  └────────────────────┬──────────────────────────┘  │
└─────────────────────────┼───────────────────────────┘
                          │ AWS SDK v3
                          ↓
┌─────────────────────────────────────────────────────┐
│                 Amazon S3 Bucket(s)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   /project1 │  │   /project2 │  │    /shared  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Why S3 Over Other Options

**Option 1: MCP Server with S3 Backend** ✅ **RECOMMENDED**

- Clean abstraction layer
- Works with any MCP-compatible client
- Easy to add features (caching, versioning, ACL)
- Portable across LLM platforms

**Option 2: Direct S3 Integration**

- Simpler for basic use cases
- Tighter coupling to AWS
- Less portable

**Option 3: S3 Mount (FUSE - s3fs/goofys)**

- Appears as regular filesystem
- Performance implications
- Complex setup

### Key S3 Considerations

#### 1. S3 vs. Traditional Filesystem

| Feature           | Traditional FS | S3                          |
| ----------------- | -------------- | --------------------------- |
| Directories       | Native support | Simulated with prefixes     |
| Atomic operations | Yes            | Limited                     |
| POSIX permissions | Full           | Through IAM/Bucket policies |
| Consistency       | Strong         | Strong (as of Dec 2020)     |
| Latency           | Low (local)    | Higher (network)            |
| Cost              | Fixed          | Per-operation               |

#### 2. Performance Optimizations

**Caching Strategy:**

```typescript
class S3Cache {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private ttl = 5 * 60 * 1000 // 5 minutes

  async get(key: string, fetcher: () => Promise<any>) {
    const cached = this.cache.get(key)

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data
    }

    const data = await fetcher()
    this.cache.set(key, { data, timestamp: Date.now() })
    return data
  }
}
```

**Batch Operations:**

```typescript
async readMultipleFiles(paths: string[]): Promise<Map<string, string>> {
  const results = await Promise.allSettled(
    paths.map(path => this.readFile(path))
  );

  const fileMap = new Map();
  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      fileMap.set(paths[idx], result.value);
    }
  });

  return fileMap;
}
```

---

## Adapting the Official Filesystem MCP Server {#adapting-filesystem-server}

### Current Filesystem Server Architecture

The official MCP Filesystem Server (TypeScript) provides:

**13 Tools:**

1. `read_text_file` - Read file as UTF-8 text
2. `read_media_file` - Read image/audio files
3. `read_multiple_files` - Batch file reading
4. `write_file` - Create or overwrite files
5. `edit_file` - Selective edits with pattern matching
6. `create_directory` - Create directories
7. `list_directory` - List contents
8. `list_directory_with_sizes` - List with file sizes
9. `directory_tree` - Recursive tree structure
10. `move_file` - Move/rename files
11. `search_files` - Search with glob patterns
12. `get_file_info` - File metadata
13. `list_allowed_directories` - Show accessible paths

**Security Features:**

- Path validation with `normalizePath()`
- Allowed directory enforcement
- Symlink resolution
- Directory traversal prevention

### S3 Adaptation Strategy

#### Core Module Structure

```typescript
// src/s3-filesystem/s3-client.ts
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { NodeCache } from 'node-cache'

export class S3FileSystemClient {
  private s3: S3Client
  private cache: NodeCache
  private bucket: string

  constructor(bucket: string, region: string = 'us-east-1') {
    this.s3 = new S3Client({ region })
    this.cache = new NodeCache({ stdTTL: 300 }) // 5 min
    this.bucket = bucket
  }

  async readObject(key: string): Promise<Buffer> {
    const cacheKey = `read:${key}`
    const cached = this.cache.get<Buffer>(cacheKey)
    if (cached) return cached

    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    )

    const chunks: Uint8Array[] = []
    for await (const chunk of response.Body as any) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    this.cache.set(cacheKey, buffer)
    return buffer
  }

  async writeObject(key: string, content: Buffer | string, metadata?: Record<string, string>): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: content,
        Metadata: metadata,
      })
    )

    // Invalidate cache
    this.cache.del(`read:${key}`)
  }
}
```

#### Path Translation Layer

```typescript
// src/s3-filesystem/path-manager.ts
import * as path from 'path'

export class S3PathManager {
  private allowedPrefixes: Set<string>

  constructor(prefixes: string[]) {
    // Normalize prefixes (remove leading/trailing slashes)
    this.allowedPrefixes = new Set(prefixes.map((p) => p.replace(/^\/+|\/+$/g, '')))
  }

  toS3Key(filePath: string): string {
    // Normalize path (convert backslashes, remove leading slash)
    let normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '')

    // Validate against allowed prefixes
    if (!this.isAllowedPath(normalized)) {
      throw new Error(`Access denied: ${filePath} is outside allowed directories`)
    }

    return normalized
  }

  isAllowedPath(key: string): boolean {
    if (this.allowedPrefixes.size === 0) return false

    return Array.from(this.allowedPrefixes).some((prefix) => key === prefix || key.startsWith(prefix + '/'))
  }

  listAllowedPrefixes(): string[] {
    return Array.from(this.allowedPrefixes)
  }
}
```

#### Tool Implementations

```typescript
// src/s3-filesystem/tools/read.ts
import { z } from 'zod'
import { S3FileSystemClient } from '../s3-client'
import { S3PathManager } from '../path-manager'

export function registerReadTools(server: McpServer, s3Client: S3FileSystemClient, pathManager: S3PathManager) {
  server.registerTool(
    'read_text_file',
    {
      title: 'Read Text File from S3',
      description: 'Read a text file from S3 bucket',
      inputSchema: {
        path: z.string().describe('Path to file in S3 bucket'),
        head: z.number().optional().describe('Read first N lines'),
        tail: z.number().optional().describe('Read last N lines'),
      },
    },
    async ({ path, head, tail }) => {
      const s3Key = pathManager.toS3Key(path)
      const buffer = await s3Client.readObject(s3Key)
      let content = buffer.toString('utf-8')

      // Handle head/tail
      if (head || tail) {
        const lines = content.split('\n')
        if (head) content = lines.slice(0, head).join('\n')
        if (tail) content = lines.slice(-tail).join('\n')
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: content,
          },
        ],
      }
    }
  )

  server.registerTool(
    'read_media_file',
    {
      title: 'Read Media File from S3',
      description: 'Read image or audio file from S3',
      inputSchema: {
        path: z.string().describe('Path to media file'),
      },
    },
    async ({ path }) => {
      const s3Key = pathManager.toS3Key(path)
      const buffer = await s3Client.readObject(s3Key)

      // Detect MIME type from extension
      const ext = path.substring(path.lastIndexOf('.')).toLowerCase()
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
      }

      const mimeType = mimeTypes[ext] || 'application/octet-stream'
      const base64 = buffer.toString('base64')

      return {
        content: [
          {
            type: mimeType.startsWith('image/') ? ('image' as const) : ('text' as const),
            data: base64,
            mimeType: mimeType,
          },
        ],
      }
    }
  )
}
```

```typescript
// src/s3-filesystem/tools/write.ts
export function registerWriteTools(server: McpServer, s3Client: S3FileSystemClient, pathManager: S3PathManager) {
  server.registerTool(
    'write_file',
    {
      title: 'Write File to S3',
      description: 'Create or overwrite a file in S3',
      inputSchema: {
        path: z.string(),
        content: z.string(),
      },
    },
    async ({ path, content }) => {
      const s3Key = pathManager.toS3Key(path)

      // Add metadata
      const metadata = {
        'created-by': 'mcp-server',
        timestamp: Date.now().toString(),
      }

      await s3Client.writeObject(s3Key, content, metadata)

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully wrote to ${path}`,
          },
        ],
      }
    }
  )
}
```

```typescript
// src/s3-filesystem/tools/list.ts
import { ListObjectsV2Command } from '@aws-sdk/client-s3'

export function registerListTools(server: McpServer, s3Client: S3FileSystemClient, pathManager: S3PathManager) {
  server.registerTool(
    'list_directory',
    {
      title: 'List S3 Directory',
      description: 'List contents of an S3 prefix',
      inputSchema: {
        path: z.string(),
      },
    },
    async ({ path }) => {
      const s3Key = pathManager.toS3Key(path)
      const prefix = s3Key.endsWith('/') ? s3Key : `${s3Key}/`

      const response = await s3Client.s3.send(
        new ListObjectsV2Command({
          Bucket: s3Client.bucket,
          Prefix: prefix,
          Delimiter: '/', // Only immediate children
        })
      )

      const entries: string[] = []

      // Add directories (CommonPrefixes)
      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          const name = prefix.Prefix!.slice(prefix.Prefix!.lastIndexOf('/', prefix.Prefix!.length - 2) + 1)
          entries.push(`[DIR] ${name}`)
        }
      }

      // Add files (Contents)
      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key !== prefix) {
            // Skip the directory marker itself
            const name = obj.Key!.slice(obj.Key!.lastIndexOf('/') + 1)
            entries.push(`[FILE] ${name}`)
          }
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: entries.join('\n') || 'Empty directory',
          },
        ],
      }
    }
  )
}
```

### Directory Simulation in S3

S3 doesn't have true directories - they're simulated with prefixes. Handle this by:

```typescript
// Create "directory marker" object
async function createDirectory(path: string) {
  const key = path.endsWith('/') ? path : `${path}/`
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: '', // Empty object
      Metadata: {
        'x-amz-meta-type': 'directory-marker',
      },
    })
  )
}

// Check if path is a directory
async function isDirectory(key: string): Promise<boolean> {
  // In S3, a "directory" is a prefix with objects
  const response = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: key.endsWith('/') ? key : `${key}/`,
      MaxKeys: 1,
    })
  )

  return (response.KeyCount ?? 0) > 0
}
```

---

## Implementation Guide {#implementation-guide}

### Project Structure

```
s3-filesystem-mcp-server/
├── package.json
├── tsconfig.json
├── Dockerfile
├── src/
│   ├── index.ts                  # Express server entry point
│   ├── server.ts                 # MCP server factory
│   ├── s3-client.ts              # S3 client wrapper
│   ├── path-manager.ts           # Path validation & translation
│   ├── tools/
│   │   ├── read.ts              # Read operations
│   │   ├── write.ts             # Write operations
│   │   ├── list.ts              # List operations
│   │   ├── search.ts            # Search operations
│   │   ├── metadata.ts          # Metadata operations
│   │   └── index.ts             # Tool registration
│   └── utils/
│       ├── validation.ts        # Input validation
│       ├── cache.ts             # Caching layer
│       └── logger.ts            # Audit logging
├── __tests__/
│   ├── s3-client.test.ts
│   ├── path-manager.test.ts
│   └── tools/
│       ├── read.test.ts
│       └── write.test.ts
└── README.md
```

### package.json

```json
{
  "name": "s3-filesystem-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for S3-backed filesystem operations",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest run --coverage"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "@aws-sdk/client-s3": "^3.700.0",
    "express": "^4.21.2",
    "zod": "^3.24.1",
    "node-cache": "^5.1.2",
    "minimatch": "^10.0.1"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.2",
    "typescript": "^5.7.2",
    "tsx": "^4.19.2",
    "vitest": "^2.1.8"
  }
}
```

### Main Server Implementation

```typescript
// src/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { S3FileSystemClient } from './s3-client.js'
import { S3PathManager } from './path-manager.js'
import { registerAllTools } from './tools/index.js'

export interface S3ServerConfig {
  bucket: string
  region?: string
  allowedPrefixes: string[]
  enableCache?: boolean
  cacheConfig?: {
    ttl?: number
    maxKeys?: number
  }
}

export function createS3FilesystemServer(config: S3ServerConfig) {
  const server = new McpServer({
    name: 'S3-Filesystem',
    version: '1.0.0',
    capabilities: {
      tools: {},
    },
  })

  // Initialize S3 client and path manager
  const s3Client = new S3FileSystemClient(config.bucket, config.region, config.enableCache, config.cacheConfig)

  const pathManager = new S3PathManager(config.allowedPrefixes)

  // Register all tools
  registerAllTools(server, s3Client, pathManager)

  return server
}
```

```typescript
// src/index.ts
import express from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createS3FilesystemServer } from './server.js'

const PORT = 8000
const app = express()
app.use(express.json())

// Configuration from environment variables
const config = {
  bucket: process.env.S3_BUCKET || 'my-mcp-bucket',
  region: process.env.AWS_REGION || 'us-east-1',
  allowedPrefixes: (process.env.ALLOWED_PREFIXES || '').split(',').filter(Boolean),
  enableCache: process.env.ENABLE_CACHE !== 'false',
  cacheConfig: {
    ttl: parseInt(process.env.CACHE_TTL || '300'),
    maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '1000'),
  },
}

// Validate configuration
if (!config.bucket) {
  throw new Error('S3_BUCKET environment variable is required')
}
if (config.allowedPrefixes.length === 0) {
  throw new Error('ALLOWED_PREFIXES environment variable is required')
}

app.post('/mcp', async (req, res) => {
  const server = createS3FilesystemServer(config)

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })

    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)

    res.on('close', () => {
      transport.close()
      server.close()
    })
  } catch (error) {
    console.error('Error handling MCP request:', error)
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      })
    }
  }
})

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'S3 Filesystem MCP Server',
    bucket: config.bucket,
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`S3 Filesystem MCP server running on port ${PORT}`)
  console.log(`Bucket: ${config.bucket}`)
  console.log(`Allowed prefixes: ${config.allowedPrefixes.join(', ')}`)
})
```

---

## Security Configuration {#security-configuration}

### IAM Role for ECS Task

```typescript
// infrastructure/iam.ts (CDK)
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cdk from 'aws-cdk-lib'

export class MCPServerIAM extends cdk.Stack {
  public readonly taskRole: iam.Role

  constructor(scope: cdk.App, id: string, bucketArn: string, allowedPrefixes: string[]) {
    super(scope, id)

    this.taskRole = new iam.Role(this, 'MCPServerTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'IAM role for MCP Server ECS tasks',
    })

    // S3 Read permissions
    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:GetObjectVersion', 's3:HeadObject'],
        resources: allowedPrefixes.map((prefix) => `${bucketArn}/${prefix}/*`),
      })
    )

    // S3 Write permissions (optional - can be restricted)
    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:PutObject', 's3:PutObjectAcl'],
        resources: allowedPrefixes.map((prefix) => `${bucketArn}/${prefix}/*`),
        conditions: {
          StringEquals: {
            's3:x-amz-server-side-encryption': 'AES256',
          },
        },
      })
    )

    // S3 Delete permissions (highly restricted)
    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:DeleteObject'],
        resources: allowedPrefixes.map((prefix) => `${bucketArn}/${prefix}/*`),
      })
    )

    // S3 List permissions
    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:ListBucket'],
        resources: [bucketArn],
        conditions: {
          StringLike: {
            's3:prefix': allowedPrefixes.map((p) => `${p}/*`),
          },
        },
      })
    )
  }
}
```

### S3 Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MCPServerAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:role/MCPServerTaskRole"
      },
      "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::my-mcp-bucket", "arn:aws:s3:::my-mcp-bucket/allowed-prefix/*"]
    },
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-mcp-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

### Environment Variables

```bash
# Required
S3_BUCKET=my-mcp-bucket
ALLOWED_PREFIXES=/project1,/project2,/shared

# Optional
AWS_REGION=us-east-1
ENABLE_CACHE=true
CACHE_TTL=300
CACHE_MAX_KEYS=1000

# Security
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_EXTENSIONS=.txt,.md,.json,.csv,.pdf
RATE_LIMIT_PER_MINUTE=100
```

---

## Deployment Strategy {#deployment-strategy}

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY dist/ ./dist/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 8000

CMD ["node", "dist/index.js"]
```

### CDK Deployment with Amplify

```typescript
// infrastructure/mcp-s3-server.ts
import * as cdk from 'aws-cdk-lib'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { MCPServerIAM } from './iam'

export interface MCPServerProps {
  bucket: s3.IBucket
  allowedPrefixes: string[]
}

export class MCPServer extends cdk.Construct {
  public readonly imageUri: string

  constructor(scope: cdk.Construct, id: string, props: MCPServerProps) {
    super(scope, id)

    // Create IAM role
    const iamStack = new MCPServerIAM(this, 'IAM', props.bucket.bucketArn, props.allowedPrefixes)

    // Build Docker image
    const dockerImage = new ecr_assets.DockerImageAsset(this, 'Image', {
      directory: './mcp-server',
      file: 'Dockerfile',
      platform: ecr_assets.Platform.LINUX_AMD64,
    })

    this.imageUri = dockerImage.imageUri

    // Output for AgentCore Runtime
    new cdk.CfnOutput(this, 'MCPServerImageUri', {
      value: this.imageUri,
      description: 'ECR image URI for MCP Server',
    })

    new cdk.CfnOutput(this, 'TaskRoleArn', {
      value: iamStack.taskRole.roleArn,
      description: 'IAM role ARN for MCP Server',
    })
  }
}
```

### ECS Task Definition Example

```json
{
  "family": "mcp-s3-filesystem",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/MCPServerTaskRole",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "mcp-server",
      "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/mcp-s3-filesystem:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "S3_BUCKET",
          "value": "my-mcp-bucket"
        },
        {
          "name": "ALLOWED_PREFIXES",
          "value": "/project1,/project2"
        },
        {
          "name": "AWS_REGION",
          "value": "us-east-1"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/mcp-s3-filesystem",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 10
      }
    }
  ]
}
```

---

## Testing & Validation {#testing}

### Unit Tests

```typescript
// __tests__/s3-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { S3FileSystemClient } from '../src/s3-client'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

vi.mock('@aws-sdk/client-s3')

describe('S3FileSystemClient', () => {
  let client: S3FileSystemClient

  beforeEach(() => {
    client = new S3FileSystemClient('test-bucket', 'us-east-1')
  })

  it('should read object from S3', async () => {
    const mockBody = Buffer.from('test content')
    vi.mocked(client['s3'].send).mockResolvedValueOnce({
      Body: mockBody,
    })

    const result = await client.readObject('test/file.txt')
    expect(result.toString()).toBe('test content')
  })

  it('should cache read operations', async () => {
    const mockBody = Buffer.from('cached content')
    vi.mocked(client['s3'].send).mockResolvedValueOnce({
      Body: mockBody,
    })

    // First read
    await client.readObject('test/file.txt')

    // Second read (should use cache)
    const result = await client.readObject('test/file.txt')

    // S3 should only be called once
    expect(client['s3'].send).toHaveBeenCalledTimes(1)
    expect(result.toString()).toBe('cached content')
  })
})
```

### Integration Tests

```typescript
// __tests__/integration/s3-operations.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { S3Client, CreateBucketCommand, DeleteBucketCommand } from '@aws-sdk/client-s3'
import { createS3FilesystemServer } from '../src/server'

describe('S3 Operations Integration', () => {
  let testBucket: string
  let s3Client: S3Client

  beforeAll(async () => {
    testBucket = `mcp-test-${Date.now()}`
    s3Client = new S3Client({ region: 'us-east-1' })

    await s3Client.send(
      new CreateBucketCommand({
        Bucket: testBucket,
      })
    )
  })

  afterAll(async () => {
    // Cleanup test bucket
    await s3Client.send(
      new DeleteBucketCommand({
        Bucket: testBucket,
      })
    )
  })

  it('should write and read a file', async () => {
    const server = createS3FilesystemServer({
      bucket: testBucket,
      allowedPrefixes: ['/test'],
    })

    // Write file
    const writeResult = await server.callTool('write_file', {
      path: '/test/hello.txt',
      content: 'Hello, S3!',
    })

    expect(writeResult.success).toBe(true)

    // Read file
    const readResult = await server.callTool('read_text_file', {
      path: '/test/hello.txt',
    })

    expect(readResult.content).toBe('Hello, S3!')
  })
})
```

### Manual Testing Checklist

- [ ] **Read Operations**
  - [ ] Read text file
  - [ ] Read media file (image/audio)
  - [ ] Read multiple files
  - [ ] Head/tail file reading
- [ ] **Write Operations**
  - [ ] Write new file
  - [ ] Overwrite existing file
  - [ ] Edit file with pattern matching
- [ ] **Directory Operations**
  - [ ] Create directory
  - [ ] List directory
  - [ ] List directory with sizes
  - [ ] Directory tree
- [ ] **File Management**
  - [ ] Move file
  - [ ] Get file info
  - [ ] Search files
- [ ] **Security**
  - [ ] Path traversal prevention
  - [ ] Allowed prefix enforcement
  - [ ] File size limits
  - [ ] Rate limiting
- [ ] **Performance**
  - [ ] Cache hit rate
  - [ ] Large file handling
  - [ ] Concurrent requests

---

## Complete Tool Reference {#tool-reference}

### Tool Mapping: Filesystem → S3

| Filesystem Tool             | S3 Implementation              | Notes                                     |
| --------------------------- | ------------------------------ | ----------------------------------------- |
| `read_text_file`            | GetObject + decode UTF-8       | Add caching                               |
| `read_media_file`           | GetObject + base64 encode      | Support streaming for large files         |
| `read_multiple_files`       | Batch GetObject calls          | Use Promise.allSettled                    |
| `write_file`                | PutObject                      | Add metadata, encryption                  |
| `edit_file`                 | GetObject → modify → PutObject | Consider using S3 Object Lambda for edits |
| `create_directory`          | PutObject with trailing `/`    | Create marker object                      |
| `list_directory`            | ListObjectsV2 with delimiter   | Parse CommonPrefixes                      |
| `list_directory_with_sizes` | ListObjectsV2 with metadata    | Include Size field                        |
| `directory_tree`            | Recursive ListObjectsV2        | Build tree structure                      |
| `move_file`                 | CopyObject + DeleteObject      | Not atomic, handle failures               |
| `search_files`              | ListObjectsV2 + pattern match  | Use minimatch for glob                    |
| `get_file_info`             | HeadObject                     | Parse metadata                            |
| `list_allowed_directories`  | Return configured prefixes     | From environment                          |

---

## Advanced Features (Optional)

### 1. Multipart Upload for Large Files

```typescript
import { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'

async function uploadLargeFile(key: string, content: Buffer) {
  const partSize = 5 * 1024 * 1024 // 5MB chunks

  // Initiate multipart upload
  const multipart = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
    })
  )

  const uploadId = multipart.UploadId!
  const parts: any[] = []

  // Upload parts
  for (let i = 0; i < content.length; i += partSize) {
    const partNumber = Math.floor(i / partSize) + 1
    const chunk = content.slice(i, i + partSize)

    const part = await s3Client.send(
      new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: chunk,
      })
    )

    parts.push({
      ETag: part.ETag,
      PartNumber: partNumber,
    })
  }

  // Complete upload
  await s3Client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    })
  )
}
```

### 2. Presigned URLs

```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

server.registerTool(
  'generate_presigned_url',
  {
    title: 'Generate Presigned URL',
    description: 'Create temporary URL for S3 object access',
    inputSchema: {
      path: z.string(),
      expiresIn: z.number().default(3600),
    },
  },
  async ({ path, expiresIn }) => {
    const key = pathManager.toS3Key(path)

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const url = await getSignedUrl(s3Client.s3, command, {
      expiresIn,
    })

    return {
      content: [
        {
          type: 'text' as const,
          text: `Presigned URL (expires in ${expiresIn}s): ${url}`,
        },
      ],
    }
  }
)
```

### 3. S3 Versioning Support

```typescript
import { ListObjectVersionsCommand } from '@aws-sdk/client-s3'

server.registerTool(
  'get_file_versions',
  {
    title: 'Get File Version History',
    description: 'List all versions of a file',
    inputSchema: {
      path: z.string(),
    },
  },
  async ({ path }) => {
    const key = pathManager.toS3Key(path)

    const response = await s3Client.s3.send(
      new ListObjectVersionsCommand({
        Bucket: bucket,
        Prefix: key,
      })
    )

    const versions =
      response.Versions?.map((v) => ({
        versionId: v.VersionId,
        lastModified: v.LastModified,
        size: v.Size,
        isLatest: v.IsLatest,
      })) || []

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(versions, null, 2),
        },
      ],
    }
  }
)
```

---

## Monitoring & Observability

### CloudWatch Metrics

```typescript
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch'

class MetricsCollector {
  private cloudwatch: CloudWatchClient

  async recordOperation(operation: string, duration: number, success: boolean) {
    await this.cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: 'MCP/S3Filesystem',
        MetricData: [
          {
            MetricName: 'OperationDuration',
            Value: duration,
            Unit: 'Milliseconds',
            Dimensions: [
              { Name: 'Operation', Value: operation },
              { Name: 'Status', Value: success ? 'Success' : 'Failure' },
            ],
          },
        ],
      })
    )
  }
}
```

### Structured Logging

```typescript
interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  operation: string
  path?: string
  duration?: number
  error?: string
  metadata?: Record<string, any>
}

function log(entry: Omit<LogEntry, 'timestamp'>) {
  console.log(
    JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
    })
  )
}
```

---

## Cost Optimization

### S3 Cost Breakdown

**Request Costs (us-east-1):**

- GET/HEAD requests: $0.0004 per 1,000
- PUT/COPY/POST requests: $0.005 per 1,000
- LIST requests: $0.005 per 1,000

**Storage Costs:**

- Standard: $0.023 per GB/month
- Intelligent-Tiering: $0.023 per GB/month + monitoring

**Cost Optimization Strategies:**

1. **Aggressive Caching**
   - Cache frequently accessed files for 5-15 minutes
   - Reduce GET requests by 80-90%

2. **Batch Operations**
   - Combine multiple operations where possible
   - Use `read_multiple_files` instead of individual reads

3. **Intelligent Tiering**
   - Enable S3 Intelligent-Tiering for automatic cost optimization
   - Moves infrequently accessed objects to cheaper storage

4. **Request Metrics**
   - Monitor S3 request patterns
   - Optimize based on access patterns

---

## Migration Path

### Phase 1: Development (Week 1-2)

- [ ] Set up project structure
- [ ] Implement core S3 client wrapper
- [ ] Implement path manager with validation
- [ ] Implement basic read/write tools
- [ ] Add unit tests

### Phase 2: Feature Complete (Week 3)

- [ ] Implement all 13 tools
- [ ] Add caching layer
- [ ] Add rate limiting
- [ ] Add audit logging
- [ ] Integration tests

### Phase 3: Security Hardening (Week 4)

- [ ] IAM role configuration
- [ ] Bucket policies
- [ ] Input validation enhancement
- [ ] Security audit
- [ ] Penetration testing

### Phase 4: Deployment (Week 5)

- [ ] Docker containerization
- [ ] CDK infrastructure code
- [ ] Deploy to staging
- [ ] Performance testing
- [ ] Deploy to production

### Phase 5: Monitoring & Optimization (Week 6+)

- [ ] CloudWatch dashboards
- [ ] Alert configuration
- [ ] Cost monitoring
- [ ] Performance optimization
- [ ] Documentation

---

## Troubleshooting Guide

### Common Issues

**1. Permission Denied**

```
Error: Access denied: /path/to/file.txt is outside allowed directories
```

**Solution**: Check `ALLOWED_PREFIXES` environment variable and ensure path is within allowed prefixes.

**2. S3 Rate Limiting**

```
Error: SlowDown: Please reduce your request rate
```

**Solution**: Implement exponential backoff and increase caching TTL.

**3. Large File Timeout**

```
Error: Request timeout after 30s
```

**Solution**: Increase timeout settings and use streaming for large files.

**4. IAM Permissions**

```
Error: Access Denied
```

**Solution**: Verify IAM role has necessary S3 permissions and bucket policy allows access.

---

## Performance Benchmarks

### Expected Performance

| Operation         | Local FS | S3 (no cache) | S3 (cached) |
| ----------------- | -------- | ------------- | ----------- |
| Read 1KB file     | 1ms      | 50-100ms      | 1-2ms       |
| Write 1KB file    | 1ms      | 50-100ms      | N/A         |
| List 100 files    | 5ms      | 100-200ms     | 5-10ms      |
| Search 1000 files | 50ms     | 500-1000ms    | 50-100ms    |

### Optimization Tips

1. **Enable Caching**: 80-90% faster for repeated reads
2. **Use Batch Operations**: Parallel requests improve throughput
3. **CloudFront CDN**: For frequently accessed public files
4. **S3 Transfer Acceleration**: For cross-region access
5. **Compression**: gzip compress text files before upload

---

## Example Usage

### With Claude Desktop

```json
{
  "mcpServers": {
    "s3-filesystem": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "S3_BUCKET=my-mcp-bucket",
        "-e",
        "ALLOWED_PREFIXES=/project1,/shared",
        "-e",
        "AWS_REGION=us-east-1",
        "s3-filesystem-mcp-server"
      ]
    }
  }
}
```

### With Bedrock AgentCore

```typescript
// Invoke AgentCore with MCP server
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime'

const client = new BedrockAgentRuntimeClient({ region: 'us-east-1' })

const response = await client.send(
  new InvokeAgentCommand({
    agentId: 'your-agent-id',
    agentAliasId: 'your-alias-id',
    sessionId: 'session-123',
    inputText: 'List files in /project1 directory',
  })
)
```

---

## Comparison: Community Alternatives

### Available S3 MCP Servers

Based on the MCP servers directory, here are some community alternatives:

1. **AWS Samples S3 MCP** (aws-samples/sample-mcp-server-s3)
   - Official AWS sample
   - Basic S3 operations
   - PDF document focus

2. **AWS MCP** (awslabs/mcp)
   - Comprehensive AWS integration
   - Includes S3 operations
   - Part of larger AWS suite

3. **Custom Build** (This Plan)
   - Full filesystem API compatibility
   - Optimized for Bedrock AgentCore
   - Production-ready features
   - Direct adaptation of official Filesystem server

---

## Summary

### What You Get

✅ **13 Production-Ready Tools** - All filesystem operations mapped to S3  
✅ **Security First** - IAM roles, path validation, rate limiting  
✅ **Performance Optimized** - Caching, batch operations, compression  
✅ **Easy Deployment** - Docker + CDK, works with your existing setup  
✅ **Cost-Effective** - Caching reduces S3 costs by 80-90%  
✅ **Scalable** - S3's infinite storage, multi-region support  
✅ **Portable** - Works with any MCP client

### Next Steps

1. **Create new project** with the structure outlined above
2. **Copy your existing MCP infrastructure** as a starting point
3. **Implement the S3 client wrapper** and path manager
4. **Port tools one by one** from filesystem → S3
5. **Add security layers** (IAM, validation, logging)
6. **Deploy to staging** for testing
7. **Connect to Claude/Bedrock** and validate

### Estimated Effort

- **Initial Implementation**: 2-3 weeks
- **Testing & Security**: 1-2 weeks
- **Deployment & Documentation**: 1 week
- **Total**: 4-6 weeks for production-ready implementation

---

## References

- [MCP Official Documentation](https://modelcontextprotocol.io/)
- [Official Filesystem MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
- [AWS S3 API Reference](https://docs.aws.amazon.com/AmazonS3/latest/API/)
- [AWS SDK v3 for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Bedrock AgentCore Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [MCP Community Servers](https://github.com/modelcontextprotocol/servers)

---

## Appendix: Quick Start Commands

```bash
# Create new project
mkdir s3-filesystem-mcp-server
cd s3-filesystem-mcp-server

# Initialize project
npm init -y
npm install @modelcontextprotocol/sdk @aws-sdk/client-s3 express zod node-cache minimatch

# Install dev dependencies
npm install -D typescript @types/node @types/express tsx vitest

# Create tsconfig.json
npx tsc --init

# Run locally for development
export S3_BUCKET=my-test-bucket
export ALLOWED_PREFIXES=/test,/dev
npx tsx src/index.ts

# Build for production
npm run build

# Build Docker image
docker build -t s3-filesystem-mcp-server .

# Run in Docker
docker run -p 8000:8000 \
  -e S3_BUCKET=my-bucket \
  -e ALLOWED_PREFIXES=/project1 \
  -e AWS_REGION=us-east-1 \
  s3-filesystem-mcp-server
```

---

**Document Version**: 1.0  
**Last Updated**: November 20, 2025  
**Author**: AI Assistant  
**Status**: Ready for Implementation
