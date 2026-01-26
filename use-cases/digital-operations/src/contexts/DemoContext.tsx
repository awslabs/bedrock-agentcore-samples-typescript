'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface DemoContextType {
  isDemoActive: boolean;
  startDemo: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const useDemoContext = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemoContext must be used within a DemoProvider');
  }
  return context;
};

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoActive] = useState(false);

  const startDemo = useCallback(async () => {
  }, []);

  const resetDemo = useCallback(async () => {
    try {
     
    } catch (error) {
      console.error('Error resetting demo:', error);
      throw error;
    }
  }, []);

  return (
    <DemoContext.Provider value={{ isDemoActive, startDemo, resetDemo }}>
      {children}
    </DemoContext.Provider>
  );
};
