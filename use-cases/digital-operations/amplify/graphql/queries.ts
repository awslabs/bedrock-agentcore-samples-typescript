/* tslint:disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from './API'
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType
  __generatedQueryOutput: OutputType
}

export const getActionItem = /* GraphQL */ `query GetActionItem($id: ID!) {
  getActionItem(id: $id) {
    action
    alertId
    createdAt
    description
    expectedValue
    id
    owner
    risk
    source
    status
    type
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetActionItemQueryVariables, APITypes.GetActionItemQuery>
export const getChatMessage = /* GraphQL */ `query GetChatMessage($id: ID!) {
  getChatMessage(id: $id) {
    chatSession {
      createdAt
      id
      mapBounds
      name
      owner
      updatedAt
      __typename
    }
    chatSessionId
    chatSessionIdUnderscoreAgentId
    createdAt
    id
    metadata
    owner
    parts
    responseComplete
    role
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetChatMessageQueryVariables, APITypes.GetChatMessageQuery>
export const getChatSession = /* GraphQL */ `query GetChatSession($id: ID!) {
  getChatSession(id: $id) {
    createdAt
    id
    mapBounds
    mapLayers {
      nextToken
      __typename
    }
    messages {
      nextToken
      __typename
    }
    name
    owner
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetChatSessionQueryVariables, APITypes.GetChatSessionQuery>
export const getMapLayer = /* GraphQL */ `query GetMapLayer($id: ID!) {
  getMapLayer(id: $id) {
    athenaDatabase
    athenaQuery
    chatSession {
      createdAt
      id
      mapBounds
      name
      owner
      updatedAt
      __typename
    }
    chatSessionId
    createdAt
    description
    geoJsonMapping
    id
    lastQueryExecutedAt
    name
    order
    owner
    queryError
    queryRefreshInterval
    source
    style
    type
    updatedAt
    visible
    __typename
  }
}
` as GeneratedQuery<APITypes.GetMapLayerQueryVariables, APITypes.GetMapLayerQuery>
export const getMcpServer = /* GraphQL */ `query GetMcpServer($id: ID!) {
  getMcpServer(id: $id) {
    createdAt
    enabled
    headers {
      key
      value
      __typename
    }
    id
    name
    owner
    signRequestsWithAwsCreds
    tools {
      description
      name
      schema
      __typename
    }
    updatedAt
    url
    __typename
  }
}
` as GeneratedQuery<APITypes.GetMcpServerQueryVariables, APITypes.GetMcpServerQuery>
export const getSettings = /* GraphQL */ `query GetSettings($id: ID!) {
  getSettings(id: $id) {
    createdAt
    id
    name
    owner
    updatedAt
    value
    __typename
  }
}
` as GeneratedQuery<APITypes.GetSettingsQueryVariables, APITypes.GetSettingsQuery>
export const getWorkoverJob = /* GraphQL */ `query GetWorkoverJob($id: ID!) {
  getWorkoverJob(id: $id) {
    createdAt
    description
    estimatedCost
    estimatedDuration
    financialMetrics {
      incrementalGasMCFD
      incrementalOilBOPD
      paybackMonths
      presentValue
      rateOfReturn
      __typename
    }
    id
    jobType
    location
    owner
    priority
    rigAssigned
    scheduledDate
    status
    updatedAt
    wellName
    __typename
  }
}
` as GeneratedQuery<APITypes.GetWorkoverJobQueryVariables, APITypes.GetWorkoverJobQuery>
export const listActionItems = /* GraphQL */ `query ListActionItems(
  $filter: ModelActionItemFilterInput
  $limit: Int
  $nextToken: String
) {
  listActionItems(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      action
      alertId
      createdAt
      description
      expectedValue
      id
      owner
      risk
      source
      status
      type
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListActionItemsQueryVariables, APITypes.ListActionItemsQuery>
export const listChatMessageByChatSessionIdAndCreatedAt =
  /* GraphQL */ `query ListChatMessageByChatSessionIdAndCreatedAt(
  $chatSessionId: ID!
  $createdAt: ModelStringKeyConditionInput
  $filter: ModelChatMessageFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listChatMessageByChatSessionIdAndCreatedAt(
    chatSessionId: $chatSessionId
    createdAt: $createdAt
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      chatSessionId
      chatSessionIdUnderscoreAgentId
      createdAt
      id
      metadata
      owner
      parts
      responseComplete
      role
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.ListChatMessageByChatSessionIdAndCreatedAtQueryVariables,
    APITypes.ListChatMessageByChatSessionIdAndCreatedAtQuery
  >
export const listChatMessageByChatSessionIdUnderscoreAgentIdAndCreatedAt =
  /* GraphQL */ `query ListChatMessageByChatSessionIdUnderscoreAgentIdAndCreatedAt(
  $chatSessionIdUnderscoreAgentId: String!
  $createdAt: ModelStringKeyConditionInput
  $filter: ModelChatMessageFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listChatMessageByChatSessionIdUnderscoreAgentIdAndCreatedAt(
    chatSessionIdUnderscoreAgentId: $chatSessionIdUnderscoreAgentId
    createdAt: $createdAt
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      chatSessionId
      chatSessionIdUnderscoreAgentId
      createdAt
      id
      metadata
      owner
      parts
      responseComplete
      role
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
    APITypes.ListChatMessageByChatSessionIdUnderscoreAgentIdAndCreatedAtQueryVariables,
    APITypes.ListChatMessageByChatSessionIdUnderscoreAgentIdAndCreatedAtQuery
  >
export const listChatMessages = /* GraphQL */ `query ListChatMessages(
  $filter: ModelChatMessageFilterInput
  $limit: Int
  $nextToken: String
) {
  listChatMessages(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      chatSessionId
      chatSessionIdUnderscoreAgentId
      createdAt
      id
      metadata
      owner
      parts
      responseComplete
      role
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListChatMessagesQueryVariables, APITypes.ListChatMessagesQuery>
export const listChatSessions = /* GraphQL */ `query ListChatSessions(
  $filter: ModelChatSessionFilterInput
  $limit: Int
  $nextToken: String
) {
  listChatSessions(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      createdAt
      id
      mapBounds
      name
      owner
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListChatSessionsQueryVariables, APITypes.ListChatSessionsQuery>
export const listMapLayerByChatSessionIdAndOrder = /* GraphQL */ `query ListMapLayerByChatSessionIdAndOrder(
  $chatSessionId: ID!
  $filter: ModelMapLayerFilterInput
  $limit: Int
  $nextToken: String
  $order: ModelIntKeyConditionInput
  $sortDirection: ModelSortDirection
) {
  listMapLayerByChatSessionIdAndOrder(
    chatSessionId: $chatSessionId
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    order: $order
    sortDirection: $sortDirection
  ) {
    items {
      athenaDatabase
      athenaQuery
      chatSessionId
      createdAt
      description
      geoJsonMapping
      id
      lastQueryExecutedAt
      name
      order
      owner
      queryError
      queryRefreshInterval
      source
      style
      type
      updatedAt
      visible
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListMapLayerByChatSessionIdAndOrderQueryVariables,
  APITypes.ListMapLayerByChatSessionIdAndOrderQuery
>
export const listMapLayers = /* GraphQL */ `query ListMapLayers(
  $filter: ModelMapLayerFilterInput
  $limit: Int
  $nextToken: String
) {
  listMapLayers(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      athenaDatabase
      athenaQuery
      chatSessionId
      createdAt
      description
      geoJsonMapping
      id
      lastQueryExecutedAt
      name
      order
      owner
      queryError
      queryRefreshInterval
      source
      style
      type
      updatedAt
      visible
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListMapLayersQueryVariables, APITypes.ListMapLayersQuery>
export const listMcpServers = /* GraphQL */ `query ListMcpServers(
  $filter: ModelMcpServerFilterInput
  $limit: Int
  $nextToken: String
) {
  listMcpServers(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      createdAt
      enabled
      id
      name
      owner
      signRequestsWithAwsCreds
      updatedAt
      url
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListMcpServersQueryVariables, APITypes.ListMcpServersQuery>
export const listSettings = /* GraphQL */ `query ListSettings(
  $filter: ModelSettingsFilterInput
  $limit: Int
  $nextToken: String
) {
  listSettings(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      createdAt
      id
      name
      owner
      updatedAt
      value
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListSettingsQueryVariables, APITypes.ListSettingsQuery>
export const listWorkoverJobs = /* GraphQL */ `query ListWorkoverJobs(
  $filter: ModelWorkoverJobFilterInput
  $limit: Int
  $nextToken: String
) {
  listWorkoverJobs(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      createdAt
      description
      estimatedCost
      estimatedDuration
      id
      jobType
      location
      owner
      priority
      rigAssigned
      scheduledDate
      status
      updatedAt
      wellName
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListWorkoverJobsQueryVariables, APITypes.ListWorkoverJobsQuery>
