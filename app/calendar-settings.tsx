import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { useOwnerCalendar } from '@/src/features/mvp/useOwnerCalendar';
import {
  updateCalendarNotificationSettings,
  updateCalendarVisibility,
} from '@/src/features/mvp/repository';
import { useAuth } from '@/src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

const sections = [
  'Buchungsregeln',
  'Beschreibung',
  'Benachrichtigungen',
] as const;

export default function CalendarSettingsScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const activeCalendarId = calendar?.id ?? null;
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

  const handleSavePublicSlug = async () => {
    if (!calendar || !activeCalendarId) {
      return;
    }

    setSavingSlug(true);
    setSettingsMessage(null);

    try {
      await updateCalendarVisibility({
        calendarId: activeCalendarId,
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
    if (!calendar || !activeCalendarId) {
      return;
    }

    setTogglingVisibility(true);
    setSettingsMessage(null);

    try {
      await updateCalendarVisibility({
        calendarId: activeCalendarId,
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
    if (!calendar || !activeCalendarId) {
      return;
    }

    setTogglingNotifications(true);
    setSettingsMessage(null);

    try {
      await updateCalendarNotificationSettings({
        calendarId: activeCalendarId,
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
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Kalender-Einstellungen" />

      <View style={{ gap: theme.spacing[16] }}>
        <View style={uiStyles.panel}>
          <Text style={uiStyles.sectionTitle}>{t('settings.publicCalendar')}</Text>
          {calendar ? (
            <>
              <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
                {t('settings.ownerEmail', { email: calendar.ownerEmail })}
              </Text>
              <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
                {t('dashboard.visibilityValue', { visibility: calendar.visibility })}
              </Text>
              <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
                {t('settings.publicSlug')}
              </Text>
              <TextInput
                value={publicSlug}
                onChangeText={setPublicSlug}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('calendar.publicSlugPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                style={[uiStyles.input, { marginBottom: theme.spacing[8] }]}
              />
              <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
                {t('calendar.publicSlugHelp')}
              </Text>
              <Pressable onPress={handleSavePublicSlug} disabled={savingSlug}>
                <Text style={[uiStyles.linkText, { marginBottom: theme.spacing[12] }]}>
                  {savingSlug ? t('settings.savingSlug') : t('settings.saveSlug')}
                </Text>
              </Pressable>
              {calendar.publicSlug ? (
                <>
                  <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
                    {t('settings.publicLinkValue', { slug: calendar.publicSlug })}
                  </Text>
                  <Link href={`/${calendar.publicSlug}`} asChild>
                    <Pressable style={{ alignSelf: 'flex-start', marginBottom: theme.spacing[12] }}>
                      <Text style={uiStyles.linkText}>{t('settings.openPublicPage')}</Text>
                    </Pressable>
                  </Link>
                </>
              ) : (
                <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
                  {t('settings.publicLinkEmpty')}
                </Text>
              )}
              <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
                {t('settings.newSlotsNotifications', {
                  status: calendar.notifyOnNewSlotsAvailable
                    ? t('calendar.notificationActive')
                    : t('calendar.notificationInactive'),
                })}
              </Text>
              <Pressable onPress={handleToggleVisibility} disabled={togglingVisibility}>
                <Text style={[uiStyles.linkText, { marginBottom: theme.spacing[12] }]}>
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

          {error ? (
            <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text>
          ) : null}
          {settingsMessage ? (
            <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[12] }]}>{settingsMessage}</Text>
          ) : null}
        </View>

        {sections.map((sectionTitle) => (
          <View key={sectionTitle} style={uiStyles.panel}>
            <Text style={uiStyles.sectionTitle}>{sectionTitle}</Text>
            <Text style={uiStyles.secondaryText}>Einstellungen folgen</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
