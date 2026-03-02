import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  languageOptions,
  translations,
  type LanguageCode,
  type TranslationKey,
} from '../i18n/translations';

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => Promise<void>;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const STORAGE_KEY = 'dashboardapp.language';

const LanguageContext = createContext<I18nContextValue | undefined>(undefined);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!active || !value) return;
        if (languageOptions.some((option) => option.code === value)) {
          setLanguageState(value as LanguageCode);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const setLanguage = async (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(STORAGE_KEY, nextLanguage);
  };

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
      const template = translations[language][key] ?? translations.en[key] ?? String(key);
      if (!vars) return template;

      return Object.entries(vars).reduce((acc, [name, varValue]) => {
        return acc.replace(new RegExp(`\\{${name}\\}`, 'g'), String(varValue));
      }, template);
    };

    return {
      language,
      setLanguage,
      t,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used within LanguageProvider');
  }

  return context;
}
