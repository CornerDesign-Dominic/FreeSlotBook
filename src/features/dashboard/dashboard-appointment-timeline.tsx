import { useMemo } from 'react';
import { Link, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { getDayKey } from '../../domain/calendar-utils';
import { getAppointmentsIntersectingDay } from '../../domain/appointment-calendar-utils';
import type { AppointmentRecord } from '../../domain/types';
import { useAppointmentCalendarSourceCalendars } from '../../domain/useAppointmentCalendarSourceCalendars';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme } from '../../theme/ui';

export function DashboardAppointmentTimeline(props: {
  appointments: AppointmentRecord[];
  loading: boolean;
  error: string | null;
}) {
  const { t, language } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => getDayKey(today), [today]);
  const { calendars: sourceCalendars } = useAppointmentCalendarSourceCalendars(
    Array.from(new Set(props.appointments.map((appointment) => appointment.calendarId)))
  );
  const sourceCalendarById = useMemo(
    () =>
      sourceCalendars.reduce<Record<string, (typeof sourceCalendars)[number]>>((accumulator, calendar) => {
        accumulator[calendar.id] = calendar;
        return accumulator;
      }, {}),
    [sourceCalendars]
  );
  const todayAppointments = useMemo(
    () =>
      getAppointmentsIntersectingDay(props.appointments, today).sort((left, right) => {
        const leftTime = left.startsAt?.getTime() ?? 0;
        const rightTime = right.startsAt?.getTime() ?? 0;
        return leftTime - rightTime;
      }),
    [props.appointments, today]
  );
  const visibleAppointments = todayAppointments.slice(0, 3);
  const remainingCount = Math.max(todayAppointments.length - visibleAppointments.length, 0);

  const formatAppointmentTime = (appointment: AppointmentRecord) =>
    appointment.startsAt
      ? appointment.startsAt.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        })
      : t('appointments.timeUnavailable');

  const formatDuration = (appointment: AppointmentRecord) => {
    if (!appointment.startsAt || !appointment.endsAt) {
      return '?';
    }

    const durationMinutes = Math.max(
      Math.round((appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60000),
      0
    );

    return `${durationMinutes}m`;
  };

  const getCalendarLabel = (appointment: AppointmentRecord) => {
    const calendar = sourceCalendarById[appointment.calendarId];

    if (calendar?.calendarSlug) {
      return `/calendar/${calendar.calendarSlug}`;
    }

    if (calendar?.title?.trim()) {
      return calendar.title.trim();
    }

    if (calendar?.ownerUsername?.trim()) {
      return calendar.ownerUsername.trim();
    }

    return appointment.calendarId;
  };

  const getCalendarHref = (appointment: AppointmentRecord) => {
    const calendar = sourceCalendarById[appointment.calendarId];

    if (calendar?.calendarSlug) {
      return {
        pathname: '/calendar/[calendarSlug]' as const,
        params: { calendarSlug: calendar.calendarSlug },
      };
    }

    return {
      pathname: '/my-appointments/[date]' as const,
      params: { date: todayKey },
    };
  };

  if (props.loading) {
    return (
      <View>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View>
      {visibleAppointments.length ? (
        <View style={{ gap: theme.spacing[8] }}>
          {visibleAppointments.map((appointment) => (
            <Pressable
              key={appointment.id}
              onPress={() => {
                router.push(getCalendarHref(appointment));
              }}
              style={[
                uiStyles.subtlePanel,
                {
                  paddingVertical: theme.spacing[8],
                  paddingHorizontal: theme.spacing[12],
                },
              ]}>
              <Text style={uiStyles.bodyText}>
                {`${formatAppointmentTime(appointment)} (${formatDuration(appointment)}) – ${getCalendarLabel(appointment)}`}
              </Text>
            </Pressable>
          ))}
          {remainingCount ? (
            <Link href={`/my-appointments/${todayKey}`} asChild>
              <Pressable>
                <Text style={uiStyles.linkText}>{`+${remainingCount} weitere`}</Text>
              </Pressable>
            </Link>
          ) : null}
        </View>
      ) : (
        <Text style={uiStyles.secondaryText}>{t('dashboard.appointmentTimelineEmpty')}</Text>
      )}
      {props.error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{props.error}</Text> : null}
    </View>
  );
}
