import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { useAppointmentCalendar } from '@/src/domain/useAppointmentCalendar';
import { useAppointmentCalendarSettings } from '@/src/domain/useAppointmentCalendarSettings';
import { useAuth } from '@/src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';
import { useConnectedCalendars } from '@/src/domain/useConnectedCalendars';

export default function AppointmentCalendarSettingsScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const { sourceCalendarIds } = useAppointmentCalendar(user ? { uid: user.uid, email: user.email } : null);
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    toggleCalendarVisibility,
  } = useAppointmentCalendarSettings(user?.uid ?? null);
  const {
    records,
    loading: calendarsLoading,
    error: calendarsError,
  } = useConnectedCalendars(user ? { uid: user.uid, email: user.email } : null);

  const sourceCalendarIdSet = new Set(sourceCalendarIds);
  const sourceCalendarRecords = records.filter(({ calendar }) => sourceCalendarIdSet.has(calendar.id));

  if (authLoading || settingsLoading || calendarsLoading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title={t('appointments.settingsTitle')} />

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
          {t('appointments.settingsDescription')}
        </Text>

        {sourceCalendarRecords.length ? (
          <View style={{ gap: theme.spacing[12] }}>
            {sourceCalendarRecords.map(({ calendar }) => {
              const isHidden = settings.hiddenCalendarIds.includes(calendar.id);

              return (
                <View key={calendar.id} style={uiStyles.subtlePanel}>
                  <Text style={[uiStyles.bodyText, { marginBottom: 4 }]}>
                    {calendar.title || calendar.ownerEmail || calendar.calendarSlug || calendar.id}
                  </Text>
                  <Text style={[uiStyles.metaText, { marginBottom: theme.spacing[12] }]}>
                    {isHidden ? t('appointments.settingsHidden') : t('appointments.settingsVisible')}
                  </Text>
                  <Pressable
                    onPress={() => {
                      void toggleCalendarVisibility(calendar.id, isHidden);
                    }}
                    style={[uiStyles.button, isHidden ? undefined : uiStyles.buttonActive]}>
                    <Text style={uiStyles.buttonText}>
                      {isHidden
                        ? t('appointments.settingsShowAction')
                        : t('appointments.settingsHideAction')}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={uiStyles.secondaryText}>{t('appointments.settingsEmpty')}</Text>
        )}

        {settingsError ? (
          <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{settingsError}</Text>
        ) : null}
        {calendarsError ? (
          <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{calendarsError}</Text>
        ) : null}
      </View>

      <Link href="/" asChild>
        <Pressable style={uiStyles.button}>
          <Text style={uiStyles.buttonText}>{t('appointments.settingsBackToDashboard')}</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
