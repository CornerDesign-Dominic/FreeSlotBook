import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import {
  buildWeekDays,
  formatWeekRange,
  getMinutesSinceStartOfDay,
  getSlotsForDay,
  parseDayKey,
  startOfWeek,
} from '../../src/features/mvp/calendar-utils';
import { useOwnerCalendar } from '../../src/features/mvp/useOwnerCalendar';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';
import type { CalendarSlotRecord, SlotStatus } from '../../src/features/mvp/types';
import { useAuth } from '../../src/firebase/useAuth';
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
    router.replace(`/my-calendar/week?date=${nextDate.toISOString().slice(0, 10)}`);
  };

  const openDay = (dayKey: string) => {
    router.push(`/my-calendar/${dayKey}`);
  };

  if (authLoading || loading || slotsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const timeRailWidth = hourWidth * 24;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>{t('week.title')}</Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
        <Pressable onPress={() => navigateToRelativeWeek(-1)}>
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {'<- '}{t('week.previous')}
          </Text>
        </Pressable>
        <Text style={{ color: 'black', fontSize: 18 }}>{formatWeekRange(baseDate, locale, weekStartsOn)}</Text>
        <Pressable onPress={() => navigateToRelativeWeek(1)}>
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {t('week.next')}{' ->'}
          </Text>
        </Pressable>
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: dayLabelWidth, marginRight: 8 }}>
            <View style={{ height: headerHeight, justifyContent: 'center' }}>
              <Text style={{ color: 'black' }}>{t('week.days')}</Text>
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
                <Text
                  style={{
                    color: 'black',
                    fontWeight: day.isToday ? '700' : '400',
                  }}>
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

                  {slotsByDay[day.key]?.map((slot) => {
                    if (!slot.startsAt || !slot.endsAt) {
                      return null;
                    }

                    const left = (getMinutesSinceStartOfDay(slot.startsAt) / 60) * hourWidth;
                    const durationMinutes = Math.max(
                      (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60000,
                      30
                    );
                    const width = Math.max((durationMinutes / 60) * hourWidth, 52);

                    return (
                      <Pressable
                        key={slot.id}
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
                          backgroundColor:
                            slot.status === 'inactive'
                              ? '#fff6d6'
                              : slot.status === 'booked'
                                ? '#f1f1f1'
                                : 'white',
                          justifyContent: 'center',
                        }}>
                        <Text style={{ color: 'black', fontSize: 11 }} numberOfLines={1}>
                          {formatSlotTimeRange(slot, locale)}
                        </Text>
                        <Text style={{ color: 'black', fontSize: 10 }} numberOfLines={1}>
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

        {error ? <Text style={{ color: 'black', marginTop: 12 }}>{error}</Text> : null}
        {slotsError ? <Text style={{ color: 'black', marginTop: 12 }}>{slotsError}</Text> : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link href="/my-calendar">
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {t('week.backToMonth')}
          </Text>
        </Link>
      </View>
    </ScrollView>
  );
}
