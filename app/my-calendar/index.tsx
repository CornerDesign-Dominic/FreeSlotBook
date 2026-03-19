import { useEffect, useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  buildMonthGrid,
  formatMonthTitle,
  getSlotCountsByDay,
} from '../../src/features/mvp/calendar-utils';
import {
  updateCalendarNotificationSettings,
  updateCalendarVisibility,
} from '../../src/features/mvp/repository';
import { useOwnerCalendar } from '../../src/features/mvp/useOwnerCalendar';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';
import { useAuth } from '../../src/firebase/useAuth';
import { LanguageSwitcher } from '../../src/i18n/language-switcher';
import { useTranslation } from '../../src/i18n/provider';

const weekDayLabels = {
  de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
} as const;

function getNotificationStatusLabel(active: boolean, t: ReturnType<typeof useTranslation>['t']) {
  return active ? t('calendar.notificationActive') : t('calendar.notificationInactive');
}

export default function MyCalendarScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useTranslation();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(calendar?.id ?? null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [togglingNotifications, setTogglingNotifications] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);
  const [publicSlug, setPublicSlug] = useState('');

  useEffect(() => {
    setPublicSlug(calendar?.publicSlug ?? '');
  }, [calendar?.publicSlug]);

  const monthGrid = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const slotCountsByDay = useMemo(() => getSlotCountsByDay(slots), [slots]);

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

  const handleToggleNewSlotsNotification = async () => {
    if (!calendar) {
      return;
    }

    setTogglingNotifications(true);
    setSettingsMessage(null);

    try {
      await updateCalendarNotificationSettings({
        calendarId: calendar.id,
        notifyOnNewSlotsAvailable: !calendar.notifyOnNewSlotsAvailable,
      });
      setSettingsMessage(t('calendar.settingsSaved'));
    } catch (nextError) {
      setSettingsMessage(
        nextError instanceof Error ? nextError.message : t('calendar.settingsSaveError')
      );
    } finally {
      setTogglingNotifications(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!calendar) {
      return;
    }

    setTogglingVisibility(true);
    setSettingsMessage(null);

    try {
      await updateCalendarVisibility({
        calendarId: calendar.id,
        ownerId: calendar.ownerId,
        visibility: calendar.visibility === 'public' ? 'restricted' : 'public',
        publicSlug,
      });
      setSettingsMessage(t('calendar.visibilitySaved'));
    } catch (nextError) {
      setSettingsMessage(
        nextError instanceof Error ? nextError.message : t('calendar.visibilitySaveError')
      );
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleSavePublicSlug = async () => {
    if (!calendar) {
      return;
    }

    setSavingSlug(true);
    setSettingsMessage(null);

    try {
      await updateCalendarVisibility({
        calendarId: calendar.id,
        ownerId: calendar.ownerId,
        visibility: calendar.visibility,
        publicSlug,
      });
      setSettingsMessage(t('calendar.publicLinkSaved'));
    } catch (nextError) {
      setSettingsMessage(
        nextError instanceof Error ? nextError.message : t('calendar.publicLinkSaveError')
      );
    } finally {
      setSavingSlug(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <LanguageSwitcher />
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>{t('calendar.title')}</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        {calendar ? (
          <>
            <Text style={{ color: 'black', marginBottom: 8 }}>
              {t('calendar.calendarId', { id: calendar.id })}
            </Text>
            <Text style={{ color: 'black', marginBottom: 8 }}>
              {t('calendar.owner', { email: calendar.ownerEmail })}
            </Text>
            <Text style={{ color: 'black', marginBottom: 8 }}>
              {t('dashboard.visibilityValue', { visibility: calendar.visibility })}
            </Text>
            <Text style={{ color: 'black', marginBottom: 8 }}>{t('calendar.publicLinkTitle')}</Text>
            <TextInput
              value={publicSlug}
              onChangeText={setPublicSlug}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t('calendar.publicSlugPlaceholder')}
              style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 8 }}
            />
            <Text style={{ color: 'black', marginBottom: 8 }}>{t('calendar.publicSlugHelp')}</Text>
            <Pressable onPress={handleSavePublicSlug} disabled={savingSlug}>
              <Text style={{ color: 'black', textDecorationLine: 'underline', marginBottom: 12 }}>
                {savingSlug ? t('calendar.savingLink') : t('calendar.saveLink')}
              </Text>
            </Pressable>
            <Text style={{ color: 'black', marginBottom: 8 }}>
              {t('calendar.notificationSetting', {
                status: getNotificationStatusLabel(calendar.notifyOnNewSlotsAvailable, t),
              })}
            </Text>
            <Pressable onPress={handleToggleVisibility} disabled={togglingVisibility}>
              <Text style={{ color: 'black', textDecorationLine: 'underline', marginBottom: 12 }}>
                {togglingVisibility
                  ? t('calendar.updatingVisibility')
                  : calendar.visibility === 'public'
                    ? t('calendar.makeRestricted')
                    : t('calendar.makePublic')}
              </Text>
            </Pressable>
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
            ) : calendar.visibility === 'public' ? (
              <Text style={{ color: 'black', marginBottom: 12 }}>
                {t('calendar.publicSlugMissing')}
              </Text>
            ) : null}
            <Pressable onPress={handleToggleNewSlotsNotification} disabled={togglingNotifications}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                {togglingNotifications
                  ? t('calendar.updatingSetting')
                  : calendar.notifyOnNewSlotsAvailable
                    ? t('calendar.disableNotifications')
                    : t('calendar.enableNotifications')}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: 'black' }}>{t('calendar.notAvailable')}</Text>
        )}

        {error ? <Text style={{ color: 'black', marginTop: 12 }}>{error}</Text> : null}
        {settingsMessage ? <Text style={{ color: 'black', marginTop: 12 }}>{settingsMessage}</Text> : null}
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
          {weekDayLabels[language].map((label) => (
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
