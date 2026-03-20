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
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
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
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>{t('calendar.title')}</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        {calendar ? (
          <>
            <Text style={{ color: 'black', marginBottom: 8 }}>
              {t('calendar.owner', { email: calendar.ownerEmail })}
            </Text>
            <Text style={{ color: 'black', marginBottom: 8 }}>
              {t('dashboard.visibilityValue', { visibility: calendar.visibility })}
            </Text>
            {calendar.visibility === 'public' && calendar.publicSlug ? (
              <>
                <Text style={{ color: 'black', marginBottom: 8 }}>
                  {t('calendar.publicLinkValue', { slug: calendar.publicSlug })}
                </Text>
                <Link href={`/${calendar.publicSlug}`} asChild>
                  <Pressable style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
                    <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                      {t('calendar.openPublicPage')}
                    </Text>
                  </Pressable>
                </Link>
              </>
            ) : null}
            <Link href="/settings" asChild>
              <Pressable style={{ alignSelf: 'flex-start' }}>
                <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                  {t('dashboard.openSettings')}
                </Text>
              </Pressable>
            </Link>
          </>
        ) : (
          <Text style={{ color: 'black' }}>{t('calendar.notAvailable')}</Text>
        )}

        {error ? <Text style={{ color: 'black', marginTop: 12 }}>{error}</Text> : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Link href="/my-calendar/create-slot" asChild>
          <Pressable style={{ marginBottom: 16 }}>
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
              {t('calendar.createSlots')}
            </Text>
          </Pressable>
        </Link>

        <Link href="/my-calendar/access" asChild>
          <Pressable style={{ marginBottom: 16 }}>
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
              {t('calendar.manageAccess')}
            </Text>
          </Pressable>
        </Link>

        <Link href={`/my-calendar/week?date=${getDayKey(visibleMonth)}`} asChild>
          <Pressable style={{ marginBottom: 16 }}>
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
              {t('calendar.openWeekView')}
            </Text>
          </Pressable>
        </Link>

        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Pressable onPress={goToPreviousMonth}>
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
              {t('calendar.previousMonth')}
            </Text>
          </Pressable>
          <Text style={{ color: 'black', fontSize: 18 }}>
            {formatMonthTitle(visibleMonth, locale)}
          </Text>
          <Pressable onPress={goToNextMonth}>
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
              {t('calendar.nextMonth')}
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {weekdayLabels.map((label) => (
            <View key={label} style={{ flex: 1 }}>
              <Text style={{ color: 'black', textAlign: 'center' }}>{label}</Text>
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
                      borderColor: 'black',
                      minHeight: 72,
                      padding: 8,
                      backgroundColor: day.isToday ? '#f3f3f3' : 'white',
                      opacity: day.isCurrentMonth ? 1 : 0.45,
                    }}>
                    <Text style={{ color: 'black', marginBottom: 6 }}>{day.date.getDate()}</Text>
                    {slotCount ? (
                      <Text style={{ color: 'black', fontSize: 12 }}>
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

        <Text style={{ color: 'black', marginTop: 12 }}>{t('calendar.daysWithSlots')}</Text>

        {slotsError ? <Text style={{ color: 'black', marginTop: 12 }}>{slotsError}</Text> : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link href="/(tabs)" style={{ marginTop: 16 }}>
          <Text style={{ color: 'black' }}>{t('nav.backToDashboard')}</Text>
        </Link>
      </View>
    </ScrollView>
  );
}
