import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { useAuthenticator } from '@aws-amplify/ui-react';

// Define the type for your context value
interface UserContextType {
  userAttributes: FetchUserAttributesOutput | null;
}

// Create the context with the correct type
const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserAttributesProvider({ children }: { children: ReactNode }) {
  const [userAttributes, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
  const { authStatus } = useAuthenticator(context => [context.authStatus]);
  useEffect(() => {
    const updateAttributes = async () => {
      if (authStatus === 'unauthenticated') {
        setUserAttributes(null);
        return;
      } else if (authStatus === 'authenticated') {
        try {
          const userAttributesResponse = await fetchUserAttributes();
          if (userAttributesResponse) setUserAttributes(userAttributesResponse);
        } catch (error) {
          console.error('Error fetching user attributes:', error);
          setUserAttributes(null);
        }
      }
    };

    updateAttributes();
  }, [authStatus]);

  // Pass the object as the value
  return (
    <UserContext.Provider value={{ userAttributes }}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to use the context
export function useUserAttributes() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserAttributes must be used within a UserProvider');
  }
  return context;
}
