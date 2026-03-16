import React, { createContext, useContext, useEffect, useState } from 'react';
import { en } from '../locales/en';
import type { TranslationType } from '../locales/en';
import { pt_BR } from '../locales/pt_BR';

type Language = 'en' | 'pt-BR';

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
  storageKey?: string;
}

interface LanguageProviderState {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const initialState: LanguageProviderState = {
  language: 'en',
  setLanguage: () => null,
  t: (key) => key,
};

const LanguageProviderContext = createContext<LanguageProviderState>(initialState);

const translations: Record<Language, TranslationType> = {
  en,
  'pt-BR': pt_BR,
};

export function LanguageProvider({
  children,
  defaultLanguage = 'en',
  storageKey = 'perseus-lang',
}: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem(storageKey) as Language;
    if (stored && (stored === 'en' || stored === 'pt-BR')) {
      return stored;
    }
    
    // Auto-detect
    const browserLang = navigator.language;
    if (browserLang.startsWith('pt')) {
      return 'pt-BR';
    }
    
    return defaultLanguage;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, language);
    document.documentElement.lang = language;
  }, [language, storageKey]);

  const t = (path: string): string => {
    const keys = path.split('.');
    let current: any = translations[language];
    
    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Translation missing for key: ${path} in language: ${language}`);
        return path;
      }
      current = current[key];
    }
    
    return current as string;
  };

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageProviderContext.Provider value={value}>
      {children}
    </LanguageProviderContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageProviderContext);

  if (context === undefined)
    throw new Error('useLanguage must be used within a LanguageProvider');

  return context;
};
