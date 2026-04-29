'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useConfig } from './ConfigContext';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, fallback?: string) => string;
  supportedLanguages: string[];
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  supportedLanguages: ['en'],
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { config } = useConfig();
  const [language, setLanguageState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('language') || config.app.defaultLanguage || 'en';
    }
    return config.app.defaultLanguage || 'en';
  });

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  }, []);

  /**
   * Translation function.
   * Looks up the key in the current language's translations.
   * Falls back to English, then to the key itself.
   */
  const t = useCallback(
    (key: string, fallback?: string): string => {
      const translations = config.i18n.translations;

      // Try current language
      if (translations[language]?.[key]) {
        return translations[language][key];
      }

      // Try English fallback
      if (language !== 'en' && translations['en']?.[key]) {
        return translations['en'][key];
      }

      // Use provided fallback or the key itself
      return fallback || key;
    },
    [language, config.i18n.translations]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        supportedLanguages: config.i18n.supportedLanguages,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export { LanguageContext };
