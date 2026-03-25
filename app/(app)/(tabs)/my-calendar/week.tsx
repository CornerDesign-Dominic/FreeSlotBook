import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  buildWeekDays,
  formatWeekRange,
  getDayKey,
  getMinutesSinceStartOfDay,
  getSlotsForDay,
  parseDayKey,
  startOfWeek,
} from '../../../../src/domain/calendar-utils';
import { AppScreenHeader } from '../../../../src/components/app-screen-header';
import { CalendarNavigationHeader } from '../../../../src/components/calendar-navigation-header';
import { useOwnerCalendar } from '../../../../src/domain/useOwnerCalendar';
import { useOwnerSlots } from '../../../../src/domain/useOwnerSlots';
import type { CalendarSlotRecord, SlotStatus } from '../../../../src/domain/types';
import { useAuth } from '../../../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppSettings } from '@/src/settings/provider';
import { useAppTheme, useBottomSafeContentStyle } from '../../../../src/theme/ui';

const hourWidth = 88;
const rowHeight = 64;
const dayLabelWidth = 45;
const headerHeight = 32;
const hours = Array.from({ length: 24 }, (_, index) => index);

function formatDayLabel(date: Date, locale: string) {
  const weekday = date.toLocaleDateString(locale, {
    weekday: 'short',
  });
  const weekdayShort = weekday.replace(/\.$/, '').slice(0, 2);
  const day = date.getDate();
  const month = date.getMonth() + 1;

  return {
    weekday: `${weekdayShort}.`,
    date: `${day}.${month}`,
  };
}

