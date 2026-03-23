import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import {
  formatDayTitle,
  getDayKey,
  getMinutesSinceStartOfDay,
  parseDayKey,
} from '../../../../src/domain/calendar-utils';
import { AppScreenHeader } from '../../../../src/components/app-screen-header';
import { CalendarNavigationHeader } from '../../../../src/components/calendar-navigation-header';
import { buildOverflowTimelineLayout, clipAppointmentToDay } from '../../../../src/domain/appointment-calendar-utils';
import type { AppointmentRecord } from '../../../../src/domain/types';
import { useAppointmentCalendar } from '../../../../src/domain/useAppointmentCalendar';
import { useAppointmentCalendarSourceCalendars } from '../../../../src/domain/useAppointmentCalendarSourceCalendars';
import { useAuth } from '../../../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '../../../../src/theme/ui';

const hourWidth = 96;
const laneHeight = 48;
const laneGap = 8;
const topPadding = 20;
const bottomPadding = 16;
const minTimelineHeight = 164;
const hours = Array.from({ length: 24 }, (_, index) => index);

function getLaneTop(lane: number) {
  return topPadding + lane * (laneHeight + laneGap);
}

function getTimelineHeight(laneCount: number) {
  return Math.max(
    minTimelineHeight,
    topPadding + bottomPadding + laneCount * laneHeight + Math.max(laneCount - 1, 0) * laneGap
  );
}

