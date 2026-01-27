/* tslint:disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from './API'
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType
  __generatedSubscriptionOutput: OutputType
}

export const onAthenaQueryResult = /* GraphQL */ `subscription OnAthenaQueryResult($queryExecutionId: String!) {
  onAthenaQueryResult(queryExecutionId: $queryExecutionId) {
    columns
    data
    error
    nextToken
    queryExecutionId
    rowCount
    status
    __typename
  }
}
` as GeneratedSubscription<APITypes.OnAthenaQueryResultSubscriptionVariables, APITypes.OnAthenaQueryResultSubscription>
export const onCreateActionItem = /* GraphQL */ `subscription OnCreateActionItem(
  $filter: ModelSubscriptionActionItemFilterInput
  $owner: String
) {
  onCreateActionItem(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnCreateActionItemSubscriptionVariables, APITypes.OnCreateActionItemSubscription>
export const onCreateChatMessage = /* GraphQL */ `subscription OnCreateChatMessage(
  $filter: ModelSubscriptionChatMessageFilterInput
  $owner: String
) {
  onCreateChatMessage(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnCreateChatMessageSubscriptionVariables, APITypes.OnCreateChatMessageSubscription>
export const onCreateChatSession = /* GraphQL */ `subscription OnCreateChatSession(
  $filter: ModelSubscriptionChatSessionFilterInput
  $owner: String
) {
  onCreateChatSession(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnCreateChatSessionSubscriptionVariables, APITypes.OnCreateChatSessionSubscription>
export const onCreateMapLayer = /* GraphQL */ `subscription OnCreateMapLayer(
  $filter: ModelSubscriptionMapLayerFilterInput
  $owner: String
) {
  onCreateMapLayer(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnCreateMapLayerSubscriptionVariables, APITypes.OnCreateMapLayerSubscription>
export const onCreateMcpServer = /* GraphQL */ `subscription OnCreateMcpServer(
  $filter: ModelSubscriptionMcpServerFilterInput
  $owner: String
) {
  onCreateMcpServer(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnCreateMcpServerSubscriptionVariables, APITypes.OnCreateMcpServerSubscription>
export const onCreateSettings = /* GraphQL */ `subscription OnCreateSettings(
  $filter: ModelSubscriptionSettingsFilterInput
  $owner: String
) {
  onCreateSettings(filter: $filter, owner: $owner) {
    createdAt
    id
    name
    owner
    updatedAt
    value
    __typename
  }
}
` as GeneratedSubscription<APITypes.OnCreateSettingsSubscriptionVariables, APITypes.OnCreateSettingsSubscription>
export const onCreateWorkoverJob = /* GraphQL */ `subscription OnCreateWorkoverJob(
  $filter: ModelSubscriptionWorkoverJobFilterInput
  $owner: String
) {
  onCreateWorkoverJob(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnCreateWorkoverJobSubscriptionVariables, APITypes.OnCreateWorkoverJobSubscription>
export const onDeleteActionItem = /* GraphQL */ `subscription OnDeleteActionItem(
  $filter: ModelSubscriptionActionItemFilterInput
  $owner: String
) {
  onDeleteActionItem(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnDeleteActionItemSubscriptionVariables, APITypes.OnDeleteActionItemSubscription>
export const onDeleteChatMessage = /* GraphQL */ `subscription OnDeleteChatMessage(
  $filter: ModelSubscriptionChatMessageFilterInput
  $owner: String
) {
  onDeleteChatMessage(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnDeleteChatMessageSubscriptionVariables, APITypes.OnDeleteChatMessageSubscription>
export const onDeleteChatSession = /* GraphQL */ `subscription OnDeleteChatSession(
  $filter: ModelSubscriptionChatSessionFilterInput
  $owner: String
) {
  onDeleteChatSession(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnDeleteChatSessionSubscriptionVariables, APITypes.OnDeleteChatSessionSubscription>
export const onDeleteMapLayer = /* GraphQL */ `subscription OnDeleteMapLayer(
  $filter: ModelSubscriptionMapLayerFilterInput
  $owner: String
) {
  onDeleteMapLayer(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnDeleteMapLayerSubscriptionVariables, APITypes.OnDeleteMapLayerSubscription>
export const onDeleteMcpServer = /* GraphQL */ `subscription OnDeleteMcpServer(
  $filter: ModelSubscriptionMcpServerFilterInput
  $owner: String
) {
  onDeleteMcpServer(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnDeleteMcpServerSubscriptionVariables, APITypes.OnDeleteMcpServerSubscription>
export const onDeleteSettings = /* GraphQL */ `subscription OnDeleteSettings(
  $filter: ModelSubscriptionSettingsFilterInput
  $owner: String
) {
  onDeleteSettings(filter: $filter, owner: $owner) {
    createdAt
    id
    name
    owner
    updatedAt
    value
    __typename
  }
}
` as GeneratedSubscription<APITypes.OnDeleteSettingsSubscriptionVariables, APITypes.OnDeleteSettingsSubscription>
export const onDeleteWorkoverJob = /* GraphQL */ `subscription OnDeleteWorkoverJob(
  $filter: ModelSubscriptionWorkoverJobFilterInput
  $owner: String
) {
  onDeleteWorkoverJob(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnDeleteWorkoverJobSubscriptionVariables, APITypes.OnDeleteWorkoverJobSubscription>
export const onUpdateActionItem = /* GraphQL */ `subscription OnUpdateActionItem(
  $filter: ModelSubscriptionActionItemFilterInput
  $owner: String
) {
  onUpdateActionItem(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnUpdateActionItemSubscriptionVariables, APITypes.OnUpdateActionItemSubscription>
export const onUpdateChatMessage = /* GraphQL */ `subscription OnUpdateChatMessage(
  $filter: ModelSubscriptionChatMessageFilterInput
  $owner: String
) {
  onUpdateChatMessage(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnUpdateChatMessageSubscriptionVariables, APITypes.OnUpdateChatMessageSubscription>
export const onUpdateChatSession = /* GraphQL */ `subscription OnUpdateChatSession(
  $filter: ModelSubscriptionChatSessionFilterInput
  $owner: String
) {
  onUpdateChatSession(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnUpdateChatSessionSubscriptionVariables, APITypes.OnUpdateChatSessionSubscription>
export const onUpdateMapLayer = /* GraphQL */ `subscription OnUpdateMapLayer(
  $filter: ModelSubscriptionMapLayerFilterInput
  $owner: String
) {
  onUpdateMapLayer(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnUpdateMapLayerSubscriptionVariables, APITypes.OnUpdateMapLayerSubscription>
export const onUpdateMcpServer = /* GraphQL */ `subscription OnUpdateMcpServer(
  $filter: ModelSubscriptionMcpServerFilterInput
  $owner: String
) {
  onUpdateMcpServer(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnUpdateMcpServerSubscriptionVariables, APITypes.OnUpdateMcpServerSubscription>
export const onUpdateSettings = /* GraphQL */ `subscription OnUpdateSettings(
  $filter: ModelSubscriptionSettingsFilterInput
  $owner: String
) {
  onUpdateSettings(filter: $filter, owner: $owner) {
    createdAt
    id
    name
    owner
    updatedAt
    value
    __typename
  }
}
` as GeneratedSubscription<APITypes.OnUpdateSettingsSubscriptionVariables, APITypes.OnUpdateSettingsSubscription>
export const onUpdateWorkoverJob = /* GraphQL */ `subscription OnUpdateWorkoverJob(
  $filter: ModelSubscriptionWorkoverJobFilterInput
  $owner: String
) {
  onUpdateWorkoverJob(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnUpdateWorkoverJobSubscriptionVariables, APITypes.OnUpdateWorkoverJobSubscription>
