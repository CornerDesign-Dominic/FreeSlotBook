import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import {
  buildWeekDays,
  formatWeekRange,
  getDayKey,
  getMinutesSinceStartOfDay,
  parseDayKey,
  startOfWeek,
} from '../../src/features/mvp/calendar-utils';
import type { AppointmentRecord } from '../../src/features/mvp/types';
import { useParticipantAppointments } from '../../src/features/mvp/useParticipantAppointments';
import { useAuth } from '../../src/firebase/useAuth';
import { LanguageSwitcher } from '../../src/i18n/language-switcher';
import { useTranslation } from '../../src/i18n/provider';
import { useAppSettings } from '../../src/settings/provider';

const hourWidth = 88;
const rowHeight = 64;
const dayLabelWidth = 112;
const headerHeight = 32;
const hours = Array.from({ length: 24 }, (_, index) => index);

function formatDayLabel(date: Date, locale: string) {
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatAppointmentTimeRange(appointment: AppointmentRecord, locale: string) {
  if (!appointment.startsAt || !appointment.endsAt) {
    return '';
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
}

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

export default function MyAppointmentsWeekScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { weekStartsOn } = useAppSettings();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const rawDate = Array.isArray(params.date) ? params.date[0] : params.date ?? '';
  const baseDate = useMemo(() => parseDayKey(rawDate) ?? new Date(), [rawDate]);
  const selectedWeekStart = startOfWeek(baseDate, weekStartsOn);
  const timelineScrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const { user, loading: authLoading } = useAuth();
  const { appointments, loading, error } = useParticipantAppointments(user?.email ?? null);

  const weekDays = useMemo(
    () => buildWeekDays(baseDate, weekStartsOn),
    [baseDate, weekStartsOn]
  );
  const appointmentsByDay = useMemo(
    () =>
      weekDays.reduce<Record<string, AppointmentRecord[]>>((accumulator, day) => {
        accumulator[day.key] = getAppointmentsForDay(appointments, day.date);
        return accumulator;
      }, {}),
    [appointments, weekDays]
  );

  useEffect(() => {
    const viewportWidth = Math.max(screenWidth - dayLabelWidth - 32, 120);
    const currentMinutes = getMinutesSinceStartOfDay(new Date());
    const offset = Math.max((currentMinutes / 60) * hourWidth - viewportWidth * 0.5, 0);

    const timeout = setTimeout(() => {
      timelineScrollRef.current?.scrollTo({ x: offset, animated: false });
    }, 0);

    return () => clearTimeout(timeout);
  }, [screenWidth]);

  const navigateToRelativeWeek = (offset: number) => {
    const nextDate = new Date(selectedWeekStart);
    nextDate.setDate(selectedWeekStart.getDate() + offset * 7);
    router.replace(`/my-appointments/week?date=${getDayKey(nextDate)}`);
  };

  const openDay = (dayKey: string) => {
    router.push(`/my-appointments/${dayKey}`);
  };

  if (authLoading || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const timeRailWidth = hourWidth * 24;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <LanguageSwitcher />
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>
        {t('appointments.weekTitle')}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
        <Pressable onPress={() => navigateToRelativeWeek(-1)}>
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {'<- '}{t('appointments.previousWeek')}
          </Text>
        </Pressable>
        <Text style={{ color: 'black', fontSize: 18 }}>
          {formatWeekRange(baseDate, locale, weekStartsOn)}
        </Text>
        <Pressable onPress={() => navigateToRelativeWeek(1)}>
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {t('appointments.nextWeek')}{' ->'}
          </Text>
        </Pressable>
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: dayLabelWidth, marginRight: 8 }}>
            <View style={{ height: headerHeight, justifyContent: 'center' }}>
              <Text style={{ color: 'black' }}>{t('appointments.weekDays')}</Text>
            </View>
            {weekDays.map((day) => (
              <Pressable
                key={`label-${day.key}`}
                onPress={() => openDay(day.key)}
                style={{
                  height: rowHeight,
                  borderTopWidth: 1,
                  borderColor: 'black',
                  justifyContent: 'center',
                  paddingRight: 8,
                }}>
                <Text style={{ color: 'black', fontWeight: day.isToday ? '700' : '400' }}>
                  {formatDayLabel(day.date, locale)}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView
            ref={timelineScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ minWidth: timeRailWidth }}>
            <View style={{ width: timeRailWidth }}>
              <View style={{ height: headerHeight, flexDirection: 'row', position: 'relative' }}>
                {hours.map((hour) => (
                  <View
                    key={`hour-${hour}`}
                    style={{
                      width: hourWidth,
                      borderRightWidth: 1,
                      borderColor: 'black',
                      justifyContent: 'center',
                    }}>
                    <Text style={{ color: 'black' }}>{`${`${hour}`.padStart(2, '0')}:00`}</Text>
                  </View>
                ))}
                <Text style={{ color: 'black', position: 'absolute', right: 0, top: 6 }}>24:00</Text>
              </View>

              {weekDays.map((day) => (
                <View
                  key={`row-${day.key}`}
                  style={{
                    height: rowHeight,
                    borderTopWidth: 1,
                    borderColor: 'black',
                    position: 'relative',
                  }}>
                  {hours.map((hour) => (
                    <View
                      key={`grid-${day.key}-${hour}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: hour * hourWidth,
                        width: 1,
                        backgroundColor: 'black',
                      }}
                    />
                  ))}

                  {appointmentsByDay[day.key]?.map((appointment) => {
                    if (!appointment.startsAt || !appointment.endsAt) {
                      return null;
                    }

                    const left = (getMinutesSinceStartOfDay(appointment.startsAt) / 60) * hourWidth;
                    const durationMinutes = Math.max(
                      (appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60000,
                      30
                    );
                    const width = Math.max((durationMinutes / 60) * hourWidth, 52);

                    return (
                      <Pressable
                        key={appointment.id}
                        onPress={() => openDay(day.key)}
                        style={{
                          position: 'absolute',
                          left,
                          top: 10,
                          width,
                          minHeight: rowHeight - 20,
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                          borderWidth: 1,
                          borderColor: 'black',
                          backgroundColor: '#f1f1f1',
                          justifyContent: 'center',
                        }}>
                        <Text style={{ color: 'black', fontSize: 11 }} numberOfLines={1}>
                          {formatAppointmentTimeRange(appointment, locale)}
                        </Text>
                        <Text style={{ color: 'black', fontSize: 10 }} numberOfLines={1}>
                          {appointment.source === 'manual'
                            ? t('appointments.sourceManual')
                            : t('appointments.sourceSelfService')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {!appointments.length ? (
          <Text style={{ color: 'black', marginTop: 12 }}>{t('appointments.emptyWeek')}</Text>
        ) : null}
        {error ? <Text style={{ color: 'black', marginTop: 12 }}>{error}</Text> : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link href="/my-appointments">
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {t('appointments.backToMonth')}
          </Text>
        </Link>
      </View>
    </ScrollView>
  );
}