function formatSlotTimeRange(slot: CalendarSlotRecord, locale: string) {
  if (!slot.startsAt || !slot.endsAt) {
    return '';
  }

  const startLabel = slot.startsAt.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endLabel = slot.endsAt.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${startLabel} - ${endLabel}`;
}

export default function CalendarWeekScreen() {
  const isFocused = useIsFocused();
  const router = useRouter();
  const { t, language } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const { weekStartsOn } = useAppSettings();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const rawDate = Array.isArray(params.date) ? params.date[0] : params.date ?? '';
  const routeDate = useMemo(() => parseDayKey(rawDate) ?? new Date(), [rawDate]);
  const routeWeekStart = useMemo(() => startOfWeek(routeDate, weekStartsOn), [routeDate, weekStartsOn]);
  const routeWeekKey = useMemo(() => getDayKey(routeWeekStart), [routeWeekStart]);
  const [visibleWeekStart, setVisibleWeekStart] = useState(routeWeekStart);
  const visibleWeekKey = getDayKey(visibleWeekStart);
  const previousRouteWeekKeyRef = useRef<string | null>(routeWeekKey);
  const timelineScrollRef = useRef<ScrollView>(null);
  const lastAutoScrollSignatureRef = useRef<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(calendar?.id ?? null);
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);
  const [timelineReady, setTimelineReady] = useState(false);
  const [focusVersion, setFocusVersion] = useState(0);

  const weekDays = useMemo(
    () => buildWeekDays(visibleWeekStart, weekStartsOn),
    [visibleWeekStart, weekStartsOn]
  );
  const slotsByDay = useMemo(
    () =>
      weekDays.reduce<Record<string, CalendarSlotRecord[]>>((accumulator, day) => {
        accumulator[day.key] = getSlotsForDay(slots, day.date);
        return accumulator;
      }, {}),
    [slots, weekDays]
  );

  useEffect(() => {
    if (previousRouteWeekKeyRef.current === routeWeekKey) {
      return;
    }

    previousRouteWeekKeyRef.current = routeWeekKey;
    setVisibleWeekStart(routeWeekStart);
  }, [routeWeekKey, routeWeekStart]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    setFocusVersion((currentValue) => currentValue + 1);
  }, [isFocused]);

  useEffect(() => {
    setTimelineReady(false);
  }, [visibleWeekKey]);

  useEffect(() => {
    if (
      !isFocused ||
      authLoading ||
      loading ||
      slotsLoading ||
      !timelineReady ||
      !timelineViewportWidth
    ) {
      return;
    }

    const signature = `${visibleWeekKey}:${focusVersion}`;

    if (lastAutoScrollSignatureRef.current === signature) {
      return;
    }

    let cancelled = false;
    let frameHandle = 0;

    const scrollToNow = () => {
      if (cancelled) {
        return;
      }

      if (!timelineScrollRef.current) {
        frameHandle = requestAnimationFrame(scrollToNow);
        return;
      }

      const currentMinutes = getMinutesSinceStartOfDay(new Date());
      const offset = Math.max((currentMinutes / 60) * hourWidth - timelineViewportWidth * 0.5, 0);

      timelineScrollRef.current.scrollTo({ x: offset, animated: false });
      lastAutoScrollSignatureRef.current = signature;
    };

    frameHandle = requestAnimationFrame(scrollToNow);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameHandle);
    };
  }, [
    authLoading,
    focusVersion,
    isFocused,
    loading,
    slotsLoading,
    timelineReady,
    timelineViewportWidth,
    visibleWeekKey,
  ]);

  const formatSlotStatus = (status: SlotStatus) => {
    switch (status) {
      case 'inactive':
        return t('day.statusInactive');
      case 'booked':
        return t('day.statusBooked');
      default:
        return t('day.statusAvailable');
    }
  };

  const navigateToRelativeWeek = (offset: number) => {
    setVisibleWeekStart((currentWeekStart) => {
      const nextDate = new Date(currentWeekStart);
      nextDate.setDate(currentWeekStart.getDate() + offset * 7);
      return nextDate;
    });
  };

  const openDay = (dayKey: string) => {
    router.push(`/my-calendar/${dayKey}`);
  };

  if (authLoading || loading || slotsLoading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const timeRailWidth = hourWidth * 24;
  const gridLineColor = theme.colors.border;

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title={t('calendar.title')} />

      <View style={uiStyles.panel}>
        <CalendarNavigationHeader
          title={formatWeekRange(visibleWeekStart, locale, weekStartsOn)}
          onPrevious={() => navigateToRelativeWeek(-1)}
          onNext={() => navigateToRelativeWeek(1)}
        />

        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.large,
            backgroundColor: theme.colors.surface,
            overflow: 'hidden',
          }}>
          <View style={{ flexDirection: 'row' }}>
            <View
              style={{
                width: dayLabelWidth,
                flexBasis: dayLabelWidth,
                flexGrow: 0,
                flexShrink: 0,
                minWidth: dayLabelWidth,
                maxWidth: dayLabelWidth,
                backgroundColor: theme.colors.surfaceSoft,
                borderRightWidth: 1,
                borderColor: theme.colors.border,
                overflow: 'hidden',
              }}>
              <View
                style={{
                  height: headerHeight,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderBottomWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                <Text style={[uiStyles.secondaryText, { fontSize: 12 }]}>
                  {t('week.days')}
                </Text>
              </View>

              {weekDays.map((day) => (
                <Pressable
                  key={`label-${day.key}`}
                  onPress={() => openDay(day.key)}
                  style={{
                    height: rowHeight,
                    borderTopWidth: 1,
                    borderColor: theme.colors.border,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: day.isToday ? theme.colors.accentSoft : theme.colors.surfaceSoft,
                  }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.body,
                      fontWeight: day.isToday ? '700' : '600',
                      marginBottom: 2,
                      textAlign: 'center',
                    }}>
                    {formatDayLabel(day.date, locale).weekday}
                  </Text>
                  <Text style={[uiStyles.metaText, { fontSize: 12, textAlign: 'center' }]}>
                    {formatDayLabel(day.date, locale).date}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView
              ref={timelineScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onLayout={(event) => {
                const nextWidth = event.nativeEvent.layout.width;
                setTimelineViewportWidth((currentWidth) =>
                  Math.abs(currentWidth - nextWidth) < 1 ? currentWidth : nextWidth
                );
              }}
              onContentSizeChange={() => setTimelineReady(true)}
              contentContainerStyle={{ minWidth: timeRailWidth }}>
              <View style={{ width: timeRailWidth, backgroundColor: theme.colors.surface }}>
                <View
                  style={{
                    height: headerHeight,
                    flexDirection: 'row',
                    borderBottomWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  }}>
                  {hours.map((hour) => (
                    <View
                      key={`hour-${hour}`}
                      style={{
                        width: hourWidth,
                        borderRightWidth: 1,
                        borderColor: theme.colors.border,
                        justifyContent: 'center',
                      }}>
                      <Text
                        style={[
                          uiStyles.metaText,
                          {
                            fontSize: 11,
                            textAlign: 'center',
                          },
                        ]}>
                        {`${hour + 1}`.padStart(2, '0')}
                      </Text>
                    </View>
                  ))}
                </View>

                {weekDays.map((day) => (
                  <View
                    key={`row-${day.key}`}
                    style={{
                      height: rowHeight,
                      borderTopWidth: 1,
                      borderColor: theme.colors.border,
                      position: 'relative',
                      backgroundColor: day.isToday ? theme.colors.surfaceSoft : theme.colors.surface,
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
                          backgroundColor: gridLineColor,
                          opacity: 0.28,
                        }}
                      />
                    ))}

                    {(slotsByDay[day.key] ?? []).map((slot) => {
                      if (!slot.startsAt || !slot.endsAt) {
                        return null;
                      }

                      const left = (getMinutesSinceStartOfDay(slot.startsAt) / 60) * hourWidth;
                      const durationMinutes = Math.max(
                        (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60000,
                        30
                      );
                      const width = Math.max((durationMinutes / 60) * hourWidth, 56);

                      return (
                        <Pressable
                          key={slot.id}
                          onPress={() => openDay(day.key)}
                          style={{
                            position: 'absolute',
                            left,
                            top: 9,
                            width,
                            minHeight: rowHeight - 18,
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            borderWidth: 1,
                            borderColor:
                              slot.status === 'available'
                                ? theme.colors.accent
                                : theme.colors.border,
                            backgroundColor:
                              slot.status === 'inactive'
                                ? theme.colors.surfaceSoft
                                : slot.status === 'booked'
                                  ? theme.colors.surface
                                  : theme.colors.accentSoft,
                            justifyContent: 'center',
                            borderRadius: theme.radius.small,
                          }}>
                          <Text
                            style={[uiStyles.metaText, { color: theme.colors.textPrimary }]}
                            numberOfLines={1}>
                            {formatSlotTimeRange(slot, locale)}
                          </Text>
                          <Text
                            style={[uiStyles.metaText, { color: theme.colors.textSecondary }]}
                            numberOfLines={1}>
                            {formatSlotStatus(slot.status)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text> : null}
        {slotsError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{slotsError}</Text> : null}
      </View>

      <View style={uiStyles.panel}>
        <View style={{ gap: theme.spacing[12] }}>
          <Link href="/my-calendar" asChild>
            <Pressable style={uiStyles.button}>
              <Text style={uiStyles.buttonText}>Monatsansicht</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
