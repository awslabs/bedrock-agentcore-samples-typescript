# CDK Nag Integration

This project uses [cdk-nag](https://github.com/cdklabs/cdk-nag) to validate AWS CDK applications against best practices and security standards.

## Overview

The `cdkNagHelper.ts` file provides automated CDK Nag checks and suppressions for the Amplify backend stack. It applies AWS Solutions checks and automatically adds appropriate suppressions for resources that require them.

## How It Works

1. **Automatic Application**: The `applyCdkNag()` function is called at the end of `backend.ts` to apply nag checks to the entire stack.

2. **Tree Traversal**: The helper traverses the CDK construct tree and identifies different resource types (Lambda, Cognito, AppSync, IAM, DynamoDB, S3).

3. **Targeted Suppressions**: Each resource type gets specific suppressions with documented reasons for why they're acceptable.

## Suppressed Rules

### Stack-Level Suppressions
- **AwsSolutions-IAM4**: AWS managed policies are used by Amplify-generated roles
- **AwsSolutions-IAM5**: Wildcard permissions required for dynamic resources

### Lambda Functions
- **AwsSolutions-L1**: Runtime version managed by Amplify
- **AwsSolutions-IAM4**: Execution role uses AWS managed policies
- **AwsSolutions-IAM5**: Wildcard permissions for Athena, Glue, S3

### Cognito User Pools
- **AwsSolutions-COG1**: Password policy configured appropriately
- **AwsSolutions-COG2**: MFA optional per user
- **AwsSolutions-COG3**: Advanced security mode not required

### AppSync GraphQL APIs
- **AwsSolutions-ASC3**: Cognito authentication configured
- **AwsSolutions-IAM5**: Wildcard permissions for GraphQL operations

### IAM Roles & Policies
- **AwsSolutions-IAM4**: AWS managed policies maintained by AWS
- **AwsSolutions-IAM5**: Wildcard permissions for dynamic resources

### DynamoDB Tables
- **AwsSolutions-DDB3**: Point-in-time recovery not required for dev/demo

### S3 Buckets
- **AwsSolutions-S1**: Access logging not required
- **AwsSolutions-S2**: Access controls configured appropriately
- **AwsSolutions-S10**: Bucket policy configured appropriately

## Running CDK Nag Checks

The nag checks run automatically during CDK synthesis. To see the results:

```bash
npm run cdk-diff
```

Or during deployment:

```bash
npm run sandbox
```

## Adding Custom Suppressions

To add suppressions for specific resources, edit `cdkNagHelper.ts` and add them in the appropriate function or create a new function for a new resource type.

Example:
```typescript
function applyCustomResourceSuppressions(stack: Stack, path: string): void {
  NagSuppressions.addResourceSuppressionsByPath(
    stack,
    path,
    [
      {
        id: 'AwsSolutions-XXX',
        reason: 'Explanation of why this suppression is acceptable.',
      },
    ]
  );
}
```

## Modifying Nag Checks

To change which nag pack is used or add additional checks, modify the `applyCdkNag()` function:

```typescript
export function applyCdkNag(stack: Stack): void {
  // Use different nag pack
  Aspects.of(stack).add(new HIPAASecurityChecks({ verbose: true }));
  
  // Or add multiple packs
  Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
  Aspects.of(stack).add(new NIST80053R5Checks({ verbose: true }));
  
  applyStackSuppressions(stack);
}
```

## Best Practices

1. **Document Suppressions**: Always provide clear reasons for suppressions
2. **Review Regularly**: Periodically review suppressions to ensure they're still valid
3. **Minimize Suppressions**: Only suppress rules when there's a legitimate reason
4. **Production Hardening**: Consider removing dev/demo suppressions for production deployments

## Resources

- [CDK Nag Documentation](https://github.com/cdklabs/cdk-nag)
- [AWS Solutions Checks](https://github.com/cdklabs/cdk-nag/blob/main/RULES.md)
- [CDK Best Practices](https://docs.aws.amazon.com/cdk/latest/guide/best-practices.html)
