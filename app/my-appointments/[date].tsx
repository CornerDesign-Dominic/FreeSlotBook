import { useMemo } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { formatDayTitle, getDayKey, parseDayKey } from '../../src/features/mvp/calendar-utils';
import type { AppointmentRecord } from '../../src/features/mvp/types';
import { useParticipantAppointments } from '../../src/features/mvp/useParticipantAppointments';
import { useAuth } from '../../src/firebase/useAuth';
import { LanguageSwitcher } from '../../src/i18n/language-switcher';
import { useTranslation } from '../../src/i18n/provider';

function getAppointmentsForDay(appointments: AppointmentRecord[], date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  return appointments.filter((appointment) => {
    if (!appointment.startsAt || !appointment.endsAt) {
      return false;
    }

    return appointment.startsAt < dayEnd && appointment.endsAt > dayStart;
  });
}

export default function MyAppointmentsDayScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useTranslation();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const rawDate = Array.isArray(params.date) ? params.date[0] : params.date ?? '';
  const selectedDate = parseDayKey(rawDate);
  const { appointments, loading, error } = useParticipantAppointments(user?.email ?? null);

  const dayAppointments = useMemo(
    () => (selectedDate ? getAppointmentsForDay(appointments, selectedDate) : []),
    [appointments, selectedDate]
  );

  const formatTimeRange = (appointment: AppointmentRecord) => {
    if (!appointment.startsAt || !appointment.endsAt) {
      return t('appointments.timeUnavailable');
    }

    const startLabel = appointment.startsAt.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
    const endLabel = appointment.endsAt.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${startLabel} - ${endLabel}`;
  };

  if (!selectedDate) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black', marginBottom: 16 }}>{t('appointments.invalidDate')}</Text>
        <Link href="/my-appointments">
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {t('appointments.backToMonth')}
          </Text>
        </Link>
      </View>
    );
  }

  if (authLoading || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const navigateToRelativeDay = (offset: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + offset);
    router.replace(`/my-appointments/${getDayKey(nextDate)}`);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <LanguageSwitcher />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
        <Pressable onPress={() => navigateToRelativeDay(-1)}>
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {'<- '}{t('appointments.previousDay')}
          </Text>
        </Pressable>

        <Text style={{ color: 'black', fontSize: 24, flex: 1, textAlign: 'center' }}>
          {formatDayTitle(selectedDate, locale)}
        </Text>

        <Pressable onPress={() => navigateToRelativeDay(1)}>
          <Text style={{ color: 'black', textDecorationLine: 'underline', textAlign: 'right' }}>
            {t('appointments.nextDay')}{' ->'}
          </Text>
        </Pressable>
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>
          {t('appointments.dayTitle')}
        </Text>

        {dayAppointments.length ? (
          dayAppointments.map((appointment) => (
            <View
              key={appointment.id}
              style={{ borderTopWidth: 1, borderColor: 'black', paddingTop: 12, marginTop: 12 }}>
              <Text style={{ color: 'black', marginBottom: 4 }}>
                {t('appointments.timeLabel', { time: formatTimeRange(appointment) })}
              </Text>
              <Text style={{ color: 'black', marginBottom: 4 }}>
                {appointment.source === 'manual'
                  ? t('appointments.sourceManual')
                  : t('appointments.sourceSelfService')}
              </Text>
              {appointment.participantName ? (
                <Text style={{ color: 'black', marginBottom: 4 }}>
                  {t('appointments.nameLabel', { name: appointment.participantName })}
                </Text>
              ) : null}
              <Text style={{ color: 'black' }}>
                {t('appointments.emailLabel', { email: appointment.participantEmail })}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ color: 'black' }}>{t('appointments.emptyDay')}</Text>
        )}

        {error ? <Text style={{ color: 'black', marginTop: 12 }}>{error}</Text> : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link href={`/my-appointments/week?date=${rawDate}`} style={{ marginBottom: 12 }}>
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {t('appointments.openWeekView')}
          </Text>
        </Link>
        <Link href="/my-appointments">
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {t('appointments.backToMonth')}
          </Text>
        </Link>
      </View>
    </ScrollView>
  );
}
