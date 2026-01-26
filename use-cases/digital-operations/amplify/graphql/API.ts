/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type ChatMessage = {
  __typename: "ChatMessage",
  chatSession?: ChatSession | null,
  chatSessionId?: string | null,
  chatSessionIdUnderscoreAgentId?: string | null,
  createdAt?: string | null,
  id: string,
  metadata?: string | null,
  owner?: string | null,
  parts: string,
  responseComplete?: boolean | null,
  role: Roles,
  updatedAt: string,
};

export type ChatSession = {
  __typename: "ChatSession",
  createdAt: string,
  id: string,
  messages?: ModelChatMessageConnection | null,
  name?: string | null,
  owner?: string | null,
  updatedAt: string,
};

export type ModelChatMessageConnection = {
  __typename: "ModelChatMessageConnection",
  items:  Array<ChatMessage | null >,
  nextToken?: string | null,
};

export enum Roles {
  assistant = "assistant",
  system = "system",
  user = "user",
}


export type McpServer = {
  __typename: "McpServer",
  createdAt: string,
  enabled?: boolean | null,
  headers?:  Array<HeaderEntry | null > | null,
  id: string,
  name: string,
  owner?: string | null,
  signRequestsWithAwsCreds?: boolean | null,
  tools?:  Array<Tool | null > | null,
  updatedAt: string,
  url?: string | null,
};

export type HeaderEntry = {
  __typename: "HeaderEntry",
  key?: string | null,
  value?: string | null,
};

export type Tool = {
  __typename: "Tool",
  description?: string | null,
  name?: string | null,
  schema?: string | null,
};

export type Settings = {
  __typename: "Settings",
  createdAt: string,
  id: string,
  name?: string | null,
  owner?: string | null,
  updatedAt: string,
  value?: string | null,
};

export type ModelStringKeyConditionInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
};

export type ModelChatMessageFilterInput = {
  and?: Array< ModelChatMessageFilterInput | null > | null,
  chatSessionId?: ModelIDInput | null,
  chatSessionIdUnderscoreAgentId?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  metadata?: ModelStringInput | null,
  not?: ModelChatMessageFilterInput | null,
  or?: Array< ModelChatMessageFilterInput | null > | null,
  owner?: ModelStringInput | null,
  parts?: ModelStringInput | null,
  responseComplete?: ModelBooleanInput | null,
  role?: ModelRolesInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelIDInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export enum ModelAttributeTypes {
  _null = "_null",
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
}


export type ModelSizeInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelStringInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export type ModelBooleanInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  eq?: boolean | null,
  ne?: boolean | null,
};

export type ModelRolesInput = {
  eq?: Roles | null,
  ne?: Roles | null,
};

export enum ModelSortDirection {
  ASC = "ASC",
  DESC = "DESC",
}


