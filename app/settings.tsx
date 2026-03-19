import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  updateCalendarNotificationSettings,
  updateCalendarVisibility,
} from '../src/features/mvp/repository';
import { useOwnerCalendar } from '../src/features/mvp/useOwnerCalendar';
import { useAuth } from '../src/firebase/useAuth';
import { LanguageSwitcher } from '../src/i18n/language-switcher';
import { useTranslation } from '../src/i18n/provider';
import { useAppSettings } from '../src/settings/provider';
import type { AppTheme, WeekStartsOn } from '../src/settings/types';

function ChoiceButton(props: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={{
        borderWidth: 1,
        borderColor: 'black',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: props.active ? '#f1f1f1' : 'white',
      }}>
      <Text style={{ color: 'black' }}>{props.label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { theme, setTheme, weekStartsOn, setWeekStartsOn } = useAppSettings();
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [publicSlug, setPublicSlug] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [togglingNotifications, setTogglingNotifications] = useState(false);

  useEffect(() => {
    setPublicSlug(calendar?.publicSlug ?? '');
  }, [calendar?.publicSlug]);

  if (authLoading || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const handleSetTheme = async (nextTheme: AppTheme) => {
    await setTheme(nextTheme);
  };

  const handleSetWeekStartsOn = async (nextWeekStartsOn: WeekStartsOn) => {
    await setWeekStartsOn(nextWeekStartsOn);
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
      setSettingsMessage(t('settings.slugSaved'));
    } catch (nextError) {
      setSettingsMessage(
        nextError instanceof Error ? nextError.message : t('settings.slugSaveError')
      );
    } finally {
      setSavingSlug(false);
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
      setSettingsMessage(t('settings.visibilitySaved'));
    } catch (nextError) {
      setSettingsMessage(
        nextError instanceof Error ? nextError.message : t('settings.visibilitySaveError')
      );
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleToggleNotifications = async () => {
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
      setSettingsMessage(t('settings.notificationsSaved'));
    } catch (nextError) {
      setSettingsMessage(
        nextError instanceof Error ? nextError.message : t('settings.notificationsSaveError')
      );
    } finally {
      setTogglingNotifications(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>{t('settings.title')}</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 8 }}>{t('settings.language')}</Text>
        <LanguageSwitcher />
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 8 }}>{t('settings.weekStart')}</Text>
        <Text style={{ color: 'black', marginBottom: 12 }}>{t('settings.weekStartHelp')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ChoiceButton
            label={t('settings.weekStartMonday')}
            active={weekStartsOn === 'monday'}
            onPress={() => handleSetWeekStartsOn('monday')}
          />
          <ChoiceButton
            label={t('settings.weekStartSunday')}
            active={weekStartsOn === 'sunday'}
            onPress={() => handleSetWeekStartsOn('sunday')}
          />
        </View>
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 8 }}>{t('settings.theme')}</Text>
        <Text style={{ color: 'black', marginBottom: 12 }}>{t('settings.themeHelp')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ChoiceButton
            label={t('settings.themeLight')}
            active={theme === 'light'}
            onPress={() => handleSetTheme('light')}
          />
          <ChoiceButton
            label={t('settings.themeDark')}
            active={theme === 'dark'}
            onPress={() => handleSetTheme('dark')}
          />
        </View>
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 8 }}>{t('settings.publicCalendar')}</Text>
        {calendar ? (
          <>
            <Text style={{ color: 'black', marginBottom: 8 }}>
              {t('settings.ownerEmail', { email: calendar.ownerEmail })}
            </Text>
            <Text style={{ color: 'black', marginBottom: 8 }}>
              {t('dashboard.visibilityValue', { visibility: calendar.visibility })}
            </Text>
            <Text style={{ color: 'black', marginBottom: 8 }}>{t('settings.publicSlug')}</Text>
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
                {savingSlug ? t('settings.savingSlug') : t('settings.saveSlug')}
              </Text>
            </Pressable>
            {calendar.publicSlug ? (
              <>
                <Text style={{ color: 'black', marginBottom: 8 }}>
                  {t('settings.publicLinkValue', { slug: calendar.publicSlug })}
                </Text>
                <Link href={`/${calendar.publicSlug}`} asChild>
                  <Pressable style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
                    <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                      {t('settings.openPublicPage')}
                    </Text>
                  </Pressable>
                </Link>
              </>
            ) : (
              <Text style={{ color: 'black', marginBottom: 12 }}>{t('settings.publicLinkEmpty')}</Text>
            )}
            <Text style={{ color: 'black', marginBottom: 8 }}>
              {t('settings.newSlotsNotifications', {
                status: calendar.notifyOnNewSlotsAvailable
                  ? t('calendar.notificationActive')
                  : t('calendar.notificationInactive'),
              })}
            </Text>
            <Pressable onPress={handleToggleVisibility} disabled={togglingVisibility}>
              <Text style={{ color: 'black', textDecorationLine: 'underline', marginBottom: 12 }}>
                {togglingVisibility
                  ? t('settings.updatingVisibility')
                  : calendar.visibility === 'public'
                    ? t('settings.makeRestricted')
                    : t('settings.makePublic')}
              </Text>
            </Pressable>
            <Pressable onPress={handleToggleNotifications} disabled={togglingNotifications}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                {togglingNotifications
                  ? t('settings.updatingNotifications')
                  : calendar.notifyOnNewSlotsAvailable
                    ? t('settings.disableNotifications')
                    : t('settings.enableNotifications')}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: 'black' }}>{t('calendar.notAvailable')}</Text>
        )}

        {error ? <Text style={{ color: 'black', marginTop: 12 }}>{error}</Text> : null}
        {settingsMessage ? <Text style={{ color: 'black', marginTop: 12 }}>{settingsMessage}</Text> : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link href="/(tabs)" style={{ marginTop: 16 }}>
          <Text style={{ color: 'black' }}>{t('nav.backToDashboard')}</Text>
        </Link>
      </View>
    </ScrollView>
  );
}
