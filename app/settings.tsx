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
import { theme as designTheme, uiStyles } from '../src/theme/ui';

function ChoiceButton(props: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={[uiStyles.button, props.active ? uiStyles.buttonActive : null]}>
      <Text style={uiStyles.buttonText}>{props.label}</Text>
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
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
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
    <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.content}>
      <Text style={uiStyles.pageTitle}>{t('settings.title')}</Text>

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: designTheme.spacing[8] }]}>{t('settings.language')}</Text>
        <LanguageSwitcher />
      </View>

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: designTheme.spacing[8] }]}>{t('settings.weekStart')}</Text>
        <Text style={[uiStyles.secondaryText, { marginBottom: designTheme.spacing[12] }]}>{t('settings.weekStartHelp')}</Text>
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

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: designTheme.spacing[8] }]}>{t('settings.theme')}</Text>
        <Text style={[uiStyles.secondaryText, { marginBottom: designTheme.spacing[12] }]}>{t('settings.themeHelp')}</Text>
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

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: designTheme.spacing[8] }]}>{t('settings.publicCalendar')}</Text>
        {calendar ? (
          <>
            <Text style={[uiStyles.bodyText, { marginBottom: designTheme.spacing[8] }]}>
              {t('settings.ownerEmail', { email: calendar.ownerEmail })}
            </Text>
            <Text style={[uiStyles.secondaryText, { marginBottom: designTheme.spacing[8] }]}>
              {t('dashboard.visibilityValue', { visibility: calendar.visibility })}
            </Text>
            <Text style={[uiStyles.bodyText, { marginBottom: designTheme.spacing[8] }]}>{t('settings.publicSlug')}</Text>
            <TextInput
              value={publicSlug}
              onChangeText={setPublicSlug}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t('calendar.publicSlugPlaceholder')}
              placeholderTextColor={designTheme.colors.textSecondary}
              style={[uiStyles.input, { marginBottom: designTheme.spacing[8] }]}
            />
            <Text style={[uiStyles.secondaryText, { marginBottom: designTheme.spacing[8] }]}>{t('calendar.publicSlugHelp')}</Text>
            <Pressable onPress={handleSavePublicSlug} disabled={savingSlug}>
              <Text style={[uiStyles.linkText, { marginBottom: designTheme.spacing[12] }]}>
                {savingSlug ? t('settings.savingSlug') : t('settings.saveSlug')}
              </Text>
            </Pressable>
            {calendar.publicSlug ? (
              <>
                <Text style={[uiStyles.secondaryText, { marginBottom: designTheme.spacing[8] }]}>
                  {t('settings.publicLinkValue', { slug: calendar.publicSlug })}
                </Text>
                <Link href={`/${calendar.publicSlug}`} asChild>
                  <Pressable style={{ alignSelf: 'flex-start', marginBottom: designTheme.spacing[12] }}>
                    <Text style={uiStyles.linkText}>
                      {t('settings.openPublicPage')}
                    </Text>
                  </Pressable>
                </Link>
              </>
            ) : (
              <Text style={[uiStyles.secondaryText, { marginBottom: designTheme.spacing[12] }]}>{t('settings.publicLinkEmpty')}</Text>
            )}
            <Text style={[uiStyles.bodyText, { marginBottom: designTheme.spacing[8] }]}>
              {t('settings.newSlotsNotifications', {
                status: calendar.notifyOnNewSlotsAvailable
                  ? t('calendar.notificationActive')
                  : t('calendar.notificationInactive'),
              })}
            </Text>
            <Pressable onPress={handleToggleVisibility} disabled={togglingVisibility}>
              <Text style={[uiStyles.linkText, { marginBottom: designTheme.spacing[12] }]}>
                {togglingVisibility
                  ? t('settings.updatingVisibility')
                  : calendar.visibility === 'public'
                    ? t('settings.makeRestricted')
                    : t('settings.makePublic')}
              </Text>
            </Pressable>
            <Pressable onPress={handleToggleNotifications} disabled={togglingNotifications}>
              <Text style={uiStyles.linkText}>
                {togglingNotifications
                  ? t('settings.updatingNotifications')
                  : calendar.notifyOnNewSlotsAvailable
                    ? t('settings.disableNotifications')
                    : t('settings.enableNotifications')}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={uiStyles.secondaryText}>{t('calendar.notAvailable')}</Text>
        )}

        {error ? <Text style={[uiStyles.secondaryText, { marginTop: designTheme.spacing[12] }]}>{error}</Text> : null}
        {settingsMessage ? <Text style={[uiStyles.bodyText, { marginTop: designTheme.spacing[12] }]}>{settingsMessage}</Text> : null}
      </View>

      <View style={uiStyles.footerRow}>
        <Link href="/(tabs)" style={{ marginTop: 16 }}>
          <Text style={uiStyles.linkText}>{t('nav.backToDashboard')}</Text>
        </Link>
      </View>
    </ScrollView>
  );
}
