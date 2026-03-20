import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import {
  formatDayTitle,
  getDayKey,
  getMinutesSinceStartOfDay,
  parseDayKey,
} from '../../src/features/mvp/calendar-utils';
import { CalendarNavigationHeader } from '../../src/components/calendar-navigation-header';
import type { AppointmentRecord } from '../../src/features/mvp/types';
import { useParticipantAppointments } from '../../src/features/mvp/useParticipantAppointments';
import { useAuth } from '../../src/firebase/useAuth';
import { useTranslation } from '../../src/i18n/provider';
import { theme, uiStyles } from '../../src/theme/ui';

const hourWidth = 96;
const timelineHeight = 164;
const detailPanelMaxHeight = 260;
const hours = Array.from({ length: 24 }, (_, index) => index);

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
  const { width: screenWidth } = useWindowDimensions();
  const timelineScrollRef = useRef<ScrollView>(null);
  const { appointments, loading, error } = useParticipantAppointments(user?.email ?? null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const dayAppointments = useMemo(
    () => (selectedDate ? getAppointmentsForDay(appointments, selectedDate) : []),
    [appointments, selectedDate]
  );
  const selectedAppointment =
    dayAppointments.find((appointment) => appointment.id === selectedAppointmentId) ?? null;

  useEffect(() => {
    if (!dayAppointments.length) {
      setSelectedAppointmentId(null);
      return;
    }

    const hasSelectedAppointment = dayAppointments.some(
      (appointment) => appointment.id === selectedAppointmentId
    );

    if (!hasSelectedAppointment) {
      setSelectedAppointmentId(null);
    }
  }, [dayAppointments, selectedAppointmentId]);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const now = new Date();
    const currentMinutes = getMinutesSinceStartOfDay(now);
    const defaultOffset = Math.max((currentMinutes / 60) * hourWidth - screenWidth * 0.35, 0);

    const timeout = setTimeout(() => {
      timelineScrollRef.current?.scrollTo({ x: defaultOffset, animated: false });
    }, 0);

    return () => clearTimeout(timeout);
  }, [screenWidth, selectedDate]);

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

  const formatDateTime = (value: Date | null) => {
    if (!value) {
      return t('appointments.timeUnavailable');
    }

    return value.toLocaleString(locale);
  };

  if (!selectedDate) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[16] }]}>{t('appointments.invalidDate')}</Text>
        <Link href="/my-appointments">
          <Text style={uiStyles.linkText}>
            {t('appointments.backToMonth')}
          </Text>
        </Link>
      </View>
    );
  }

  if (authLoading || loading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const navigateToRelativeDay = (offset: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + offset);
    router.replace(`/my-appointments/${getDayKey(nextDate)}`);
  };

  const timeRailWidth = hourWidth * 24;

  return (
    <View style={uiStyles.screen}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing[16], paddingBottom: 120 }}>
        <CalendarNavigationHeader
          title={formatDayTitle(selectedDate, locale)}
          onPrevious={() => navigateToRelativeDay(-1)}
          onNext={() => navigateToRelativeDay(1)}
        />

        <View style={uiStyles.panel}>
          <Text style={uiStyles.sectionTitle}>
            {t('appointments.timeline')}
          </Text>

          <ScrollView
            ref={timelineScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ minWidth: timeRailWidth }}>
            <View style={{ width: timeRailWidth }}>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                {hours.map((hour) => (
                  <View
                    key={`hour-label-${hour}`}
                    style={{ width: hourWidth, borderRightWidth: 1, borderColor: theme.colors.border }}>
                    <Text style={uiStyles.metaText}>{`${`${hour}`.padStart(2, '0')}:00`}</Text>
                  </View>
                ))}
              </View>

              <View
                style={{
                  position: 'relative',
                  height: timelineHeight,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.medium,
                  backgroundColor: theme.colors.surface,
                }}>
                {hours.map((hour) => (
                  <View
                    key={`hour-grid-${hour}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: hour * hourWidth,
                      width: 1,
                      backgroundColor: theme.colors.border,
                    }}
                  />
                ))}

                {dayAppointments.length ? (
                  dayAppointments.map((appointment) => {
                    if (!appointment.startsAt || !appointment.endsAt) {
                      return null;
                    }

                    const left = (getMinutesSinceStartOfDay(appointment.startsAt) / 60) * hourWidth;
                    const durationMinutes = Math.max(
                      (appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60000,
                      30
                    );
                    const width = Math.max((durationMinutes / 60) * hourWidth, 92);
                    const isSelected = selectedAppointmentId === appointment.id;

                    return (
                      <Pressable
                        key={appointment.id}
                        onPress={() => setSelectedAppointmentId(appointment.id)}
                        style={{
                          position: 'absolute',
                          left,
                          top: 28,
                          width,
                          minHeight: 92,
                          padding: 10,
                          borderWidth: 2,
                          borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                          backgroundColor: theme.colors.surfaceSoft,
                          borderRadius: theme.radius.medium,
                        }}>
                        <Text style={[uiStyles.bodyText, { marginBottom: 6 }]} numberOfLines={1}>
                          {formatTimeRange(appointment)}
                        </Text>
                        <Text style={uiStyles.metaText} numberOfLines={1}>
                          {appointment.source === 'manual'
                            ? t('appointments.sourceManual')
                            : t('appointments.sourceSelfService')}
                        </Text>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={uiStyles.secondaryText}>{t('appointments.emptyDay')}</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text> : null}
        </View>

        <View style={uiStyles.panel}>
          <Text style={uiStyles.sectionTitle}>
            {t('appointments.details')}
          </Text>

          <ScrollView style={{ maxHeight: detailPanelMaxHeight }}>
            {selectedAppointment ? (
              <>
                <Text style={[uiStyles.bodyText, { marginBottom: 6 }]}>
                  {t('appointments.timeLabel', { time: formatTimeRange(selectedAppointment) })}
                </Text>
                <Text style={[uiStyles.secondaryText, { marginBottom: 6 }]}>
                  {selectedAppointment.source === 'manual'
                    ? t('appointments.sourceManual')
                    : t('appointments.sourceSelfService')}
                </Text>
                {selectedAppointment.participantName ? (
                  <Text style={[uiStyles.bodyText, { marginBottom: 6 }]}>
                    {t('appointments.nameLabel', { name: selectedAppointment.participantName })}
                  </Text>
                ) : null}
                <Text style={[uiStyles.bodyText, { marginBottom: 6 }]}>
                  {t('appointments.emailLabel', { email: selectedAppointment.participantEmail })}
                </Text>
                <Text style={uiStyles.secondaryText}>
                  {t('appointments.createdAtLabel', {
                    dateTime: formatDateTime(selectedAppointment.createdAt),
                  })}
                </Text>
              </>
            ) : dayAppointments.length ? (
              <Text style={uiStyles.secondaryText}>{t('appointments.selectHint')}</Text>
            ) : (
              <Text style={uiStyles.secondaryText}>{t('appointments.emptyDay')}</Text>
            )}
          </ScrollView>
        </View>

        <View style={[uiStyles.footerRow, { marginTop: theme.spacing[16] }]}>
          <Link href={`/my-appointments/week?date=${rawDate}`} style={{ marginBottom: 12 }}>
            <Text style={uiStyles.linkText}>
              {t('appointments.openWeekView')}
            </Text>
          </Link>
          <Link href="/my-appointments">
            <Text style={uiStyles.linkText}>
              {t('appointments.backToMonth')}
            </Text>
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}
