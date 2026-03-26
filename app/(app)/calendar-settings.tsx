import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { useCalendar } from '@/src/domain/useCalendar';
import { useOwnerCalendar } from '@/src/domain/useOwnerCalendar';
import { useOwnerProfile } from '@/src/domain/useOwnerProfile';
import { getSubscriptionLimits } from '@/src/domain/subscription-policy';
import {
  updateCalendarDescription,
  updateCalendarNotificationSettings,
  updateCalendarTitle,
  updateCalendarVisibility,
} from '@/src/domain/repository';
import { useAuth } from '@/src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

export default function CalendarSettingsScreen() {
  const { user, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ calendarId?: string | string[] }>();
  const { t } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const insets = useSafeAreaInsets();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const selectedCalendarId = Array.isArray(params.calendarId) ? params.calendarId[0] ?? null : params.calendarId ?? null;
  const { profile, loading: profileLoading, error: profileError } = useOwnerProfile(
    user ? { uid: user.uid, email: user.email } : null
  );
  const ownerCalendarState = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const selectedCalendarState = useCalendar(selectedCalendarId);
  const calendar = selectedCalendarId ? selectedCalendarState.calendar : ownerCalendarState.calendar;
  const loading = selectedCalendarId ? selectedCalendarState.loading : ownerCalendarState.loading;
  const error = selectedCalendarId ? selectedCalendarState.error : ownerCalendarState.error;
  const activeCalendarId = calendar?.id ?? null;
  const [visibilityMessage, setVisibilityMessage] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [titleValue, setTitleValue] = useState('');
  const [titleMessage, setTitleMessage] = useState<string | null>(null);
  const [descriptionValue, setDescriptionValue] = useState('');
  const [descriptionMessage, setDescriptionMessage] = useState<string | null>(null);
  const [savingTitle, setSavingTitle] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [togglingNotifications, setTogglingNotifications] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [copyFeedbackVisible, setCopyFeedbackVisible] = useState(false);
  const [titleEditorVisible, setTitleEditorVisible] = useState(false);
  const [descriptionEditorVisible, setDescriptionEditorVisible] = useState(false);

  useEffect(() => {
    setTitleValue(calendar?.title ?? '');
  }, [calendar?.title]);

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
      setDescriptionEditorVisible(false);
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

  const handleSaveTitle = async () => {
    if (!activeCalendarId || savingTitle) {
      return;
    }

    setSavingTitle(true);
    setTitleMessage(null);

    try {
      await updateCalendarTitle({
        calendarId: activeCalendarId,
        title: titleValue,
      });
      setTitleMessage('Kalendertitel gespeichert');
      setTitleEditorVisible(false);
    } catch (nextError) {
      setTitleMessage(
        nextError instanceof Error
          ? nextError.message
          : 'Der Kalendertitel konnte nicht gespeichert werden.'
      );
    } finally {
      setSavingTitle(false);
    }
  };

  const isTitleValid = Boolean(titleValue.trim()) && titleValue.trim().length <= 80;
  const canSaveTitle =
    Boolean(activeCalendarId) &&
    isTitleValid &&
    !savingTitle &&
    titleValue.trim() !== (calendar?.title ?? '').trim();
  const isDescriptionValid = descriptionValue.length <= 80;
  const canSaveDescription =
    Boolean(activeCalendarId) &&
    isDescriptionValid &&
    !savingDescription &&
    descriptionValue !== (calendar?.description ?? '');
  const subscriptionTier = profile?.subscriptionTier ?? 'free';
  const subscriptionLimits = getSubscriptionLimits(subscriptionTier);
  const canManagePublicCalendar = subscriptionLimits.maxPublicCalendars !== 0;

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
            <Link
              href={{
                pathname: '/calendar-id-create',
                params: activeCalendarId ? { calendarId: activeCalendarId } : undefined,
              }}
              asChild>
              <Pressable style={[uiStyles.button, uiStyles.buttonActive]}>
                <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
                  Kalender-ID erstellen
                </Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        {calendar?.publicSlug ? (
          <View style={uiStyles.panel}>
            <Text style={uiStyles.sectionTitle}>Kalender-ID</Text>
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
                    color: theme.colors.accent,
                    fontWeight: '600',
                  },
                ]}>
                /calendar/{calendar.publicSlug}
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

        <View style={uiStyles.panel}>
          <Text style={uiStyles.sectionTitle}>Kalender Teilen</Text>
          <Link
            href={{
              pathname: '/calendar-access',
              params: activeCalendarId ? { calendarId: activeCalendarId } : undefined,
            }}
            asChild>
            <Pressable style={uiStyles.button}>
              <Text style={uiStyles.buttonText}>zur Mitgliederliste</Text>
            </Pressable>
          </Link>
        </View>

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
          <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>Kalender Titel</Text>
          <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[12] }]}>
            {calendar?.title?.trim() ? calendar.title : 'Kein Titel'}
          </Text>
          <Pressable
            onPress={() => {
              setTitleValue(calendar?.title ?? '');
              setTitleMessage(null);
              setTitleEditorVisible(true);
            }}
            style={uiStyles.button}>
            <Text style={uiStyles.buttonText}>bearbeiten</Text>
          </Pressable>
          {titleMessage ? (
            <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[12] }]}>
              {titleMessage}
            </Text>
          ) : null}
        </View>

        <View style={uiStyles.panel}>
          <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>Beschreibung</Text>
          <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[12] }]}>
            {calendar?.description?.trim() ? calendar.description : 'Keine Beschreibung'}
          </Text>
          <Pressable
            onPress={() => {
              setDescriptionValue(calendar?.description ?? '');
              setDescriptionMessage(null);
              setDescriptionEditorVisible(true);
            }}
            style={uiStyles.button}>
            <Text style={uiStyles.buttonText}>bearbeiten</Text>
          </Pressable>
          {descriptionMessage ? (
            <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[12] }]}>
              {descriptionMessage}
            </Text>
          ) : null}
        </View>

        <View style={uiStyles.panel}>
          <Text style={uiStyles.sectionTitle}>Benachrichtigung</Text>
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
      </View>

      {error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text> : null}
      {profileError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{profileError}</Text> : null}

      <Modal
        visible={titleEditorVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTitleEditorVisible(false)}>
        <View style={uiStyles.modalBackdrop}>
          <View
            style={[
              uiStyles.modalSheet,
              {
                paddingBottom: theme.spacing[16] + insets.bottom,
                backgroundColor: theme.colors.surface,
              },
            ]}>
            <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[12] }]}>Kalender Titel</Text>
            <TextInput
              value={titleValue}
              onChangeText={(nextValue) => {
                setTitleValue(nextValue.slice(0, 80));
                setTitleMessage(null);
              }}
              maxLength={80}
              placeholder="Titel für deinen Kalender"
              placeholderTextColor={theme.colors.textSecondary}
              style={[uiStyles.input, { marginBottom: theme.spacing[8] }]}
            />
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
              {titleValue.trim().length} / 80 Zeichen
            </Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing[8] }}>
              <Pressable
                onPress={() => {
                  setTitleValue(calendar?.title ?? '');
                  setTitleEditorVisible(false);
                }}
                style={[uiStyles.button, { flex: 1 }]}>
                <Text style={uiStyles.buttonText}>Abbrechen</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleSaveTitle()}
                disabled={!canSaveTitle}
                style={[
                  uiStyles.button,
                  uiStyles.buttonActive,
                  { flex: 1 },
                  !canSaveTitle ? { opacity: 0.6 } : null,
                ]}>
                <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
                  {savingTitle ? 'Speichern ...' : 'Speichern'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={descriptionEditorVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDescriptionEditorVisible(false)}>
        <View style={uiStyles.modalBackdrop}>
          <View
            style={[
              uiStyles.modalSheet,
              {
                paddingBottom: theme.spacing[16] + insets.bottom,
                backgroundColor: theme.colors.surface,
              },
            ]}>
            <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[12] }]}>Beschreibung</Text>
            <TextInput
              value={descriptionValue}
              onChangeText={(nextValue) => {
                setDescriptionValue(nextValue.slice(0, 80));
                setDescriptionMessage(null);
              }}
              multiline
              maxLength={80}
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
              {descriptionValue.length} / 80 Zeichen
            </Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing[8] }}>
              <Pressable
                onPress={() => {
                  setDescriptionValue(calendar?.description ?? '');
                  setDescriptionEditorVisible(false);
                }}
                style={[uiStyles.button, { flex: 1 }]}>
                <Text style={uiStyles.buttonText}>Abbrechen</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleSaveDescription()}
                disabled={!canSaveDescription}
                style={[
                  uiStyles.button,
                  uiStyles.buttonActive,
                  { flex: 1 },
                  !canSaveDescription ? { opacity: 0.6 } : null,
                ]}>
                <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
                  {savingDescription ? 'Speichern ...' : 'Speichern'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
