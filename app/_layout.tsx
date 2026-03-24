import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { Platform, Text, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useNotificationSetup } from '@/src/domain/useNotificationSetup';
import { useAuth } from '@/src/firebase/useAuth';
import { I18nProvider } from '@/src/i18n/provider';
import { AppSettingsProvider, useAppSettings } from '@/src/settings/provider';
import { getThemeColors, theme as designTheme } from '@/src/theme/ui';

export const unstable_settings = {
  anchor: '(app)',
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
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();

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

  const topSegment = segments[0] ?? null;
  const isInAppGroup = topSegment === '(app)';
  const isInAuthGroup = topSegment === '(auth)';
  const isEntryRoute = topSegment === null;

  useEffect(() => {
    if (loading || !rootNavigationState?.key) {
      return;
    }

    if (user) {
      if (isInAuthGroup || isEntryRoute) {
        router.replace('/(app)/(tabs)');
      }

      return;
    }

    if (isInAppGroup) {
      router.replace('/(auth)/login');
    }
  }, [isEntryRoute, isInAppGroup, isInAuthGroup, loading, rootNavigationState?.key, router, user]);

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
          {loading || !rootNavigationState?.key ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: designTheme.spacing[16],
              }}>
              <Text style={{ color: colors.textPrimary }}>Laedt...</Text>
            </View>
          ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: navigationTheme.colors.background,
              },
            }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
          )}
        </View>
      </SafeAreaView>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
