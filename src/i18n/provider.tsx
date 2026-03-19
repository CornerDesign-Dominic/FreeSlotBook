import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { translate } from './index';
import type { TranslationKey } from './index';
import type { Language } from './types';

const STORAGE_KEY = 'app.language';

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (
    key: TranslationKey,
    params?: Record<string, string | number | null | undefined>
  ) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider(props: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>('de');

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedLanguage) => {
        if (cancelled) {
          return;
        }

        if (storedLanguage === 'de' || storedLanguage === 'en') {
          setLanguageState(storedLanguage);
        }
      })
      .catch(() => {
        // Keep default language if local storage is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = async (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(STORAGE_KEY, nextLanguage);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => translate(language, key, params),
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useTranslation must be used inside an I18nProvider.');
  }

  return context;
}
