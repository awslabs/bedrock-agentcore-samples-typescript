"use client"

import React from 'react';
import { ThemeProvider, type Theme } from '@aws-amplify/ui-react';

interface WithAuthProps {
  children: React.ReactNode;
}

// AWS Console theme to match the custom CSS
const amplifyTheme: Theme = {
  name: 'aws-console-theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: { value: '#FFE5CC' },
          20: { value: '#FFCC99' },
          40: { value: '#FFB266' },
          60: { value: '#FF9900' }, // AWS Orange
          80: { value: '#CC7A00' },
          90: { value: '#996600' },
          100: { value: '#664400' },
        },
      },
      background: {
        primary: { value: '#FFFFFF' },
        secondary: { value: '#F2F3F4' },
        tertiary: { value: '#E9EBED' },
      },
      font: {
        primary: { value: '#16191F' }, // AWS Dark Gray
        secondary: { value: '#5F6B7A' },
        tertiary: { value: '#879596' },
        inverse: { value: '#FFFFFF' },
      },
      border: {
        primary: { value: '#D5DBDB' },
        secondary: { value: '#E9EBED' },
      },
    },
    components: {
      button: {
        primary: {
          backgroundColor: { value: '#FF9900' }, // AWS Orange
          color: { value: '#FFFFFF' },
          _hover: {
            backgroundColor: { value: '#EC7211' },
          },
          _focus: {
            borderColor: { value: '#FF9900' },
            boxShadow: { value: '0 0 0 2px rgba(255, 153, 0, 0.25)' },
          },
          _active: {
            backgroundColor: { value: '#CC7A00' },
          },
        },
        link: {
          color: { value: '#FF9900' },
          _hover: {
            color: { value: '#EC7211' },
          },
        },
      },
      tabs: {
        item: {
          color: { value: '#5F6B7A' },
          _hover: {
            color: { value: '#16191F' },
          },
          _active: {
            color: { value: '#FF9900' },
            borderColor: { value: '#FF9900' },
          },
        },
      },
    },
    radii: {
      small: { value: '0.25rem' },
      medium: { value: '0.5rem' },
      large: { value: '0.625rem' },
    },
  },
  overrides: [
    {
      colorMode: 'dark',
      tokens: {
        colors: {
          background: {
            primary: { value: '#16191F' }, // AWS Dark Gray
            secondary: { value: '#232F3E' }, // AWS Squid Ink
            tertiary: { value: '#2A3F54' },
          },
          font: {
            primary: { value: '#FFFFFF' },
            secondary: { value: '#B0BEC5' },
            tertiary: { value: '#879596' },
            inverse: { value: '#16191F' },
          },
          border: {
            primary: { value: 'rgba(255, 255, 255, 0.12)' },
            secondary: { value: 'rgba(255, 255, 255, 0.08)' },
          },
        },
        components: {
          button: {
            primary: {
              backgroundColor: { value: '#FF9900' },
              color: { value: '#16191F' }, // Dark text on orange for better contrast
              _hover: {
                backgroundColor: { value: '#FFB84D' },
              },
              _active: {
                backgroundColor: { value: '#EC7211' },
              },
            },
          },
        },
      },
    },
  ],
};

const AmplifyThemeProvider: React.FC<WithAuthProps> = ({ children }) => {
  return (
    <ThemeProvider theme={amplifyTheme}>
      {children}
    </ThemeProvider>
  )
};

export default AmplifyThemeProvider;
