'use client';
import { Amplify } from 'aws-amplify';
import { loadOutputs } from '@/../utils/amplifyUtils'

const outputs = loadOutputs();
if (outputs) {
  Amplify.configure(outputs, { ssr: true });
} else {
  console.warn('Skipping Amplify configuration - outputs file not found');
}

const Page = () => null

export default Page;