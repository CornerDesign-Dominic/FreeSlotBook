import { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreenHeader } from '../../src/components/app-screen-header';
import { CalendarNavigationHeader } from '../../src/components/calendar-navigation-header';
import {
  buildMonthGrid,
  formatMonthTitle,
  getDayKey,
  getWeekdayLabels,
} from '../../src/features/mvp/calendar-utils';
import type { AppointmentRecord } from '../../src/features/mvp/types';
import { useParticipantAppointments } from '../../src/features/mvp/useParticipantAppointments';
import { useAuth } from '../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppSettings } from '@/src/settings/provider';
import { theme, uiStyles } from '../../src/theme/ui';

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
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
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
    <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.content}>
      <AppScreenHeader title={t('appointments.title')} />

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
          {t('appointments.description')}
        </Text>

        <View style={{ alignSelf: 'flex-start', marginBottom: theme.spacing[16] }}>
          <Link href={`/my-appointments/week?date=${getDayKey(visibleMonth)}`} asChild>
            <Pressable>
              <Text style={uiStyles.linkText}>{t('appointments.openWeekView')}</Text>
            </Pressable>
          </Link>
        </View>

        <CalendarNavigationHeader
          title={formatMonthTitle(visibleMonth, locale)}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
        />

        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {weekdayLabels.map((label) => (
            <View key={label} style={{ flex: 1 }}>
              <Text style={[uiStyles.metaText, { textAlign: 'center' }]}>{label}</Text>
            </View>
          ))}
        </View>

        {monthGrid.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={{ flexDirection: 'row' }}>
            {week.map((day) => {
              const appointmentCount = appointmentCountsByDay[day.key] ?? 0;

              return (
                <View key={day.key} style={{ flex: 1 }}>
                  <Link href={`/my-appointments/${day.key}`} asChild>
                    <Pressable
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: theme.radius.small,
                        minHeight: 72,
                        padding: 8,
                        backgroundColor: day.isToday ? theme.colors.accentSoft : theme.colors.surface,
                        opacity: day.isCurrentMonth ? 1 : 0.45,
                      }}>
                      <Text style={[uiStyles.bodyText, { marginBottom: 6 }]}>{day.date.getDate()}</Text>
                      {appointmentCount ? (
                        <Text style={uiStyles.metaText}>
                          {appointmentCount === 1
                            ? t('appointments.count.one', { count: appointmentCount })
                            : t('appointments.count.other', { count: appointmentCount })}
                        </Text>
                      ) : null}
                    </Pressable>
                  </Link>
                </View>
              );
            })}
          </View>
        ))}

        {!appointments.length ? (
          <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>
            {t('appointments.emptyMonth')}
          </Text>
        ) : (
          <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>
            {t('appointments.monthHint')}
          </Text>
        )}

        {error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text> : null}
      </View>
    </ScrollView>
  );
}
