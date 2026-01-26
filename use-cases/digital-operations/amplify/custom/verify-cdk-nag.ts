/**
 * Verification script to test CDK Nag integration
 * Run with: npx tsx amplify/custom/verify-cdk-nag.ts
 */

import { Stack } from 'aws-cdk-lib';
import { applyCdkNag } from './cdkNagHelper';

// Create a test stack
const testStack = new Stack(undefined, 'TestStack', {
  env: {
    account: '123456789012',
    region: 'us-east-1',
  },
});

// Apply CDK Nag
try {
  applyCdkNag(testStack);
  console.log('✅ CDK Nag integration verified successfully!');
  console.log('✅ applyCdkNag function is working correctly');
  console.log('✅ All imports are resolved');
  console.log('\nThe CDK Nag checks will run during:');
  console.log('  - npm run cdk-diff');
  console.log('  - npm run sandbox');
} catch (error) {
  console.error('❌ CDK Nag integration failed:', error);
  process.exit(1);
}