export default function MyAppointmentsDayScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle({
    padding: theme.spacing[16],
  });
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const rawDate = Array.isArray(params.date) ? params.date[0] : params.date ?? '';
  const selectedDate = parseDayKey(rawDate);
  const { width: screenWidth } = useWindowDimensions();
  const timelineScrollRef = useRef<ScrollView>(null);
  const {
    activeAppointments,
    cancelledAppointments,
    loading,
    error,
    getActiveAppointmentsForDay,
    getCancelledAppointmentsForDay,
  } = useAppointmentCalendar(user ? { uid: user.uid, email: user.email } : null);
  const { calendars: sourceCalendars } = useAppointmentCalendarSourceCalendars(
    Array.from(new Set([...activeAppointments, ...cancelledAppointments].map((appointment) => appointment.calendarId)))
  );
  const [stornoExpanded, setStornoExpanded] = useState(false);

  const sourceCalendarLabelById = useMemo(
    () =>
      sourceCalendars.reduce<Record<string, string>>((accumulator, calendar) => {
        accumulator[calendar.id] = calendar.title || calendar.ownerEmail || calendar.calendarSlug || calendar.id;
        return accumulator;
      }, {}),
    [sourceCalendars]
  );
  const dayAppointments = useMemo(
    () => (selectedDate ? getActiveAppointmentsForDay(selectedDate) : []),
    [getActiveAppointmentsForDay, selectedDate]
  );
  const cancelledDayAppointments = useMemo(
    () => (selectedDate ? getCancelledAppointmentsForDay(selectedDate) : []),
    [getCancelledAppointmentsForDay, selectedDate]
  );
  const dayLayout = useMemo(() => {
    if (!selectedDate) {
      return buildOverflowTimelineLayout<
        { id: string; appointment: AppointmentRecord; start: Date; end: Date }
      >([], 3);
    }

    const items = dayAppointments
      .map((appointment) => {
        const clipped = clipAppointmentToDay(appointment, selectedDate);

        if (!clipped) {
          return null;
        }

        return {
          id: appointment.id,
          appointment,
          start: clipped.start,
          end: clipped.end,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return buildOverflowTimelineLayout(items, 3);
  }, [dayAppointments, selectedDate]);

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

  if (!selectedDate) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[16] }]}>{t('appointments.invalidDate')}</Text>
        <Link href="/my-appointments">
          <Text style={uiStyles.linkText}>{t('appointments.backToMonth')}</Text>
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
      <ScrollView contentContainerStyle={contentContainerStyle}>
        <AppScreenHeader title="Termin-Kalender" />

        <View style={uiStyles.panel}>
          <CalendarNavigationHeader
            title={formatDayTitle(selectedDate, locale)}
            onPrevious={() => navigateToRelativeDay(-1)}
            onNext={() => navigateToRelativeDay(1)}
          />

          <View
            style={[
              uiStyles.timelineShell,
              { backgroundColor: theme.colors.background, padding: theme.spacing[12] },
            ]}>
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
                      <Text style={[uiStyles.metaText, { fontSize: 12 }]}>
                        {`${`${hour}`.padStart(2, '0')}:00`}
                      </Text>
                    </View>
                  ))}
                </View>

                <View
                  style={{
                    position: 'relative',
                    height: getTimelineHeight(dayLayout.laneCount),
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
                        opacity: 0.7,
                      }}
                    />
                  ))}

                  {dayLayout.visibleItems.map(({ item, lane }) => {
                    const left = (getMinutesSinceStartOfDay(item.start) / 60) * hourWidth;
                    const durationMinutes = Math.max((item.end.getTime() - item.start.getTime()) / 60000, 30);
                    const width = Math.max((durationMinutes / 60) * hourWidth, 92);

                    return (
                      <View
                        key={item.id}
                        style={{
                          position: 'absolute',
                          left,
                          top: getLaneTop(lane),
                          width,
                          minHeight: laneHeight,
                          padding: 10,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.surfaceSoft,
                          borderRadius: theme.radius.medium,
                        }}>
                        <Text style={[uiStyles.bodyText, { marginBottom: 6 }]} numberOfLines={1}>
                          {formatTimeRange(item.appointment)}
                        </Text>
                        <Text style={[uiStyles.secondaryText, { marginBottom: 4 }]} numberOfLines={1}>
                          {item.appointment.source === 'manual'
                            ? t('appointments.sourceManual')
                            : t('appointments.sourceSelfService')}
                        </Text>
                        <Text style={uiStyles.metaText} numberOfLines={1}>
                          {sourceCalendarLabelById[item.appointment.calendarId] ?? item.appointment.calendarId}
                        </Text>
                      </View>
                    );
                  })}

                  {dayLayout.overflowItems.map((overflowItem) => {
                    const left = (getMinutesSinceStartOfDay(overflowItem.start) / 60) * hourWidth;
                    const durationMinutes = Math.max(
                      (overflowItem.end.getTime() - overflowItem.start.getTime()) / 60000,
                      30
                    );
                    const width = Math.max((durationMinutes / 60) * hourWidth, 64);

                    return (
                      <View
                        key={overflowItem.id}
                        style={{
                          position: 'absolute',
                          left,
                          top: getLaneTop(overflowItem.lane),
                          width,
                          minHeight: laneHeight,
                          padding: 10,
                          borderWidth: 1,
                          borderColor: theme.colors.accent,
                          backgroundColor: theme.colors.accentSoft,
                          borderRadius: theme.radius.medium,
                          justifyContent: 'center',
                        }}>
                        <Text style={uiStyles.bodyText} numberOfLines={1}>
                          {t('appointments.timelineOverflow', { count: overflowItem.hiddenCount })}
                        </Text>
                      </View>
                    );
                  })}

                  {!dayLayout.visibleItems.length && !dayLayout.overflowItems.length ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={uiStyles.secondaryText}>{t('appointments.emptyDay')}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </ScrollView>
          </View>

          {error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text> : null}
        </View>

        <View style={uiStyles.panel}>
          <Pressable
            onPress={() => setStornoExpanded((currentValue) => !currentValue)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing[12],
            }}>
            <Text style={uiStyles.sectionTitle}>
              {t('appointments.cancelledCardTitle', { count: cancelledDayAppointments.length })}
            </Text>
            <Text style={uiStyles.linkText}>{stornoExpanded ? t('common.close') : t('appointments.show')}</Text>
          </Pressable>

          {stornoExpanded ? (
            cancelledDayAppointments.length ? (
              <View style={{ marginTop: theme.spacing[12], gap: theme.spacing[12] }}>
                {cancelledDayAppointments.map((appointment) => (
                  <View
                    key={appointment.id}
                    style={[
                      uiStyles.subtlePanel,
                      {
                        backgroundColor: theme.colors.surfaceSoft,
                      },
                    ]}>
                    <Text style={[uiStyles.bodyText, { marginBottom: 6 }]}>
                      {formatTimeRange(appointment)}
                    </Text>
                    <Text style={[uiStyles.secondaryText, { marginBottom: 4 }]}>
                      {sourceCalendarLabelById[appointment.calendarId] ?? appointment.calendarId}
                    </Text>
                    <Text style={uiStyles.metaText}>
                      {appointment.source === 'manual'
                        ? t('appointments.sourceManual')
                        : t('appointments.sourceSelfService')}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>
                {t('appointments.emptyCancelled')}
              </Text>
            )
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
