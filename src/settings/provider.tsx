import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Context,
  type PropsWithChildren,
} from 'react';

import type { AppTheme, WeekStartsOn } from './types';

const THEME_STORAGE_KEY = 'app.theme';
const WEEK_START_STORAGE_KEY = 'app.week_starts_on';

type AppSettingsContextValue = {
  theme: AppTheme;
  weekStartsOn: WeekStartsOn;
  setTheme: (theme: AppTheme) => Promise<void>;
  setWeekStartsOn: (weekStartsOn: WeekStartsOn) => Promise<void>;
};

const APP_SETTINGS_CONTEXT_KEY = '__freeSlotBookingAppSettingsContext__';

type GlobalAppSettingsContextHost = typeof globalThis & {
  __freeSlotBookingAppSettingsContext__?: Context<AppSettingsContextValue | null>;
};

const globalAppSettingsContextHost = globalThis as GlobalAppSettingsContextHost;

const AppSettingsContext =
  globalAppSettingsContextHost[APP_SETTINGS_CONTEXT_KEY] ??
  (globalAppSettingsContextHost[APP_SETTINGS_CONTEXT_KEY] =
    createContext<AppSettingsContextValue | null>(null));

export function AppSettingsProvider(props: PropsWithChildren) {
  const [theme, setThemeState] = useState<AppTheme>('light');
  const [weekStartsOn, setWeekStartsOnState] = useState<WeekStartsOn>('monday');

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(WEEK_START_STORAGE_KEY),
    ])
      .then(([storedTheme, storedWeekStartsOn]) => {
        if (cancelled) {
          return;
        }

        if (storedTheme === 'light' || storedTheme === 'dark') {
          setThemeState(storedTheme);
        }

        if (storedWeekStartsOn === 'monday' || storedWeekStartsOn === 'sunday') {
          setWeekStartsOnState(storedWeekStartsOn);
        }
      })
      .catch(() => {
        // Keep defaults if local storage is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = async (nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const setWeekStartsOn = async (nextWeekStartsOn: WeekStartsOn) => {
    setWeekStartsOnState(nextWeekStartsOn);
    await AsyncStorage.setItem(WEEK_START_STORAGE_KEY, nextWeekStartsOn);
  };

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      theme,
      weekStartsOn,
      setTheme,
      setWeekStartsOn,
    }),
    [theme, weekStartsOn]
  );

  return <AppSettingsContext.Provider value={value}>{props.children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);

  if (!context) {
    throw new Error('useAppSettings must be used inside an AppSettingsProvider.');
  }

  return context;
}

export function useOptionalAppSettings() {
  return useContext(AppSettingsContext);
}
