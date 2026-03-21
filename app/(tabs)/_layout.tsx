import { Tabs } from 'expo-router';
import React from 'react';
import { Feather } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/src/i18n/provider';
import { theme } from '@/src/theme/ui';

export default function TabLayout() {
  useColorScheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: {
          minHeight: 56,
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
        name="my-appointments"
        options={{
          title: 'Termin-Kalender',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="calendar" size={22} color={color} style={{ opacity: focused ? 1 : 0.8 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-calendar"
        options={{
          title: 'Slot-Kalender',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="grid" size={22} color={color} style={{ opacity: focused ? 1 : 0.8 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="new-slot"
        options={{
          title: 'Neuer Slot',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="plus-circle" size={22} color={color} style={{ opacity: focused ? 1 : 0.8 }} />
          ),
        }}
      />
    </Tabs>
  );
}
