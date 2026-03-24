import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { getDayKey } from '@/src/domain/calendar-utils';
import { useAppointmentCalendar } from '@/src/domain/useAppointmentCalendar';
import { useAuth } from '@/src/firebase/useAuth';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

export default function MyAppointmentCalendarScreen() {
  const { theme, uiStyles } = useAppTheme();
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
      return 'Zeit offen';
    }

    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || appointmentsLoading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>Wird geladen...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Mein Termin-Kalender" />

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>
          Heute
        </Text>
        {todaysAppointments.length ? (
          <View style={{ gap: theme.spacing[12] }}>
            {todaysAppointments.map((appointment) => {
              const appointmentLabel =
                appointment.participantName?.trim() ||
                appointment.participantEmail ||
                'Termin';

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
            Heute sind keine Termine eingetragen.
          </Text>
        )}
        <Link href={`/my-appointments/${todayKey}`} asChild>
          <Pressable style={{ alignSelf: 'flex-start', marginTop: theme.spacing[12] }}>
            <Text style={uiStyles.linkText}>Termine bearbeiten</Text>
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
              <Text style={uiStyles.buttonText}>Monatsansicht</Text>
            </Pressable>
          </Link>
          <Link href={`/my-appointments/week?date=${todayKey}`} asChild>
            <Pressable style={uiStyles.button}>
              <Text style={uiStyles.buttonText}>Wochenansicht</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <Link href="/appointment-calendar-settings" asChild>
        <Pressable style={{ alignSelf: 'flex-start' }}>
          <Text style={uiStyles.secondaryText}>Termin-Kalender-Einstellungen</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
