import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { useOwnerCalendar } from '@/src/domain/useOwnerCalendar';
import { useOwnerProfile } from '@/src/domain/useOwnerProfile';
import {
  updateCalendarDescription,
  updateCalendarNotificationSettings,
  updateCalendarVisibility,
} from '@/src/domain/repository';
import { useAuth } from '@/src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

export default function CalendarSettingsScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const { profile, loading: profileLoading, error: profileError } = useOwnerProfile(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const activeCalendarId = calendar?.id ?? null;
  const [visibilityMessage, setVisibilityMessage] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [descriptionValue, setDescriptionValue] = useState('');
  const [descriptionMessage, setDescriptionMessage] = useState<string | null>(null);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [togglingNotifications, setTogglingNotifications] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [copyFeedbackVisible, setCopyFeedbackVisible] = useState(false);

  useEffect(() => {
    setDescriptionValue(calendar?.description ?? '');
  }, [calendar?.description]);

  useEffect(() => {
    if (!copyFeedbackVisible) {
      return;
    }

    const timeout = setTimeout(() => {
      setCopyFeedbackVisible(false);
    }, 1800);

    return () => clearTimeout(timeout);
  }, [copyFeedbackVisible]);

  if (authLoading || loading || profileLoading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const handleToggleVisibility = async () => {
    if (!calendar || !activeCalendarId) {
      return;
    }

    setTogglingVisibility(true);
    setVisibilityMessage(null);

    try {
      await updateCalendarVisibility({
        calendarId: activeCalendarId,
        ownerId: calendar.ownerId,
        visibility: calendar.visibility === 'public' ? 'private' : 'public',
        publicSlug: calendar.publicSlug ?? '',
      });
      setVisibilityMessage(t('settings.visibilitySaved'));
    } catch (nextError) {
      setVisibilityMessage(
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
    setNotificationMessage(null);

    try {
      await updateCalendarNotificationSettings({
        calendarId: activeCalendarId,
        notifyOnNewSlotsAvailable: !calendar.notifyOnNewSlotsAvailable,
      });
      setNotificationMessage(t('settings.notificationsSaved'));
    } catch (nextError) {
      setNotificationMessage(
        nextError instanceof Error ? nextError.message : t('settings.notificationsSaveError')
      );
    } finally {
      setTogglingNotifications(false);
    }
  };

  const handleCopyCalendarId = async () => {
    if (!calendar?.publicSlug) {
      return;
    }

    await Clipboard.setStringAsync(`https://slotlyme.app/calendar/${calendar.publicSlug}`);
    setCopyFeedbackVisible(true);
  };

  const handleSaveDescription = async () => {
    if (!activeCalendarId || savingDescription) {
      return;
    }

    setSavingDescription(true);
    setDescriptionMessage(null);

    try {
      await updateCalendarDescription({
        calendarId: activeCalendarId,
        description: descriptionValue,
      });
      setDescriptionMessage('Beschreibung gespeichert');
    } catch (nextError) {
      setDescriptionMessage(
        nextError instanceof Error
          ? nextError.message
          : 'Die Beschreibung konnte nicht gespeichert werden.'
      );
    } finally {
      setSavingDescription(false);
    }
  };

  const isDescriptionValid = descriptionValue.length <= 120;
  const canSaveDescription =
    Boolean(activeCalendarId) &&
    isDescriptionValid &&
    !savingDescription &&
    descriptionValue !== (calendar?.description ?? '');
  const subscriptionTier = profile?.subscriptionTier ?? 'free';
  const canManagePublicCalendar = subscriptionTier !== 'free';

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Kalender-Einstellungen" />

        <View>
        {!calendar?.publicSlug ? (
          <View
            style={[
              uiStyles.panel,
              {
                backgroundColor: theme.colors.accentSoft,
                borderColor: theme.colors.accent,
              },
            ]}>
            <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>
              Kalender-ID fehlt
            </Text>
            <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[12] }]}>
              Erstelle jetzt deine Kalender-ID, damit du deinen Kalender teilen kannst und andere ihn
              leichter finden.
            </Text>
            <Link href="/calendar-id-create" asChild>
              <Pressable style={[uiStyles.button, uiStyles.buttonActive]}>
                <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
                  Kalender-ID erstellen
                </Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        <View style={uiStyles.panel}>
          <Text style={uiStyles.sectionTitle}>Kalenderdetails</Text>
          {calendar ? (
            <>
              <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
                {t('settings.ownerEmail', { email: calendar.ownerEmail })}
              </Text>
              <Text style={uiStyles.bodyText}>Kalendertyp: privat</Text>
            </>
          ) : (
            <Text style={uiStyles.secondaryText}>{t('calendar.notAvailable')}</Text>
          )}

          {error || profileError ? (
            <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>
              {error ?? profileError}
            </Text>
          ) : null}
        </View>

        {calendar?.publicSlug ? (
          <View style={uiStyles.panel}>
            <Text style={uiStyles.sectionTitle}>Kalender-ID</Text>
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
              Dieser Kalender-Link ist bereits fest vergeben und kann aktuell nicht geaendert werden.
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.spacing[12],
              }}>
              <Text
                style={[
                  uiStyles.bodyText,
                  {
                    flex: 1,
                  },
                ]}>
                https://slotlyme.app/calendar/{calendar.publicSlug}
              </Text>
              <Pressable
                onPress={() => void handleCopyCalendarId()}
                accessibilityRole="button"
                accessibilityLabel="Kalender-ID kopieren">
                <Feather
                  name={copyFeedbackVisible ? 'check' : 'copy'}
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>
        ) : null}

        {canManagePublicCalendar ? (
          <View style={uiStyles.panel}>
            <Text style={uiStyles.sectionTitle}>Sichtbarkeit</Text>
            {calendar ? (
              <>
                <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
                  {t('dashboard.visibilityValue', { visibility: calendar.visibility })}
                </Text>
                <Pressable
                  onPress={handleToggleVisibility}
                  disabled={togglingVisibility}
                  style={[
                    uiStyles.button,
                    togglingVisibility ? { opacity: 0.6 } : null,
                  ]}>
                  <Text style={uiStyles.buttonText}>
                    {togglingVisibility
                      ? t('settings.updatingVisibility')
                      : calendar.visibility === 'public'
                        ? t('settings.makeRestricted')
                        : t('settings.makePublic')}
                  </Text>
                </Pressable>
                {visibilityMessage ? (
                  <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[12] }]}>
                    {visibilityMessage}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={uiStyles.secondaryText}>{t('calendar.notAvailable')}</Text>
            )}
          </View>
        ) : null}

        <View style={uiStyles.panel}>
          <Text style={uiStyles.sectionTitle}>Freigaben</Text>
          <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
            Teile deinen Kalender mit anderen Personen und verwalte bestehende Zugriffe an einer Stelle.
          </Text>
          <Link href="/calendar-access" asChild>
            <Pressable style={uiStyles.button}>
              <Text style={uiStyles.buttonText}>Freigaben verwalten</Text>
            </Pressable>
          </Link>
        </View>

        <View style={uiStyles.panel}>
          <Text style={uiStyles.sectionTitle}>Benachrichtigungen</Text>
          {calendar ? (
            <>
              <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
                {t('settings.newSlotsNotifications', {
                  status: calendar.notifyOnNewSlotsAvailable
                    ? t('calendar.notificationActive')
                    : t('calendar.notificationInactive'),
                })}
              </Text>
              <Pressable
                onPress={handleToggleNotifications}
                disabled={togglingNotifications}
                style={[
                  uiStyles.button,
                  togglingNotifications ? { opacity: 0.6 } : null,
                ]}>
                <Text style={uiStyles.buttonText}>
                  {togglingNotifications
                    ? t('settings.updatingNotifications')
                    : calendar.notifyOnNewSlotsAvailable
                      ? t('settings.disableNotifications')
                      : t('settings.enableNotifications')}
                </Text>
              </Pressable>
              {notificationMessage ? (
                <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[12] }]}>
                  {notificationMessage}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={uiStyles.secondaryText}>{t('calendar.notAvailable')}</Text>
          )}
        </View>

        <View style={uiStyles.panel}>
          <Text style={uiStyles.sectionTitle}>Beschreibung</Text>
          <TextInput
            value={descriptionValue}
            onChangeText={(nextValue) => {
              setDescriptionValue(nextValue.slice(0, 120));
              setDescriptionMessage(null);
            }}
            multiline
            maxLength={120}
            placeholder="Kurzbeschreibung für deinen Kalender"
            placeholderTextColor={theme.colors.textSecondary}
            style={[
              uiStyles.input,
              {
                minHeight: 108,
                textAlignVertical: 'top',
                marginBottom: theme.spacing[8],
              },
            ]}
          />
          <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
            {descriptionValue.length} / 120
          </Text>
          <Pressable
            onPress={() => void handleSaveDescription()}
            disabled={!canSaveDescription}
            style={[
              uiStyles.button,
              uiStyles.buttonActive,
              !canSaveDescription ? { opacity: 0.6 } : null,
            ]}>
            <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
              {savingDescription ? 'Speichern ...' : 'Speichern'}
            </Text>
          </Pressable>
          {descriptionMessage ? (
            <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[12] }]}>
              {descriptionMessage}
            </Text>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
