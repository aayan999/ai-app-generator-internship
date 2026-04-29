'use client';

import { useContext } from 'react';
import { ConfigContext } from '../context/ConfigContext';

/**
 * Hook to access the app configuration.
 */
export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
