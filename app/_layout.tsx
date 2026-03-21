import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useNotificationSetup } from '@/src/features/mvp/useNotificationSetup';
import { I18nProvider } from '@/src/i18n/provider';
import { AppSettingsProvider, useAppSettings } from '@/src/settings/provider';
import { theme as designTheme } from '@/src/theme/ui';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useNotificationSetup();

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AppSettingsProvider>
          <RootLayoutContent />
        </AppSettingsProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutContent() {
  const { theme } = useAppSettings();
  const navigationTheme = theme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider value={navigationTheme}>
      <SafeAreaView
        edges={['top']}
        style={{ flex: 1, backgroundColor: navigationTheme.colors.background }}>
        <View
          style={{
            flex: 1,
            paddingTop: designTheme.spacing[8],
          }}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </View>
      </SafeAreaView>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
