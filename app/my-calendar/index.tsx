import { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

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
import { useTranslation } from '../../src/i18n/provider';
import { useAppSettings } from '../../src/settings/provider';
import { CalendarNavigationHeader } from '../../src/components/calendar-navigation-header';
import { theme, uiStyles } from '../../src/theme/ui';

export default function MyCalendarScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useTranslation();
  const { weekStartsOn } = useAppSettings();
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
      <Text style={uiStyles.pageTitle}>{t('calendar.title')}</Text>

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>
          {t('calendar.title')}
        </Text>
        {calendar ? (
          <>
            <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>
              {t('calendar.owner', { email: calendar.ownerEmail })}
            </Text>
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
              {t('dashboard.visibilityValue', { visibility: calendar.visibility })}
            </Text>
            {calendar.visibility === 'public' && calendar.publicSlug ? (
              <View
                style={[
                  uiStyles.subtlePanel,
                  {
                    marginBottom: theme.spacing[12],
                    backgroundColor: theme.colors.surfaceSoft,
                  },
                ]}>
                <Text style={[uiStyles.metaText, { marginBottom: theme.spacing[8] }]}>
                  {t('calendar.publicLinkValue', { slug: calendar.publicSlug })}
                </Text>
                <Link href={`/${calendar.publicSlug}`} asChild>
                  <Pressable style={{ alignSelf: 'flex-start' }}>
                    <Text style={uiStyles.linkText}>
                      {t('calendar.openPublicPage')}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            ) : null}
            <Link href="/settings" asChild>
              <Pressable style={{ alignSelf: 'flex-start', paddingVertical: theme.spacing[4] }}>
                <Text style={uiStyles.linkText}>
                  {t('dashboard.openSettings')}
                </Text>
              </Pressable>
            </Link>
          </>
        ) : (
          <Text style={uiStyles.secondaryText}>{t('calendar.notAvailable')}</Text>
        )}

        {error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text> : null}
      </View>

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[12] }]}>
          {formatMonthTitle(visibleMonth, locale)}
        </Text>

        <View
          style={[
            uiStyles.subtlePanel,
            {
              marginBottom: theme.spacing[16],
              backgroundColor: theme.colors.surfaceSoft,
              gap: theme.spacing[12],
            },
          ]}>
          <Link href="/my-calendar/create-slot" asChild>
            <Pressable>
              <Text style={uiStyles.linkText}>
                {t('calendar.createSlots')}
              </Text>
            </Pressable>
          </Link>

          <Link href="/my-calendar/access" asChild>
            <Pressable>
              <Text style={uiStyles.linkText}>
                {t('calendar.manageAccess')}
              </Text>
            </Pressable>
          </Link>

          <Link href={`/my-calendar/week?date=${getDayKey(visibleMonth)}`} asChild>
            <Pressable>
              <Text style={uiStyles.linkText}>
                {t('calendar.openWeekView')}
              </Text>
            </Pressable>
          </Link>
        </View>

        <CalendarNavigationHeader
          title={formatMonthTitle(visibleMonth, locale)}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
        />

        <View
          style={{
            flexDirection: 'row',
            marginBottom: theme.spacing[12],
            paddingHorizontal: theme.spacing[4],
          }}>
          {weekdayLabels.map((label) => (
            <View key={label} style={{ flex: 1 }}>
              <Text style={[uiStyles.metaText, { textAlign: 'center' }]}>{label}</Text>
            </View>
          ))}
        </View>

        {monthGrid.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={{ flexDirection: 'row', marginBottom: theme.spacing[8] }}>
            {week.map((day) => {
              const slotCount = slotCountsByDay[day.key] ?? 0;
              const isOutsideMonth = !day.isCurrentMonth;
              const hasSlots = slotCount > 0;

              return (
                <Link key={day.key} href={`/my-calendar/${day.key}`} asChild>
                  <Pressable
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: day.isToday ? theme.colors.accent : theme.colors.border,
                      borderRadius: theme.radius.medium,
                      minHeight: 78,
                      padding: theme.spacing[12],
                      marginHorizontal: 2,
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
                      style={[
                        uiStyles.bodyText,
                        {
                          marginBottom: 6,
                          color: isOutsideMonth
                            ? theme.colors.textSecondary
                            : theme.colors.textPrimary,
                          fontWeight: day.isToday ? '700' : '500',
                        },
                      ]}>
                      {day.date.getDate()}
                    </Text>
                    {slotCount ? (
                      <Text
                        style={[
                          uiStyles.metaText,
                          {
                            color: hasSlots ? theme.colors.textPrimary : theme.colors.textSecondary,
                          },
                        ]}>
                        {slotCount === 1
                          ? t('calendar.slotCount.one', { count: slotCount })
                          : t('calendar.slotCount.other', { count: slotCount })}
                      </Text>
                    ) : null}
                  </Pressable>
                </Link>
              );
            })}
          </View>
        ))}

        {slotsError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{slotsError}</Text> : null}
      </View>

      <View style={uiStyles.footerRow}>
        <Link href="/(tabs)" style={{ marginTop: 16 }}>
          <Text style={uiStyles.linkText}>{t('nav.backToDashboard')}</Text>
        </Link>
      </View>
    </ScrollView>
  );
}
