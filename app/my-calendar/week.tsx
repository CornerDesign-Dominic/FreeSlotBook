import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import {
  buildWeekDays,
  formatWeekRange,
  getDayKey,
  getMinutesSinceStartOfDay,
  getSlotsForDay,
  parseDayKey,
  startOfWeek,
} from '../../src/features/mvp/calendar-utils';
import { AppScreenHeader } from '../../src/components/app-screen-header';
import { CalendarNavigationHeader } from '../../src/components/calendar-navigation-header';
import { useOwnerCalendar } from '../../src/features/mvp/useOwnerCalendar';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';
import type { CalendarSlotRecord, SlotStatus } from '../../src/features/mvp/types';
import { useAuth } from '../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppSettings } from '@/src/settings/provider';
import { theme, uiStyles } from '../../src/theme/ui';

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
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(calendar?.id ?? null);

  const weekDays = useMemo(
    () => buildWeekDays(baseDate, weekStartsOn),
    [baseDate, weekStartsOn]
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
    const viewportWidth = Math.max(screenWidth - dayLabelWidth - 32, 120);
    const currentMinutes = getMinutesSinceStartOfDay(new Date());
    const offset = Math.max((currentMinutes / 60) * hourWidth - viewportWidth * 0.5, 0);

    const timeout = setTimeout(() => {
      timelineScrollRef.current?.scrollTo({ x: offset, animated: false });
    }, 0);

    return () => clearTimeout(timeout);
  }, [screenWidth]);

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
    const nextDate = new Date(selectedWeekStart);
    nextDate.setDate(selectedWeekStart.getDate() + offset * 7);
    router.replace(`/my-calendar/week?date=${getDayKey(nextDate)}`);
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
    <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.content}>
      <AppScreenHeader title={t('week.title')} />

      <View style={uiStyles.panel}>
        <CalendarNavigationHeader
          title={formatWeekRange(baseDate, locale, weekStartsOn)}
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
              <Text style={uiStyles.buttonText}>{t('week.backToMonth')}</Text>
            </Pressable>
          </Link>

          <Link href={`/my-calendar/create-slot?date=${getDayKey(baseDate)}`} asChild>
            <Pressable style={uiStyles.button}>
              <Text style={uiStyles.buttonText}>{t('calendar.createSlots')}</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
