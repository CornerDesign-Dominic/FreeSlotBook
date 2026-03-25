import { useEffect, useMemo, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { AppScreenHeader } from '../../../../src/components/app-screen-header';
import { CalendarNavigationHeader } from '../../../../src/components/calendar-navigation-header';
import {
  buildMonthGrid,
  formatMonthTitle,
  getDayKey,
  getWeekdayLabels,
} from '../../../../src/domain/calendar-utils';
import { useAppointmentCalendar } from '../../../../src/domain/useAppointmentCalendar';
import { useAuth } from '../../../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppSettings } from '@/src/settings/provider';
import { useAppTheme, useBottomSafeContentStyle } from '../../../../src/theme/ui';

export default function MyAppointmentsMonthScreen() {
  const { resetMonth } = useLocalSearchParams<{ resetMonth?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const { weekStartsOn } = useAppSettings();
  const { width: screenWidth } = useWindowDimensions();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const {
    activeAppointments,
    activeAppointmentCountsByDay,
    loading,
    error,
  } = useAppointmentCalendar(user ? { uid: user.uid, email: user.email } : null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    if (!resetMonth) {
      return;
    }

    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }, [resetMonth]);

  const monthGrid = useMemo(
    () => buildMonthGrid(visibleMonth, weekStartsOn),
    [visibleMonth, weekStartsOn]
  );
  const weekdayLabels = useMemo(
    () => getWeekdayLabels(language, weekStartsOn),
    [language, weekStartsOn]
  );
  const calendarCellGap = theme.spacing[4];
  const availableWidth = Math.max(screenWidth - theme.spacing[16] * 2 - theme.spacing[16] * 2, 280);
  const cellWidth = (availableWidth - calendarCellGap * 6) / 7;
  const cellHeight = Math.max(Math.min(cellWidth * 1.08, 74), 54);

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

  const formatCompactCount = (count: number) => {
    if (count > 99) {
      return '99+';
    }

    return `${count}`;
  };

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title={t('appointments.title')} />

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
                const appointmentCount = activeAppointmentCountsByDay[day.key] ?? 0;
                const isOutsideMonth = !day.isCurrentMonth;

                return (
                  <View key={day.key} style={{ width: cellWidth }}>
                    <Link href={`/my-appointments/${day.key}`} asChild>
                      <Pressable
                        style={{
                          borderWidth: 1,
                          borderColor: day.isToday ? theme.colors.accent : theme.colors.border,
                          borderRadius: theme.radius.medium,
                          height: cellHeight,
                          paddingHorizontal: theme.spacing[4],
                          paddingVertical: theme.spacing[8],
                          justifyContent: 'space-between',
                          backgroundColor:
                            day.isToday
                              ? theme.colors.accentSoft
                              : appointmentCount
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
                              marginBottom: appointmentCount ? 6 : 0,
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
                        {appointmentCount ? (
                          <View style={{ alignItems: 'center', minHeight: 18 }}>
                            <Text
                              style={[
                                uiStyles.metaText,
                                {
                                  color: theme.colors.accent,
                                  fontSize: 13,
                                  fontWeight: '700',
                                },
                              ]}>
                              {formatCompactCount(appointmentCount)}
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

        {!activeAppointments.length ? (
          <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>
            {t('appointments.emptyMonth')}
          </Text>
        ) : null}

        {error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text> : null}
      </View>

      <View style={uiStyles.panel}>
        <View style={{ gap: theme.spacing[12] }}>
          <Link href={`/my-appointments/week?date=${getDayKey(visibleMonth)}`} asChild>
            <Pressable style={uiStyles.button}>
              <Text style={uiStyles.buttonText}>{t('appointments.openWeekView')}</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
