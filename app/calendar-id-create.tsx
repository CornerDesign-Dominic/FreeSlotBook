import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { saveCalendarPublicSlug } from '@/src/features/mvp/repository';
import { useCalendarIdAvailability } from '@/src/features/mvp/useCalendarIdAvailability';
import { useOwnerCalendar } from '@/src/features/mvp/useOwnerCalendar';
import { useAuth } from '@/src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

export default function CalendarIdCreateScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const [calendarIdInput, setCalendarIdInput] = useState(calendar?.publicSlug ?? '');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const availability = useCalendarIdAvailability(calendarIdInput, calendar?.id ?? null);

  useEffect(() => {
    if (!calendar?.publicSlug) {
      return;
    }

    setCalendarIdInput(calendar.publicSlug);
  }, [calendar?.publicSlug]);

  const showSaveButton = useMemo(
    () =>
      Boolean(calendar?.id) &&
      Boolean(calendar?.ownerId) &&
      availability.isValid &&
      availability.isAvailable &&
      !availability.isChecking,
    [availability.isAvailable, availability.isChecking, availability.isValid, calendar?.id, calendar?.ownerId]
  );
  const canSave = showSaveButton && !isSaving;

  const handleSave = async () => {
    if (!calendar?.id || !calendar.ownerId || !canSave) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await saveCalendarPublicSlug({
        calendarId: calendar.id,
        ownerId: calendar.ownerId,
        visibility: calendar.visibility,
        publicSlug: availability.normalizedValue,
      });
      router.back();
    } catch (nextError) {
      setSaveMessage(
        nextError instanceof Error ? nextError.message : 'Die Kalender-ID konnte nicht gespeichert werden.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Kalender-ID erstellen" />

      <View style={{ gap: theme.spacing[16] }}>
        <View style={uiStyles.panel}>
          <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
            Kalender-ID
          </Text>
          <TextInput
            value={calendarIdInput}
            onChangeText={setCalendarIdInput}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="slotlyme.app/ID"
            placeholderTextColor={theme.colors.textSecondary}
            style={[uiStyles.input, { marginBottom: theme.spacing[8] }]}
          />

          {availability.formatError ? (
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
              {availability.formatError}
            </Text>
          ) : availability.availabilityMessage ? (
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
              {availability.availabilityMessage}
            </Text>
          ) : null}

          {error ? (
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>{error}</Text>
          ) : null}

          {saveMessage ? (
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
              {saveMessage}
            </Text>
          ) : null}

          {showSaveButton ? (
            <Pressable
              style={[uiStyles.button, uiStyles.buttonActive]}
              onPress={() => void handleSave()}
              disabled={!canSave}>
              <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
                {isSaving ? 'Speichern ...' : 'Speichern'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={uiStyles.secondaryText}>
          Erlaubt sind Kleinbuchstaben von a bis z, Zahlen von 0 bis 9 und Bindestriche. Deine
          Kalender-ID muss zwischen 3 und 30 Zeichen lang sein und wird für deinen öffentlichen
          Kalenderlink verwendet.
        </Text>
      </View>
    </ScrollView>
  );
}
