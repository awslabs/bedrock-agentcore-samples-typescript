'use client'
import { Amplify } from 'aws-amplify'
import outputs from '@/../amplify_outputs.json'

if (outputs) {
  Amplify.configure(outputs, { ssr: true })
} else {
  console.warn('Skipping Amplify configuration - outputs file not found')
}

const Page = () => null

export default Page