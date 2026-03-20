import { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  buildMonthGrid,
  formatMonthTitle,
  getDayKey,
  getWeekdayLabels,
} from '../../src/features/mvp/calendar-utils';
import type { AppointmentRecord } from '../../src/features/mvp/types';
import { useParticipantAppointments } from '../../src/features/mvp/useParticipantAppointments';
import { useAuth } from '../../src/firebase/useAuth';
import { useTranslation } from '../../src/i18n/provider';
import { useAppSettings } from '../../src/settings/provider';

function getAppointmentCountsByDay(appointments: AppointmentRecord[]) {
  return appointments.reduce<Record<string, number>>((accumulator, appointment) => {
    if (!appointment.startsAt) {
      return accumulator;
    }

    const dayKey = getDayKey(appointment.startsAt);
    accumulator[dayKey] = (accumulator[dayKey] ?? 0) + 1;

    return accumulator;
  }, {});
}

export default function MyAppointmentsMonthScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useTranslation();
  const { weekStartsOn } = useAppSettings();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const { appointments, loading, error } = useParticipantAppointments(user?.email ?? null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthGrid = useMemo(
    () => buildMonthGrid(visibleMonth, weekStartsOn),
    [visibleMonth, weekStartsOn]
  );
  const weekdayLabels = useMemo(
    () => getWeekdayLabels(language, weekStartsOn),
    [language, weekStartsOn]
  );
  const appointmentCountsByDay = useMemo(
    () => getAppointmentCountsByDay(appointments),
    [appointments]
  );

  if (authLoading || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const goToPreviousMonth = () => {
    setVisibleMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setVisibleMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>
        {t('appointments.title')}
      </Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', marginBottom: 12 }}>{t('appointments.description')}</Text>

        <Link href={`/my-appointments/week?date=${getDayKey(visibleMonth)}`} asChild>
          <Pressable style={{ alignSelf: 'flex-start', marginBottom: 16 }}>
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
              {t('appointments.openWeekView')}
            </Text>
          </Pressable>
        </Link>

        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Pressable onPress={goToPreviousMonth}>
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
              {t('appointments.previousMonth')}
            </Text>
          </Pressable>
          <Text style={{ color: 'black', fontSize: 18 }}>
            {formatMonthTitle(visibleMonth, locale)}
          </Text>
          <Pressable onPress={goToNextMonth}>
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
              {t('appointments.nextMonth')}
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {weekdayLabels.map((label) => (
            <View key={label} style={{ flex: 1 }}>
              <Text style={{ color: 'black', textAlign: 'center' }}>{label}</Text>
            </View>
          ))}
        </View>

        {monthGrid.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={{ flexDirection: 'row' }}>
            {week.map((day) => {
              const appointmentCount = appointmentCountsByDay[day.key] ?? 0;

              return (
                <Link key={day.key} href={`/my-appointments/${day.key}`} asChild>
                  <Pressable
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: 'black',
                      minHeight: 72,
                      padding: 8,
                      backgroundColor: day.isToday ? '#f3f3f3' : 'white',
                      opacity: day.isCurrentMonth ? 1 : 0.45,
                    }}>
                    <Text style={{ color: 'black', marginBottom: 6 }}>{day.date.getDate()}</Text>
                    {appointmentCount ? (
                      <Text style={{ color: 'black', fontSize: 12 }}>
                        {appointmentCount === 1
                          ? t('appointments.count.one', { count: appointmentCount })
                          : t('appointments.count.other', { count: appointmentCount })}
                      </Text>
                    ) : null}
                  </Pressable>
                </Link>
              );
            })}
          </View>
        ))}

        {!appointments.length ? (
          <Text style={{ color: 'black', marginTop: 12 }}>{t('appointments.emptyMonth')}</Text>
        ) : (
          <Text style={{ color: 'black', marginTop: 12 }}>{t('appointments.monthHint')}</Text>
        )}

        {error ? <Text style={{ color: 'black', marginTop: 12 }}>{error}</Text> : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link href="/(tabs)">
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {t('nav.backToDashboard')}
          </Text>
        </Link>
      </View>
    </ScrollView>
  );
}
