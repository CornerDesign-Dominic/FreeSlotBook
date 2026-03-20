import { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import {
  buildMonthGrid,
  formatMonthTitle,
  getDayKey,
  getWeekdayLabels,
  getSlotCountsByDay,
} from '../../src/features/mvp/calendar-utils';
import { useOwnerCalendar } from '../../src/features/mvp/useOwnerCalendar';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';
import { useAuth } from '../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppSettings } from '@/src/settings/provider';
import { CalendarNavigationHeader } from '../../src/components/calendar-navigation-header';
import { theme, uiStyles } from '../../src/theme/ui';

export default function MyCalendarScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useTranslation();
  const { weekStartsOn } = useAppSettings();
  const { width: screenWidth } = useWindowDimensions();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(calendar?.id ?? null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const monthGrid = useMemo(
    () => buildMonthGrid(visibleMonth, weekStartsOn),
    [visibleMonth, weekStartsOn]
  );
  const slotCountsByDay = useMemo(() => getSlotCountsByDay(slots), [slots]);
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

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.content}>
      <Text
        style={[
          uiStyles.sectionTitle,
          {
            marginBottom: theme.spacing[16],
            fontSize: 22,
            letterSpacing: -0.3,
          },
        ]}>
        Mein Slot-Kalender
      </Text>

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
              const slotCount = slotCountsByDay[day.key] ?? 0;
              const isOutsideMonth = !day.isCurrentMonth;
              const hasSlots = slotCount > 0;

              return (
                <View key={day.key} style={{ width: cellWidth }}>
                  <Link href={`/my-calendar/${day.key}`} asChild>
                    <Pressable
                      style={{
                        borderWidth: 1,
                        borderColor: day.isToday ? theme.colors.accent : theme.colors.border,
                        borderRadius: theme.radius.medium,
                        minHeight: cellHeight,
                        paddingHorizontal: theme.spacing[8],
                        paddingVertical: theme.spacing[8],
                        backgroundColor: day.isToday
                          ? theme.colors.accentSoft
                          : hasSlots
                            ? theme.colors.surfaceSoft
                            : isOutsideMonth
                              ? theme.colors.background
                              : theme.colors.surface,
                        opacity: isOutsideMonth ? 0.55 : 1,
                      }}>
                      <Text
                        numberOfLines={1}
                        style={[
                          uiStyles.bodyText,
                          {
                            marginBottom: hasSlots ? theme.spacing[8] : 0,
                            color: isOutsideMonth
                              ? theme.colors.textSecondary
                              : theme.colors.textPrimary,
                            fontWeight: day.isToday ? '700' : '500',
                            fontSize: 15,
                          },
                        ]}>
                        {day.date.getDate()}
                      </Text>
                      {slotCount ? (
                        <View
                          style={{
                            alignSelf: 'flex-start',
                            paddingHorizontal: theme.spacing[8],
                            paddingVertical: 4,
                            borderRadius: theme.radius.small,
                            backgroundColor: day.isToday
                              ? theme.colors.surface
                              : theme.colors.accentSoft,
                          }}>
                          <Text
                            numberOfLines={1}
                            style={[
                              uiStyles.metaText,
                              {
                                color: theme.colors.textPrimary,
                                fontWeight: '600',
                                fontSize: 11,
                              },
                            ]}>
                            {slotCount}
                          </Text>
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

        <View
          style={{
            flexDirection: screenWidth < 380 ? 'column' : 'row',
            gap: theme.spacing[12],
            marginTop: theme.spacing[16],
          }}>
          <View style={{ flex: 1 }}>
            <Link href="/my-calendar/create-slot" asChild>
              <Pressable style={uiStyles.button}>
                <Text style={uiStyles.buttonText}>{t('calendar.createSlots')}</Text>
              </Pressable>
            </Link>
          </View>

          <View style={{ flex: 1 }}>
            <Link href={`/my-calendar/week?date=${getDayKey(visibleMonth)}`} asChild>
              <Pressable style={uiStyles.button}>
                <Text style={uiStyles.buttonText}>{t('calendar.openWeekView')}</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        {slotsError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{slotsError}</Text> : null}
        {error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text> : null}
      </View>

      <View style={[uiStyles.footerRow, { alignItems: 'stretch' }]}>
        <View style={{ marginTop: theme.spacing[4] }}>
          <Link href="/(tabs)" asChild>
            <Pressable style={uiStyles.button}>
              <Text style={uiStyles.buttonText}>← Dashboard</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
