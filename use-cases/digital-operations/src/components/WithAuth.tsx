"use client"
import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react';

interface WithAuthProps {
  children: React.ReactNode;
}

const WithAuth: React.FC<WithAuthProps> = ({ children }) => {
  return (
    <Authenticator>
      {children}
    </Authenticator>
  )
};

export default WithAuth;
