import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { Schema } from "../amplify/data/resource";
// import { Message } from "./types";
import { STSClient } from "@aws-sdk/client-sts";

// Function to safely load outputs
export const loadOutputs = () => {
  try {
    return require('../amplify_outputs.json');
  } catch (error) {
    console.warn('amplify_outputs.json not found - this is expected during initial build');
    return null;
  }
};

export const getConfiguredAmplifyClient = () => {
  Amplify.configure(
    {
      API: {
        GraphQL: {
          endpoint: process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT!, // replace with your defineData name
          region: process.env.AWS_REGION,
          defaultAuthMode: 'identityPool'
        }
      }
    },
    {
      Auth: {
        credentialsProvider: {
          getCredentialsAndIdentityId: async () => ({
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
              sessionToken: process.env.AWS_SESSION_TOKEN!,
            },
          }),
          clearCredentialsAndIdentityId: () => {
            /* noop */
          },
        },
      },
    }
  );

  const amplifyClient = generateClient<Schema>();

  return amplifyClient;
}

export const setAmplifyEnvVars = async () => {
  // Import required dependencies if not already available
  try {
    const outputs = loadOutputs();
    if (!outputs) {
      console.warn('Unable to set Amplify environment variables - outputs file not found');
      return {
        success: false,
        error: new Error('amplify_outputs.json not found')
      };
    }

    process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT = outputs.data.url;
    process.env.AWS_DEFAULT_REGION = outputs.auth.aws_region;

    // Get credentials using STS
    const stsClient = new STSClient({ region: outputs.auth.aws_region});
    const credentials = await stsClient.config.credentials();
    
    // Set AWS credentials environment variables
    process.env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
    process.env.AWS_SESSION_TOKEN = credentials.sessionToken;
    
    return {
      success: true
    };
  } catch (error) {
    console.error("Error setting Amplify environment variables:", error);
    return {
      success: false,
      error
    };
  }
}

// export const combineAndSortMessages = ((arr1: Array<Message>, arr2: Array<Message>) => {
//   const combinedMessages = [...arr1, ...arr2]
//   const uniqueMessages = combinedMessages.filter((message, index, self) =>
//     index === self.findIndex((p) => p.id === message.id)
//   );
//   return uniqueMessages.sort((a, b) => {
//     if (!a.createdAt || !b.createdAt) throw new Error("createdAt is missing")
//     return a.createdAt.localeCompare(b.createdAt)
//   });
// })

// export const sendMessage = async (props: {
//   chatSessionId: string,
//   newMessage: Schema['ChatMessage']['createType']
// }) => {
//   const amplifyClient = generateClient<Schema>();
//   const { data: newMessageData } = await amplifyClient.models.ChatMessage.create(props.newMessage)

//   if (!props.newMessage.content || !props.newMessage.content.text) throw new Error("content.text is missing")
//   const invokeResponse = await amplifyClient.queries.invokeReActAgent({
//     chatSessionId: props.chatSessionId,
//     // userInput: props.newMessage.content.text
//   })

//   console.log('invokeResponse: ', invokeResponse)

//   return {
//     newMessageData,
//     invokeResponse
//   }
// }


