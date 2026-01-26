import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { athenaQuery } from '../functions/athena-query/resource';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update", 
and "delete" any "Todo" records.
=========================================================================*/

// Custom types for AI SDK UIMessage parts
const schema = a.schema({
  
  ChatSession: a.model({
    name: a.string(),
    messages: a.hasMany("ChatMessage", "chatSessionId"),
    mapLayers: a.hasMany("MapLayer", "chatSessionId"),
    mapBounds: a.json(), // Optional: store last view bounds as [west, south, east, north]
  })
    .authorization((allow) => [allow.owner(), allow.authenticated(), allow.guest()]),

  MapLayerType: a.enum(["point", "line", "polygon", "heatmap", "geojson"]),

  MapLayer: a.model({
    chatSessionId: a.id().required(),
    chatSession: a.belongsTo("ChatSession", "chatSessionId"),
    
    // Layer metadata
    name: a.string().required(),
    type: a.ref("MapLayerType").required(),
    visible: a.boolean().default(true),
    
    // Query-based layer support
    athenaQuery: a.string().required(), // SQL query to generate GeoJSON
    athenaDatabase: a.string().required(), // Database for the query
    queryRefreshInterval: a.integer(), // Minutes between auto-refresh (0 = manual only)
    lastQueryExecutedAt: a.datetime(), // Track when query was last run
    queryError: a.string(), // Store any query execution errors
    
    // GeoJSON mapping configuration for query results
    geoJsonMapping: a.json().required(), // Instructions for converting query results to GeoJSON
    // Example: { 
    //   geometryType: "Point",
    //   longitudeField: "longitude", 
    //   latitudeField: "latitude",
    //   propertyFields: ["name", "status", "type"]
    // }
    
    // Style configuration (colors, icons, stroke width, etc.)
    style: a.json(),
    
    // Layer order for z-index
    order: a.integer().default(0),
    
    // Metadata from AI
    description: a.string(),
    source: a.string(), // e.g., "user-input", "ai-analysis", "athena-query"
    
    // Auto-generated fields
    owner: a.string(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
    .secondaryIndexes((index) => [
      index("chatSessionId").sortKeys(["order"])
    ])
    .authorization((allow) => [
      allow.owner(), 
      allow.authenticated().to(["read", "create", "update", "delete"]), 
      allow.guest().to(["read"])
    ]),

  Roles: a.enum(["user", "assistant", "system"]),

  ChatMessage: a
    .model({
      chatSessionId: a.id(),
      chatSession: a.belongsTo("ChatSession", 'chatSessionId'),

      // Core UIMessage fields
      role: a.ref("Roles").required(),

      // Store the entire parts array as JSON
      // This preserves the exact UIMessage structure
      parts: a.json().required(),

      // Optional: metadata field for custom metadata
      metadata: a.json(),

      // Keep for querying/filtering
      chatSessionIdUnderscoreAgentId: a.string(),

      // Status tracking
      responseComplete: a.boolean(),

      // Auto-generated fields
      owner: a.string(),
      createdAt: a.datetime(),
    })
    .secondaryIndexes((index) => [
      index("chatSessionId").sortKeys(["createdAt"]),
      index("chatSessionIdUnderscoreAgentId").sortKeys(["createdAt"])
    ])
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read", "create"]), allow.guest().to(["read"])]),

  Settings: a.model({
    name: a.string(),
    value: a.string(),
  })
    .authorization((allow) => [allow.owner(), allow.authenticated()]),

  HeaderEntry: a.customType({
    key: a.string(),
    value: a.string(),
  }),

  Tool: a.customType({
    name: a.string(),
    description: a.string(),
    schema: a.string()
  }),

  McpServer: a.model({
    name: a.string().required().authorization((allow) => [allow.owner(), allow.authenticated()]),
    url: a.string().authorization(allow => [allow.owner()]),
    headers: a.ref("HeaderEntry").array().authorization(allow => [allow.owner()]),
    signRequestsWithAwsCreds: a.boolean().default(false),
    enabled: a.boolean().default(true),
    tools: a.ref("Tool").array()
  }).authorization((allow) => [
    allow.owner(),
    allow.authenticated().to(["read", "update"])
  ]),

  // Athena Query Types
  AthenaQueryStatus: a.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]),

  AthenaQueryResult: a.customType({
    queryExecutionId: a.string().required(),
    status: a.ref("AthenaQueryStatus").required(),
    data: a.json(),
    columns: a.string().array(),
    error: a.string(),
    rowCount: a.integer(),
    nextToken: a.string(),
  }),

  // Mutation to execute Athena query
  executeAthenaQuery: a
    .mutation()
    .arguments({
      queryString: a.string(),
      database: a.string(),
      outputLocation: a.string(),
      queryExecutionId: a.string(),
      nextToken: a.string(),
    })
    .returns(a.ref("AthenaQueryResult"))
    .handler(a.handler.function(athenaQuery))
    .authorization((allow) => [allow.authenticated()]),

  // GeoJSON mapping configuration type
  GeoJsonMappingConfig: a.customType({
    geometryType: a.string().required(), // "Point", "LineString", "Polygon"
    longitudeField: a.string(), // For Point geometry
    latitudeField: a.string(), // For Point geometry
    coordinatesField: a.string(), // For LineString/Polygon (field containing coordinate array)
    propertyFields: a.string().array(), // Fields to include in feature properties
  }),

  // Result type for map layer query execution
  MapLayerQueryResult: a.customType({
    success: a.boolean().required(),
    geoJsonData: a.json(),
    error: a.string(),
    rowCount: a.integer(),
  }),

  // Mutation to execute and validate a map layer query
  executeMapLayerQuery: a
    .mutation()
    .arguments({
      layerId: a.string(),
      queryString: a.string().required(),
      database: a.string().required(),
      geoJsonMapping: a.json().required(),
    })
    .returns(a.ref("MapLayerQueryResult"))
    .handler(a.handler.function(athenaQuery))
    .authorization((allow) => [allow.authenticated()]),

  // Subscription to receive query results
  onAthenaQueryResult: a
    .subscription()
    .for(a.ref("executeAthenaQuery"))
    .arguments({
      queryExecutionId: a.string().required()
    })
    .handler(a.handler.custom({ entry: "./subscriptions/athena-query.js" }))
    .authorization((allow) => [allow.authenticated()]),

  // Action Item Types
  ActionItemType: a.enum(["immediate", "scheduled", "preventive"]),
  ActionItemStatus: a.enum(["pending", "approved", "rejected", "deferred"]),

  ActionItem: a.model({
    alertId: a.string().required(),
    type: a.ref("ActionItemType").required(),
    action: a.string().required(),
    description: a.string().required(),
    expectedValue: a.string(),
    risk: a.string(),
    status: a.ref("ActionItemStatus").required(),
    source: a.string().required(),
  })
    .authorization((allow) => [allow.owner(), allow.authenticated(), allow.guest()]),

  // Workover Job Types
  WorkoverJobType: a.enum(["workover", "completion", "maintenance"]),
  WorkoverJobPriority: a.enum(["high", "medium", "low"]),
  WorkoverJobStatus: a.enum(["queued", "inProgress", "completed", "delayed"]),

  FinancialMetrics: a.customType({
    incrementalOilBOPD: a.float(),
    incrementalGasMCFD: a.float(),
    presentValue: a.float().required(),
    rateOfReturn: a.float().required(),
    paybackMonths: a.integer().required(),
  }),

  WorkoverJob: a.model({
    wellName: a.string().required(),
    location: a.string().required(),
    jobType: a.ref("WorkoverJobType").required(),
    priority: a.ref("WorkoverJobPriority").required(),
    status: a.ref("WorkoverJobStatus").required(),
    estimatedDuration: a.string().required(),
    scheduledDate: a.date().required(),
    rigAssigned: a.string(),
    description: a.string().required(),
    estimatedCost: a.string().required(),
    financialMetrics: a.ref("FinancialMetrics").required(),
  })
    .authorization((allow) => [allow.owner(), allow.authenticated(), allow.guest()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
