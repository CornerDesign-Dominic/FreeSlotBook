import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { getDayKey } from '@/src/domain/calendar-utils';
import { useAppointmentCalendar } from '@/src/domain/useAppointmentCalendar';
import { useAuth } from '@/src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

export default function MyAppointmentCalendarScreen() {
  const { theme, uiStyles } = useAppTheme();
  const { t } = useTranslation();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const { user, loading: authLoading } = useAuth();
  const today = new Date();
  const todayKey = getDayKey(today);
  const {
    getActiveAppointmentsForDay,
    loading: appointmentsLoading,
    error,
  } = useAppointmentCalendar(user ? { uid: user.uid, email: user.email } : null);
  const todaysAppointments = getActiveAppointmentsForDay(today);

  const formatTimeLabel = (date: Date | null) => {
    if (!date) {
      return t('day.timeUnavailable');
    }

    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || appointmentsLoading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title={t('appointments.title')} />

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>
          {t('appointments.todaySection')}
        </Text>
        {todaysAppointments.length ? (
          <View style={{ gap: theme.spacing[12] }}>
            {todaysAppointments.map((appointment) => {
              const appointmentLabel =
                appointment.participantName?.trim() ||
                appointment.participantEmail ||
                t('appointments.fallbackName');

              return (
                <View key={appointment.id} style={uiStyles.listItem}>
                  <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>
                    {formatTimeLabel(appointment.startsAt)}
                  </Text>
                  <Text style={uiStyles.secondaryText}>{appointmentLabel}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
            {t('appointments.todayEmpty')}
          </Text>
        )}
        <Link href={`/my-appointments/${todayKey}`} asChild>
          <Pressable style={{ alignSelf: 'flex-start', marginTop: theme.spacing[12] }}>
            <Text style={uiStyles.linkText}>{t('appointments.manageToday')}</Text>
          </Pressable>
        </Link>
        {error ? (
          <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text>
        ) : null}
      </View>

      <View style={uiStyles.panel}>
        <View style={{ gap: theme.spacing[12] }}>
          <Link href="/my-appointments" asChild>
            <Pressable style={uiStyles.button}>
              <Text style={uiStyles.buttonText}>{t('calendar.monthView')}</Text>
            </Pressable>
          </Link>
          <Link href={`/my-appointments/week?date=${todayKey}`} asChild>
            <Pressable style={uiStyles.button}>
              <Text style={uiStyles.buttonText}>{t('calendar.weekView')}</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <Link href="/appointment-calendar-settings" asChild>
        <Pressable style={{ alignSelf: 'flex-start' }}>
          <Text style={uiStyles.secondaryText}>{t('appointments.settingsLink')}</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
