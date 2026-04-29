'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/apiClient';
import { FullConfig, normalizeConfig, DEFAULT_CONFIG } from '../lib/configParser';

interface ConfigContextType {
  config: FullConfig;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType>({
  config: DEFAULT_CONFIG,
  loading: true,
  error: null,
  reload: async () => {},
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<FullConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.config();

      if (response.success && response.data) {
        const normalized = normalizeConfig(response.data as Partial<FullConfig>);
        setConfig(normalized);
      } else {
        setError(response.error?.message || 'Failed to load config');
        // Use defaults
        setConfig(DEFAULT_CONFIG);
      }
    } catch (err) {
      console.error('Config fetch failed:', err);
      setError('Unable to connect to server');
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error, reload: fetchConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}

export { ConfigContext };
