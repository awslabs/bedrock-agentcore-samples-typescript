import { Construct } from 'constructs';
import cdk, {
    aws_iam as iam,
    custom_resources,
} from 'aws-cdk-lib';

export interface SeedDataProps {
    settingsTable: cdk.aws_dynamodb.ITable;
}

export class SeedDataConstruct extends Construct {
    constructor(scope: Construct, id: string, props: SeedDataProps) {
        super(scope, id);

        // System prompt content to seed
        const systemPromptContent = `You are an advanced AI digital operations system which creates demos of how generative AI can improved digital operations workloads.
Call tools in parallel when possible.

When responding to the user:
- You can create plots/charts/visualizations in the response. To render these, use an <iframe> with srcdoc containing the plot HTML.
    - Only include one plot per iframe
    - The srcdoc should contain ONLY the data visualization (charts, graphs, gauges, plots)
    - Always use 100% width for the iframe
    - Examples of what belongs in iframes: bar charts, line graphs, pie charts, scatter plots, gauges, interactive visualizations
- CRITICAL: Do NOT put text content, alerts, status information, tables, lists, or any narrative content inside iframe srcdoc
    - All text, headings, alerts, descriptions, tables, status updates, and narrative information MUST be in markdown format outside the iframe
    - Examples of what should be markdown: safety alerts, event descriptions, operational status, recommendations, summaries, data tables
- For all other response elements (text, lists, headings, tables, alerts, etc.), use markdown formatting, NOT HTML
- The user prefers plots to text when reading your response.
- After creating map layers, you can render the map using an iframe which links to the map page '<iframe src="/map">'

Mapping guidance:
- If you don't have the required data for a use case, generate realistic data
- For mapping, you can define the latitude / longitude coordinates in the query script
- After creating a map layer, render the map '<iframe src="/map">' in your response.

AFTER RESPONDING: Call the generate_suggestions tool to provide 3-4 helpful follow-up questions the user might want to ask.
`;

        // Create a custom resource to seed the Settings table with the system prompt
        new custom_resources.AwsCustomResource(scope, 'SystemPromptSeedData', {
            onCreate: {
                service: 'DynamoDB',
                action: 'putItem',
                parameters: {
                    TableName: props.settingsTable.tableName,
                    Item: {
                        name: { S: 'system_prompt' },
                        value: { S: systemPromptContent },
                        id: { S: 'system_prompt_setting' },
                        __typename: { S: 'Settings' },
                        createdAt: { S: '2024-01-01T00:00:00.000Z' },
                        updatedAt: { S: '2024-01-01T00:00:00.000Z' },
                        owner: { S: 'system' },
                    }
                },
                physicalResourceId: custom_resources.PhysicalResourceId.of('SystemPromptSeedData')
            },
            onUpdate: {
                service: 'DynamoDB',
                action: 'putItem',
                parameters: {
                    TableName: props.settingsTable.tableName,
                    Item: {
                        name: { S: 'system_prompt' },
                        value: { S: systemPromptContent },
                        id: { S: 'system_prompt_setting' },
                        __typename: { S: 'Settings' },
                        createdAt: { S: '2024-01-01T00:00:00.000Z' },
                        updatedAt: { S: '2024-01-01T00:00:00.000Z' },
                        owner: { S: 'system' },
                    }
                },
                physicalResourceId: custom_resources.PhysicalResourceId.of('SystemPromptSeedData')
            },
            policy: custom_resources.AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                    actions: ['dynamodb:PutItem'],
                    resources: [props.settingsTable.tableArn],
                }),
            ]),
        });
    }
}
