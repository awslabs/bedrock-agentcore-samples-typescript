#!/usr/bin/env node

const { execSync } = require('child_process');
const prompt = require('prompt-sync')({ sigint: true });
const fs = require('fs');
const path = require('path');

function question(promptText) {
  return prompt(promptText);
}

function questionHidden(promptText) {
  return prompt(promptText, { echo: '*' });
}

function getAmplifyConfig() {
  try {
    const amplifyOutputsPath = path.join(__dirname, '..', 'amplify_outputs.json');
    const amplifyOutputs = JSON.parse(fs.readFileSync(amplifyOutputsPath, 'utf8'));
    return {
      userPoolId: amplifyOutputs.auth.user_pool_id,
      region: amplifyOutputs.auth.aws_region
    };
  } catch (error) {
    console.log('❌ Error reading amplify_outputs.json:');
    console.log(`   ${error.message}`);
    console.log('   Make sure amplify_outputs.json exists in the project root.');
    process.exit(1);
  }
}

async function createUser() {
  try {
    console.log('🚀 AWS Cognito User Creation Script');
    console.log('=====================================\n');
    
    const email = await question('Enter email address: ');
    
    if (!email || !email.includes('@')) {
      console.log('❌ Please enter a valid email address.');
      process.exit(1);
    }
    
    const tempPassword = await questionHidden('Enter temporary password (min 8 chars, must include uppercase, lowercase, number, and symbol): ');
    
    if (!tempPassword || tempPassword.length < 8) {
      console.log('\n❌ Password must be at least 8 characters long.');
      process.exit(1);
    }
    
    console.log('\n🔄 Creating user in Cognito User Pool...');
    
    const config = getAmplifyConfig();
    console.log(`   Using User Pool ID: ${config.userPoolId}`);
    console.log(`   Using AWS Region: ${config.region}`);
    
    const command = `aws cognito-idp admin-create-user --user-pool-id ${config.userPoolId} --username "${email}" --user-attributes Name=email,Value="${email}" Name=email_verified,Value=true --temporary-password "${tempPassword}" --message-action SUPPRESS --region ${config.region}`;
    
    const result = execSync(command, { encoding: 'utf8' });
    
    console.log('✅ User created successfully!');
    console.log('\n📋 User Details:');
    console.log(`   Email: ${email}`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Navigate to your application');
    console.log('   2. Click "Login" and use the email and temporary password you just entered');
    console.log('   3. You will be prompted to set a new permanent password');
    console.log('\n🎉 Happy coding!');
    
  } catch (error) {
    console.log('\n❌ Error creating user:');
    if (error.message.includes('UsernameExistsException')) {
      console.log('   A user with this email already exists.');
    } else if (error.message.includes('InvalidPasswordException')) {
      console.log('   Password does not meet requirements. Must include:');
      console.log('   - At least 8 characters');
      console.log('   - Uppercase letter');
      console.log('   - Lowercase letter');
      console.log('   - Number');
      console.log('   - Special character');
    } else if (error.message.includes('aws: command not found')) {
      console.log('   AWS CLI is not installed or not in PATH.');
      console.log('   Please install AWS CLI: https://aws.amazon.com/cli/');
    } else if (error.message.includes('Unable to locate credentials')) {
      console.log('   AWS credentials not configured.');
      console.log('   Please run: aws configure');
    } else {
      console.log(`   ${error.message}`);
    }
    process.exit(1);
  }
}

createUser();
