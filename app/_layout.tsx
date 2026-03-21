import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { Platform, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useNotificationSetup } from '@/src/features/mvp/useNotificationSetup';
import { I18nProvider } from '@/src/i18n/provider';
import { AppSettingsProvider, useAppSettings } from '@/src/settings/provider';
import { getThemeColors, setActiveThemeMode, theme as designTheme } from '@/src/theme/ui';

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
  setActiveThemeMode(theme);

  const colors = getThemeColors(theme);
  const baseNavigationTheme = theme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseNavigationTheme,
    colors: {
      ...baseNavigationTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.accent,
      notification: colors.accent,
    },
  };

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const navigationBarStyle = theme === 'dark' ? 'dark' : 'light';
    const buttonStyle = theme === 'dark' ? 'light' : 'dark';

    NavigationBar.setStyle(navigationBarStyle);
    void NavigationBar.setButtonStyleAsync(buttonStyle).catch(() => {
      // `setStyle` is the preferred path in edge-to-edge mode. Keep the fallback silent.
    });
    void NavigationBar.setVisibilityAsync('visible').catch(() => {
      // Ignore devices that don't expose the Android navigation bar API.
    });
  }, [theme]);

  return (
    <ThemeProvider value={navigationTheme}>
      <SafeAreaView
        edges={['top']}
        style={{ flex: 1, backgroundColor: navigationTheme.colors.background }}>
        <View
          style={{
            flex: 1,
            backgroundColor: navigationTheme.colors.background,
            paddingTop: designTheme.spacing[8],
          }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: navigationTheme.colors.background,
              },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </View>
      </SafeAreaView>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
