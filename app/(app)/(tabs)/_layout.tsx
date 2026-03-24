import { Tabs } from 'expo-router';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/src/i18n/provider';
import { useAppSettings } from '@/src/settings/provider';
import { getThemeColors } from '@/src/theme/ui';

export default function TabLayout() {
  useColorScheme();
  const { theme: themeMode } = useAppSettings();
  const { t } = useTranslation();
  const colors = getThemeColors(themeMode);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarStyle: {
          minHeight: 56,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('dashboard.title'),
          tabBarIcon: ({ color, focused }) => (
            <Feather name="home" size={22} color={color} style={{ opacity: focused ? 1 : 0.8 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar-search"
        options={{
          title: 'Kalender Suche',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="search" size={22} color={color} style={{ opacity: focused ? 1 : 0.8 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-appointments"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="my-calendar"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="new-slot"
        options={{
          title: 'Neuer Slot',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                width: 24,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: focused ? 1 : 0.8,
              }}>
              <Text
                style={{
                  color,
                  fontSize: 17,
                  fontWeight: '700',
                  letterSpacing: -0.4,
                  lineHeight: 18,
                  textAlign: 'center',
                }}>
                S+
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar-access"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="my-appointment-calendar"
        options={{
          title: 'Termin-Kalender',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="calendar" size={22} color={color} style={{ opacity: focused ? 1 : 0.8 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-slot-calendars"
        options={{
          title: 'Slot-Kalender',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="grid" size={22} color={color} style={{ opacity: focused ? 1 : 0.8 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="slot-history"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
