import { useEffect, useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { AppScreenHeader } from '../../../../src/components/app-screen-header';
import { CalendarNavigationHeader } from '../../../../src/components/calendar-navigation-header';
import { subscribeToSlotCalendarMonthReset } from '../../../../src/navigation/slot-calendar-month-reset';
import {
  buildMonthGrid,
  formatMonthTitle,
  getDayKey,
  getWeekdayLabels,
} from '../../../../src/domain/calendar-utils';
import { useOwnerCalendar } from '../../../../src/domain/useOwnerCalendar';
import { useOwnerSlots } from '../../../../src/domain/useOwnerSlots';
import { useAuth } from '../../../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppSettings } from '@/src/settings/provider';
import { useAppTheme, useBottomSafeContentStyle } from '../../../../src/theme/ui';

export default function MyCalendarScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useTranslation();
  const { weekStartsOn } = useAppSettings();
  const { theme, uiStyles } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(calendar?.id ?? null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    return subscribeToSlotCalendarMonthReset(() => {
      const now = new Date();
      setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    });
  }, []);

  const monthGrid = useMemo(
    () => buildMonthGrid(visibleMonth, weekStartsOn),
    [visibleMonth, weekStartsOn]
  );
  const slotCountsByDay = useMemo(() => {
    return slots.reduce<Record<string, { available: number; booked: number }>>((accumulator, slot) => {
      if (!slot.startsAt) {
        return accumulator;
      }

      const dayKey = getDayKey(slot.startsAt);
      const currentDay = accumulator[dayKey] ?? { available: 0, booked: 0 };

      if (slot.status === 'available') {
        currentDay.available += 1;
      } else if (slot.status === 'booked') {
        currentDay.booked += 1;
      }

      accumulator[dayKey] = currentDay;
      return accumulator;
    }, {});
  }, [slots]);
  const weekdayLabels = useMemo(
    () => getWeekdayLabels(language, weekStartsOn),
    [language, weekStartsOn]
  );
  const calendarCellGap = theme.spacing[4];
  const availableWidth = Math.max(screenWidth - theme.spacing[16] * 2 - theme.spacing[16] * 2, 280);
  const cellWidth = (availableWidth - calendarCellGap * 6) / 7;
  const cellHeight = Math.max(Math.min(cellWidth * 1.08, 74), 54);

  if (authLoading || loading || slotsLoading) {
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

  const formatCompactCount = (count: number) => {
    if (count > 9) {
      return '9+';
    }

    return `${count}`;
  };

  return (
    <ScrollView
      style={uiStyles.screen}
      contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Slot-Kalender" />

      <View style={uiStyles.panel}>
        <CalendarNavigationHeader
          title={formatMonthTitle(visibleMonth, locale)}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
        />

        <View
          style={{
            flexDirection: 'row',
            marginBottom: theme.spacing[12],
            columnGap: calendarCellGap,
          }}>
          {weekdayLabels.map((label) => (
            <View key={label} style={{ width: cellWidth }}>
              <Text
                numberOfLines={1}
                style={[uiStyles.metaText, { textAlign: 'center', fontSize: 12 }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ rowGap: calendarCellGap }}>
          {monthGrid.map((week, weekIndex) => (
            <View
              key={`week-${weekIndex}`}
              style={{ flexDirection: 'row', columnGap: calendarCellGap }}>
              {week.map((day) => {
                const slotCounts = slotCountsByDay[day.key] ?? { available: 0, booked: 0 };
                const isOutsideMonth = !day.isCurrentMonth;
                const hasVisibleCounts = slotCounts.available > 0 || slotCounts.booked > 0;

                return (
                  <View key={day.key} style={{ width: cellWidth }}>
                    <Link href={`/my-calendar/${day.key}`} asChild>
                      <Pressable
                        style={{
                          borderWidth: 1,
                          borderColor: day.isToday ? theme.colors.accent : theme.colors.border,
                          borderRadius: theme.radius.medium,
                          height: cellHeight,
                          paddingHorizontal: theme.spacing[4],
                          paddingVertical: theme.spacing[8],
                          justifyContent: 'space-between',
                          backgroundColor: day.isToday
                            ? theme.colors.accentSoft
                            : hasVisibleCounts
                              ? theme.colors.surfaceSoft
                              : isOutsideMonth
                                ? theme.colors.background
                                : theme.colors.surface,
                          opacity: isOutsideMonth ? 0.55 : 1,
                        }}>
                        <Text
                          style={[
                            uiStyles.bodyText,
                            {
                              color: isOutsideMonth
                                ? theme.colors.textSecondary
                                : theme.colors.textPrimary,
                              fontWeight: day.isToday ? '700' : '500',
                              fontSize: 14,
                              textAlign: 'center',
                            },
                          ]}>
                          {day.date.getDate()}
                        </Text>
                        {hasVisibleCounts ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              minHeight: 18,
                              gap: theme.spacing[8],
                            }}>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                              <Text
                                style={[
                                  uiStyles.metaText,
                                  {
                                    color: theme.colors.accent,
                                    fontSize: 13,
                                    fontWeight: '700',
                                  },
                                ]}>
                                {formatCompactCount(slotCounts.available)}
                              </Text>
                            </View>

                            <View
                              style={{
                                flex: 1,
                                alignItems: 'center',
                              }}>
                              <Text
                                style={[
                                  uiStyles.metaText,
                                  {
                                    color: theme.colors.textSecondary,
                                    fontSize: 13,
                                    fontWeight: '700',
                                  },
                                ]}>
                                {formatCompactCount(slotCounts.booked)}
                              </Text>
                            </View>
                          </View>
                        ) : null}
                      </Pressable>
                    </Link>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {slotsError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{slotsError}</Text> : null}
        {error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text> : null}
      </View>

      <View style={uiStyles.panel}>
        <View style={{ gap: theme.spacing[12] }}>
          <Link href="/my-calendar/week" asChild>
            <Pressable style={uiStyles.button}>
              <Text style={uiStyles.buttonText}>Wochenansicht</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
