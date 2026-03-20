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
        {calendar ? (
          <>
            <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
              {t('calendar.owner', { email: calendar.ownerEmail })}
            </Text>
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
              {t('dashboard.visibilityValue', { visibility: calendar.visibility })}
            </Text>
            {calendar.visibility === 'public' && calendar.publicSlug ? (
              <>
                <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
                  {t('calendar.publicLinkValue', { slug: calendar.publicSlug })}
                </Text>
                <Link href={`/${calendar.publicSlug}`} asChild>
                  <Pressable style={{ alignSelf: 'flex-start', marginBottom: theme.spacing[12] }}>
                    <Text style={uiStyles.linkText}>
                      {t('calendar.openPublicPage')}
                    </Text>
                  </Pressable>
                </Link>
              </>
            ) : null}
            <Link href="/settings" asChild>
              <Pressable style={{ alignSelf: 'flex-start' }}>
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
        <Link href="/my-calendar/create-slot" asChild>
          <Pressable style={{ marginBottom: theme.spacing[16] }}>
            <Text style={uiStyles.linkText}>
              {t('calendar.createSlots')}
            </Text>
          </Pressable>
        </Link>

        <Link href="/my-calendar/access" asChild>
          <Pressable style={{ marginBottom: theme.spacing[16] }}>
            <Text style={uiStyles.linkText}>
              {t('calendar.manageAccess')}
            </Text>
          </Pressable>
        </Link>

        <Link href={`/my-calendar/week?date=${getDayKey(visibleMonth)}`} asChild>
          <Pressable style={{ marginBottom: theme.spacing[16] }}>
            <Text style={uiStyles.linkText}>
              {t('calendar.openWeekView')}
            </Text>
          </Pressable>
        </Link>

        <CalendarNavigationHeader
          title={formatMonthTitle(visibleMonth, locale)}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
        />

        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {weekdayLabels.map((label) => (
            <View key={label} style={{ flex: 1 }}>
              <Text style={[uiStyles.metaText, { textAlign: 'center' }]}>{label}</Text>
            </View>
          ))}
        </View>

        {monthGrid.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={{ flexDirection: 'row' }}>
            {week.map((day) => {
              const slotCount = slotCountsByDay[day.key] ?? 0;

              return (
                <Link key={day.key} href={`/my-calendar/${day.key}`} asChild>
                  <Pressable
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.small,
                      minHeight: 72,
                      padding: theme.spacing[8],
                      backgroundColor: day.isToday ? theme.colors.accentSoft : theme.colors.surface,
                      opacity: day.isCurrentMonth ? 1 : 0.45,
                    }}>
                    <Text style={[uiStyles.bodyText, { marginBottom: 6 }]}>{day.date.getDate()}</Text>
                    {slotCount ? (
                      <Text style={uiStyles.metaText}>
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

        <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{t('calendar.daysWithSlots')}</Text>

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