export type ModelChatSessionFilterInput = {
  and?: Array< ModelChatSessionFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  name?: ModelStringInput | null,
  not?: ModelChatSessionFilterInput | null,
  or?: Array< ModelChatSessionFilterInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelChatSessionConnection = {
  __typename: "ModelChatSessionConnection",
  items:  Array<ChatSession | null >,
  nextToken?: string | null,
};

export type ModelMcpServerFilterInput = {
  and?: Array< ModelMcpServerFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  enabled?: ModelBooleanInput | null,
  id?: ModelIDInput | null,
  name?: ModelStringInput | null,
  not?: ModelMcpServerFilterInput | null,
  or?: Array< ModelMcpServerFilterInput | null > | null,
  owner?: ModelStringInput | null,
  signRequestsWithAwsCreds?: ModelBooleanInput | null,
  updatedAt?: ModelStringInput | null,
  url?: ModelStringInput | null,
};

export type ModelMcpServerConnection = {
  __typename: "ModelMcpServerConnection",
  items:  Array<McpServer | null >,
  nextToken?: string | null,
};

export type ModelSettingsFilterInput = {
  and?: Array< ModelSettingsFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  name?: ModelStringInput | null,
  not?: ModelSettingsFilterInput | null,
  or?: Array< ModelSettingsFilterInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  value?: ModelStringInput | null,
};

export type ModelSettingsConnection = {
  __typename: "ModelSettingsConnection",
  items:  Array<Settings | null >,
  nextToken?: string | null,
};

export type ModelChatMessageConditionInput = {
  and?: Array< ModelChatMessageConditionInput | null > | null,
  chatSessionId?: ModelIDInput | null,
  chatSessionIdUnderscoreAgentId?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  metadata?: ModelStringInput | null,
  not?: ModelChatMessageConditionInput | null,
  or?: Array< ModelChatMessageConditionInput | null > | null,
  owner?: ModelStringInput | null,
  parts?: ModelStringInput | null,
  responseComplete?: ModelBooleanInput | null,
  role?: ModelRolesInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateChatMessageInput = {
  chatSessionId?: string | null,
  chatSessionIdUnderscoreAgentId?: string | null,
  createdAt?: string | null,
  id?: string | null,
  metadata?: string | null,
  owner?: string | null,
  parts: string,
  responseComplete?: boolean | null,
  role: Roles,
};

export type ModelChatSessionConditionInput = {
  and?: Array< ModelChatSessionConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  name?: ModelStringInput | null,
  not?: ModelChatSessionConditionInput | null,
  or?: Array< ModelChatSessionConditionInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateChatSessionInput = {
  id?: string | null,
  name?: string | null,
};

export type ModelMcpServerConditionInput = {
  and?: Array< ModelMcpServerConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  enabled?: ModelBooleanInput | null,
  name?: ModelStringInput | null,
  not?: ModelMcpServerConditionInput | null,
  or?: Array< ModelMcpServerConditionInput | null > | null,
  owner?: ModelStringInput | null,
  signRequestsWithAwsCreds?: ModelBooleanInput | null,
  updatedAt?: ModelStringInput | null,
  url?: ModelStringInput | null,
};

export type CreateMcpServerInput = {
  enabled?: boolean | null,
  headers?: Array< HeaderEntryInput | null > | null,
  id?: string | null,
  name: string,
  signRequestsWithAwsCreds?: boolean | null,
  tools?: Array< ToolInput | null > | null,
  url?: string | null,
};

export type HeaderEntryInput = {
  key?: string | null,
  value?: string | null,
};

export type ToolInput = {
  description?: string | null,
  name?: string | null,
  schema?: string | null,
};

export type ModelSettingsConditionInput = {
  and?: Array< ModelSettingsConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  name?: ModelStringInput | null,
  not?: ModelSettingsConditionInput | null,
  or?: Array< ModelSettingsConditionInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  value?: ModelStringInput | null,
};

export type CreateSettingsInput = {
  id?: string | null,
  name?: string | null,
  value?: string | null,
};

export type DeleteChatMessageInput = {
  id: string,
};

export type DeleteChatSessionInput = {
  id: string,
};

export type DeleteMcpServerInput = {
  id: string,
};

export type DeleteSettingsInput = {
  id: string,
};

export type UpdateChatMessageInput = {
  chatSessionId?: string | null,
  chatSessionIdUnderscoreAgentId?: string | null,
  createdAt?: string | null,
  id: string,
  metadata?: string | null,
  owner?: string | null,
  parts?: string | null,
  responseComplete?: boolean | null,
  role?: Roles | null,
};

export type UpdateChatSessionInput = {
  id: string,
  name?: string | null,
};

export type UpdateMcpServerInput = {
  enabled?: boolean | null,
  headers?: Array< HeaderEntryInput | null > | null,
  id: string,
  name?: string | null,
  signRequestsWithAwsCreds?: boolean | null,
  tools?: Array< ToolInput | null > | null,
  url?: string | null,
};

export type UpdateSettingsInput = {
  id: string,
  name?: string | null,
  value?: string | null,
};

export type ModelSubscriptionChatMessageFilterInput = {
  and?: Array< ModelSubscriptionChatMessageFilterInput | null > | null,
  chatSessionId?: ModelSubscriptionIDInput | null,
  chatSessionIdUnderscoreAgentId?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  metadata?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionChatMessageFilterInput | null > | null,
  owner?: ModelStringInput | null,
  parts?: ModelSubscriptionStringInput | null,
  responseComplete?: ModelSubscriptionBooleanInput | null,
  role?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionIDInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionStringInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionBooleanInput = {
  eq?: boolean | null,
  ne?: boolean | null,
};

export type ModelSubscriptionChatSessionFilterInput = {
  and?: Array< ModelSubscriptionChatSessionFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  name?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionChatSessionFilterInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionMcpServerFilterInput = {
  and?: Array< ModelSubscriptionMcpServerFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  enabled?: ModelSubscriptionBooleanInput | null,
  id?: ModelSubscriptionIDInput | null,
  name?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionMcpServerFilterInput | null > | null,
  owner?: ModelStringInput | null,
  signRequestsWithAwsCreds?: ModelSubscriptionBooleanInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  url?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionSettingsFilterInput = {
  and?: Array< ModelSubscriptionSettingsFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  name?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionSettingsFilterInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  value?: ModelSubscriptionStringInput | null,
};

export type GetChatMessageQueryVariables = {
  id: string,
};

export type GetChatMessageQuery = {
  getChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreAgentId?: string | null,
    createdAt?: string | null,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    parts: string,
    responseComplete?: boolean | null,
    role: Roles,
    updatedAt: string,
  } | null,
};

export type GetChatSessionQueryVariables = {
  id: string,
};

export type GetChatSessionQuery = {
  getChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
  } | null,
};

export type GetMcpServerQueryVariables = {
  id: string,
};

export type GetMcpServerQuery = {
  getMcpServer?:  {
    __typename: "McpServer",
    createdAt: string,
    enabled?: boolean | null,
    headers?:  Array< {
      __typename: "HeaderEntry",
      key?: string | null,
      value?: string | null,
    } | null > | null,
    id: string,
    name: string,
    owner?: string | null,
    signRequestsWithAwsCreds?: boolean | null,
    tools?:  Array< {
      __typename: "Tool",
      description?: string | null,
      name?: string | null,
      schema?: string | null,
    } | null > | null,
    updatedAt: string,
    url?: string | null,
  } | null,
};

export type GetSettingsQueryVariables = {
  id: string,
};

export type GetSettingsQuery = {
  getSettings?:  {
    __typename: "Settings",
    createdAt: string,
    id: string,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    value?: string | null,
  } | null,
};

export type ListChatMessageByChatSessionIdAndCreatedAtQueryVariables = {
  chatSessionId: string,
  createdAt?: ModelStringKeyConditionInput | null,
  filter?: ModelChatMessageFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListChatMessageByChatSessionIdAndCreatedAtQuery = {
  listChatMessageByChatSessionIdAndCreatedAt?:  {
    __typename: "ModelChatMessageConnection",
    items:  Array< {
      __typename: "ChatMessage",
      chatSessionId?: string | null,
      chatSessionIdUnderscoreAgentId?: string | null,
      createdAt?: string | null,
      id: string,
      metadata?: string | null,
      owner?: string | null,
      parts: string,
      responseComplete?: boolean | null,
      role: Roles,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListChatMessageByChatSessionIdUnderscoreAgentIdAndCreatedAtQueryVariables = {
  chatSessionIdUnderscoreAgentId: string,
  createdAt?: ModelStringKeyConditionInput | null,
  filter?: ModelChatMessageFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListChatMessageByChatSessionIdUnderscoreAgentIdAndCreatedAtQuery = {
  listChatMessageByChatSessionIdUnderscoreAgentIdAndCreatedAt?:  {
    __typename: "ModelChatMessageConnection",
    items:  Array< {
      __typename: "ChatMessage",
      chatSessionId?: string | null,
      chatSessionIdUnderscoreAgentId?: string | null,
      createdAt?: string | null,
      id: string,
      metadata?: string | null,
      owner?: string | null,
      parts: string,
      responseComplete?: boolean | null,
      role: Roles,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListChatMessagesQueryVariables = {
  filter?: ModelChatMessageFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListChatMessagesQuery = {
  listChatMessages?:  {
    __typename: "ModelChatMessageConnection",
    items:  Array< {
      __typename: "ChatMessage",
      chatSessionId?: string | null,
      chatSessionIdUnderscoreAgentId?: string | null,
      createdAt?: string | null,
      id: string,
      metadata?: string | null,
      owner?: string | null,
      parts: string,
      responseComplete?: boolean | null,
      role: Roles,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListChatSessionsQueryVariables = {
  filter?: ModelChatSessionFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListChatSessionsQuery = {
  listChatSessions?:  {
    __typename: "ModelChatSessionConnection",
    items:  Array< {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListMcpServersQueryVariables = {
  filter?: ModelMcpServerFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListMcpServersQuery = {
  listMcpServers?:  {
    __typename: "ModelMcpServerConnection",
    items:  Array< {
      __typename: "McpServer",
      createdAt: string,
      enabled?: boolean | null,
      id: string,
      name: string,
      owner?: string | null,
      signRequestsWithAwsCreds?: boolean | null,
      updatedAt: string,
      url?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListSettingsQueryVariables = {
  filter?: ModelSettingsFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListSettingsQuery = {
  listSettings?:  {
    __typename: "ModelSettingsConnection",
    items:  Array< {
      __typename: "Settings",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
      value?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type CreateChatMessageMutationVariables = {
  condition?: ModelChatMessageConditionInput | null,
  input: CreateChatMessageInput,
};

export type CreateChatMessageMutation = {
  createChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreAgentId?: string | null,
    createdAt?: string | null,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    parts: string,
    responseComplete?: boolean | null,
    role: Roles,
    updatedAt: string,
  } | null,
};

export type CreateChatSessionMutationVariables = {
  condition?: ModelChatSessionConditionInput | null,
  input: CreateChatSessionInput,
};

export type CreateChatSessionMutation = {
  createChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
  } | null,
};

export type CreateMcpServerMutationVariables = {
  condition?: ModelMcpServerConditionInput | null,
  input: CreateMcpServerInput,
};

export type CreateMcpServerMutation = {
  createMcpServer?:  {
    __typename: "McpServer",
    createdAt: string,
    enabled?: boolean | null,
    headers?:  Array< {
      __typename: "HeaderEntry",
      key?: string | null,
      value?: string | null,
    } | null > | null,
    id: string,
    name: string,
    owner?: string | null,
    signRequestsWithAwsCreds?: boolean | null,
    tools?:  Array< {
      __typename: "Tool",
      description?: string | null,
      name?: string | null,
      schema?: string | null,
    } | null > | null,
    updatedAt: string,
    url?: string | null,
  } | null,
};

export type CreateSettingsMutationVariables = {
  condition?: ModelSettingsConditionInput | null,
  input: CreateSettingsInput,
};

export type CreateSettingsMutation = {
  createSettings?:  {
    __typename: "Settings",
    createdAt: string,
    id: string,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    value?: string | null,
  } | null,
};

export type DeleteChatMessageMutationVariables = {
  condition?: ModelChatMessageConditionInput | null,
  input: DeleteChatMessageInput,
};

export type DeleteChatMessageMutation = {
  deleteChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreAgentId?: string | null,
    createdAt?: string | null,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    parts: string,
    responseComplete?: boolean | null,
    role: Roles,
    updatedAt: string,
  } | null,
};

export type DeleteChatSessionMutationVariables = {
  condition?: ModelChatSessionConditionInput | null,
  input: DeleteChatSessionInput,
};

export type DeleteChatSessionMutation = {
  deleteChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteMcpServerMutationVariables = {
  condition?: ModelMcpServerConditionInput | null,
  input: DeleteMcpServerInput,
};

export type DeleteMcpServerMutation = {
  deleteMcpServer?:  {
    __typename: "McpServer",
    createdAt: string,
    enabled?: boolean | null,
    headers?:  Array< {
      __typename: "HeaderEntry",
      key?: string | null,
      value?: string | null,
    } | null > | null,
    id: string,
    name: string,
    owner?: string | null,
    signRequestsWithAwsCreds?: boolean | null,
    tools?:  Array< {
      __typename: "Tool",
      description?: string | null,
      name?: string | null,
      schema?: string | null,
    } | null > | null,
    updatedAt: string,
    url?: string | null,
  } | null,
};

export type DeleteSettingsMutationVariables = {
  condition?: ModelSettingsConditionInput | null,
  input: DeleteSettingsInput,
};

export type DeleteSettingsMutation = {
  deleteSettings?:  {
    __typename: "Settings",
    createdAt: string,
    id: string,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    value?: string | null,
  } | null,
};

export type UpdateChatMessageMutationVariables = {
  condition?: ModelChatMessageConditionInput | null,
  input: UpdateChatMessageInput,
};

export type UpdateChatMessageMutation = {
  updateChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreAgentId?: string | null,
    createdAt?: string | null,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    parts: string,
    responseComplete?: boolean | null,
    role: Roles,
    updatedAt: string,
  } | null,
};

export type UpdateChatSessionMutationVariables = {
  condition?: ModelChatSessionConditionInput | null,
  input: UpdateChatSessionInput,
};

export type UpdateChatSessionMutation = {
  updateChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateMcpServerMutationVariables = {
  condition?: ModelMcpServerConditionInput | null,
  input: UpdateMcpServerInput,
};

export type UpdateMcpServerMutation = {
  updateMcpServer?:  {
    __typename: "McpServer",
    createdAt: string,
    enabled?: boolean | null,
    headers?:  Array< {
      __typename: "HeaderEntry",
      key?: string | null,
      value?: string | null,
    } | null > | null,
    id: string,
    name: string,
    owner?: string | null,
    signRequestsWithAwsCreds?: boolean | null,
    tools?:  Array< {
      __typename: "Tool",
      description?: string | null,
      name?: string | null,
      schema?: string | null,
    } | null > | null,
    updatedAt: string,
    url?: string | null,
  } | null,
};

export type UpdateSettingsMutationVariables = {
  condition?: ModelSettingsConditionInput | null,
  input: UpdateSettingsInput,
};

export type UpdateSettingsMutation = {
  updateSettings?:  {
    __typename: "Settings",
    createdAt: string,
    id: string,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    value?: string | null,
  } | null,
};

export type OnCreateChatMessageSubscriptionVariables = {
  filter?: ModelSubscriptionChatMessageFilterInput | null,
  owner?: string | null,
};

export type OnCreateChatMessageSubscription = {
  onCreateChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreAgentId?: string | null,
    createdAt?: string | null,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    parts: string,
    responseComplete?: boolean | null,
    role: Roles,
    updatedAt: string,
  } | null,
};

export type OnCreateChatSessionSubscriptionVariables = {
  filter?: ModelSubscriptionChatSessionFilterInput | null,
  owner?: string | null,
};

export type OnCreateChatSessionSubscription = {
  onCreateChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateMcpServerSubscriptionVariables = {
  filter?: ModelSubscriptionMcpServerFilterInput | null,
  owner?: string | null,
};

export type OnCreateMcpServerSubscription = {
  onCreateMcpServer?:  {
    __typename: "McpServer",
    createdAt: string,
    enabled?: boolean | null,
    headers?:  Array< {
      __typename: "HeaderEntry",
      key?: string | null,
      value?: string | null,
    } | null > | null,
    id: string,
    name: string,
    owner?: string | null,
    signRequestsWithAwsCreds?: boolean | null,
    tools?:  Array< {
      __typename: "Tool",
      description?: string | null,
      name?: string | null,
      schema?: string | null,
    } | null > | null,
    updatedAt: string,
    url?: string | null,
  } | null,
};

export type OnCreateSettingsSubscriptionVariables = {
  filter?: ModelSubscriptionSettingsFilterInput | null,
  owner?: string | null,
};

export type OnCreateSettingsSubscription = {
  onCreateSettings?:  {
    __typename: "Settings",
    createdAt: string,
    id: string,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    value?: string | null,
  } | null,
};

export type OnDeleteChatMessageSubscriptionVariables = {
  filter?: ModelSubscriptionChatMessageFilterInput | null,
  owner?: string | null,
};

export type OnDeleteChatMessageSubscription = {
  onDeleteChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreAgentId?: string | null,
    createdAt?: string | null,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    parts: string,
    responseComplete?: boolean | null,
    role: Roles,
    updatedAt: string,
  } | null,
};

export type OnDeleteChatSessionSubscriptionVariables = {
  filter?: ModelSubscriptionChatSessionFilterInput | null,
  owner?: string | null,
};

export type OnDeleteChatSessionSubscription = {
  onDeleteChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteMcpServerSubscriptionVariables = {
  filter?: ModelSubscriptionMcpServerFilterInput | null,
  owner?: string | null,
};

export type OnDeleteMcpServerSubscription = {
  onDeleteMcpServer?:  {
    __typename: "McpServer",
    createdAt: string,
    enabled?: boolean | null,
    headers?:  Array< {
      __typename: "HeaderEntry",
      key?: string | null,
      value?: string | null,
    } | null > | null,
    id: string,
    name: string,
    owner?: string | null,
    signRequestsWithAwsCreds?: boolean | null,
    tools?:  Array< {
      __typename: "Tool",
      description?: string | null,
      name?: string | null,
      schema?: string | null,
    } | null > | null,
    updatedAt: string,
    url?: string | null,
  } | null,
};

export type OnDeleteSettingsSubscriptionVariables = {
  filter?: ModelSubscriptionSettingsFilterInput | null,
  owner?: string | null,
};

export type OnDeleteSettingsSubscription = {
  onDeleteSettings?:  {
    __typename: "Settings",
    createdAt: string,
    id: string,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    value?: string | null,
  } | null,
};

export type OnUpdateChatMessageSubscriptionVariables = {
  filter?: ModelSubscriptionChatMessageFilterInput | null,
  owner?: string | null,
};

export type OnUpdateChatMessageSubscription = {
  onUpdateChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreAgentId?: string | null,
    createdAt?: string | null,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    parts: string,
    responseComplete?: boolean | null,
    role: Roles,
    updatedAt: string,
  } | null,
};

export type OnUpdateChatSessionSubscriptionVariables = {
  filter?: ModelSubscriptionChatSessionFilterInput | null,
  owner?: string | null,
};

export type OnUpdateChatSessionSubscription = {
  onUpdateChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateMcpServerSubscriptionVariables = {
  filter?: ModelSubscriptionMcpServerFilterInput | null,
  owner?: string | null,
};

export type OnUpdateMcpServerSubscription = {
  onUpdateMcpServer?:  {
    __typename: "McpServer",
    createdAt: string,
    enabled?: boolean | null,
    headers?:  Array< {
      __typename: "HeaderEntry",
      key?: string | null,
      value?: string | null,
    } | null > | null,
    id: string,
    name: string,
    owner?: string | null,
    signRequestsWithAwsCreds?: boolean | null,
    tools?:  Array< {
      __typename: "Tool",
      description?: string | null,
      name?: string | null,
      schema?: string | null,
    } | null > | null,
    updatedAt: string,
    url?: string | null,
  } | null,
};

export type OnUpdateSettingsSubscriptionVariables = {
  filter?: ModelSubscriptionSettingsFilterInput | null,
  owner?: string | null,
};

export type OnUpdateSettingsSubscription = {
  onUpdateSettings?:  {
    __typename: "Settings",
    createdAt: string,
    id: string,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    value?: string | null,
  } | null,
};
