import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as aws_cognito from 'aws-cdk-lib/aws-cognito';
import { RemovalPolicy } from 'aws-cdk-lib/core';
import * as aws_lambda from "aws-cdk-lib/aws-lambda";
import * as aws_iam from "aws-cdk-lib/aws-iam";
import * as aws_logs from "aws-cdk-lib/aws-logs";
import * as custom_resources from "aws-cdk-lib/custom-resources";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Cognito User Pool
    const userPool = new aws_cognito.UserPool(this, "RuntimeUserPool", {
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: aws_cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create User Pool Client
    const userPoolClient = userPool.addClient("RuntimeUserPoolClient", {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });

    // Lambda function to create default user
    const createUserFunction = new aws_lambda.Function(
      this,
      "CreateDefaultUserFunction",
      {
        runtime: aws_lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: aws_lambda.Code.fromAsset("./lambda/create-user"),
        timeout: cdk.Duration.seconds(30),
        logRetention: aws_logs.RetentionDays.ONE_WEEK,
      }
    );

    // Grant permissions to Lambda to manage Cognito users
    createUserFunction.addToRolePolicy(
      new aws_iam.PolicyStatement({
        actions: [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminSetUserPassword",
        ],
        resources: [userPool.userPoolArn],
      })
    );

    // Custom resource to create default user
    const defaultUserProvider = new custom_resources.Provider(
      this,
      "DefaultUserProvider",
      {
        onEventHandler: createUserFunction,
        logRetention: aws_logs.RetentionDays.ONE_WEEK,
      }
    );

    new cdk.CustomResource(this, "DefaultUser", {
      serviceToken: defaultUserProvider.serviceToken,
      properties: {
        UserPoolId: userPool.userPoolId,
        Username: "admin",
        Email: "admin@example.com",
        Password: "TempPassword123!",
      },
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      description: "Cognito User Pool ID",
    });

    new cdk.CfnOutput(this, "DiscoveryURL", {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}/.well-known/openid-configuration`,
      description: "Cognito User Pool Discovery URL",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
    });

    new cdk.CfnOutput(this, "DefaultUsername", {
      value: "admin",
      description: "Default user username",
    });

    new cdk.CfnOutput(this, "DefaultUserEmail", {
      value: "admin@example.com",
      description: "Default user email",
    });
  }

}
