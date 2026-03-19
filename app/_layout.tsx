import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useNotificationSetup } from '../src/features/mvp/useNotificationSetup';
import { I18nProvider } from '../src/i18n/provider';
import { AppSettingsProvider, useAppSettings } from '../src/settings/provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useNotificationSetup();

  return (
    <I18nProvider>
      <AppSettingsProvider>
        <RootLayoutContent />
      </AppSettingsProvider>
    </I18nProvider>
  );
}

function RootLayoutContent() {
  const { theme } = useAppSettings();
  const navigationTheme = theme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
