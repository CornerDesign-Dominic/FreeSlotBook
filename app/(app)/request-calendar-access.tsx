import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { cancelCalendarAccessRequest, requestCalendarAccessBySlug } from '../../src/domain/repository';
import { usePendingCalendarAccessRequests } from '../../src/domain/usePendingCalendarAccessRequests';
import { AppScreenHeader } from '../../src/components/app-screen-header';
import { useAuth } from '../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '../../src/theme/ui';

function extractCalendarSlug(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  const normalizedValue = trimmedValue
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^slotlyme\.app\/?/i, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/^calendar\//i, '')
    .replace(/^\/+|\/+$/g, '');

  if (!normalizedValue) {
    return '';
  }

  const pathSegments = normalizedValue.split('/').filter(Boolean);
  return pathSegments[pathSegments.length - 1] ?? '';
}

function getFirestoreIndexErrorDetails(error: string | null) {
  if (!error || !error.toLowerCase().includes('requires an index')) {
    return null;
  }

  const match = error.match(/https:\/\/console\.firebase\.google\.com\/\S+/);

  return {
    title: 'Firestore Index erforderlich',
    message: match
      ? 'Fuer diese Abfrage wird ein Firestore-Index benoetigt.'
      : 'Firestore Index erforderlich. Bitte im Firebase Console Index erstellen.',
    indexUrl: match?.[0] ?? null,
  };
}

export default function RequestCalendarAccessScreen() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const params = useLocalSearchParams<{ calendarSlug?: string | string[] }>();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const initialCalendarSlug =
    typeof params.calendarSlug === 'string'
      ? params.calendarSlug
      : Array.isArray(params.calendarSlug)
        ? params.calendarSlug[0] ?? ''
        : '';
  const {
    records: pendingRequests,
    loading: pendingRequestsLoading,
    error: pendingRequestsError,
  } = usePendingCalendarAccessRequests(user?.uid ?? null);
  const [calendarLinkInput, setCalendarLinkInput] = useState(initialCalendarSlug);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingRequestKey, setCancellingRequestKey] = useState<string | null>(null);
  const pendingRequestsIndexError = getFirestoreIndexErrorDetails(pendingRequestsError);

  const handleRequestAccess = async () => {
    if (!user?.email || !user.uid) {
      setMessage(t('requestAccess.loginRequired'));
      return;
    }

    const trimmedCalendarLink = calendarLinkInput.trim();

    if (!trimmedCalendarLink) {
      setMessage(t('requestAccess.emailRequired'));
      return;
    }

    const calendarSlug = extractCalendarSlug(trimmedCalendarLink);

    if (!calendarSlug) {
      setMessage(t('requestAccess.invalidSlug'));
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await requestCalendarAccessBySlug({
        slug: calendarSlug,
        requesterUid: user.uid,
        requesterEmail: user.email,
      });
      setMessage(t('requestAccess.success'));
      setCalendarLinkInput('');
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('requestAccess.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (calendarId: string, requesterUid: string) => {
    setCancellingRequestKey(`${calendarId}:${requesterUid}`);
    setMessage(null);

    try {
      await cancelCalendarAccessRequest({ calendarId, requesterUid });
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('requestAccess.error'));
    } finally {
      setCancellingRequestKey(null);
    }
  };

  if (loading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title={t('requestAccess.title')} />

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
          {t('requestAccess.ownerEmail')}
        </Text>
        <TextInput
          placeholder={t('requestAccess.placeholder')}
          value={calendarLinkInput}
          onChangeText={(nextValue) => {
            setCalendarLinkInput(nextValue);
            setMessage(null);
          }}
          autoCapitalize="none"
          placeholderTextColor={theme.colors.textSecondary}
          style={[uiStyles.input, { marginBottom: theme.spacing[12] }]}
        />
        <Pressable
          onPress={handleRequestAccess}
          disabled={submitting || !user?.email}
          style={[
            uiStyles.button,
            uiStyles.buttonActive,
            { opacity: submitting ? 0.6 : 1 },
          ]}>
          <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
            {submitting ? t('requestAccess.submitting') : t('requestAccess.submit')}
          </Text>
        </Pressable>
        {message ? <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[12] }]}>{message}</Text> : null}
      </View>

      <Text style={[uiStyles.secondaryText, { marginTop: -theme.spacing[4], marginBottom: theme.spacing[16] }]}>
        {t('requestAccess.hint')}
      </Text>

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[12] }]}>
          Ausstehende Anfragen
        </Text>

        {pendingRequestsLoading ? (
          <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
        ) : pendingRequestsIndexError ? (
          <View style={{ marginTop: theme.spacing[4] }}>
            <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4], fontWeight: '600' }]}>
              {pendingRequestsIndexError.title}
            </Text>
            <Text style={uiStyles.secondaryText}>
              {pendingRequestsIndexError.message}
            </Text>
            {__DEV__ && pendingRequestsIndexError.indexUrl ? (
              <Pressable
                onPress={() => {
                  if (pendingRequestsIndexError.indexUrl) {
                    void Linking.openURL(pendingRequestsIndexError.indexUrl);
                  }
                }}
                style={[uiStyles.outlineAction, { marginTop: theme.spacing[12], alignSelf: 'flex-start' }]}>
                <Text style={uiStyles.buttonText}>Index in Firebase oeffnen</Text>
              </Pressable>
            ) : null}
          </View>
        ) : pendingRequests.length ? (
          pendingRequests.map(({ request, calendar }) => {
            const requestKey = `${request.calendarId}:${request.requesterUid}`;
            const ownerLabel = calendar?.ownerUsername || calendar?.ownerEmail || request.calendarId;
            const calendarReference =
              calendar?.publicSlug || calendar?.calendarSlug
                ? `slotlyme.app/calendar/${calendar?.publicSlug || calendar?.calendarSlug}`
                : calendar?.title || 'Mein Kalender';

            return (
              <View key={requestKey} style={uiStyles.listItem}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: theme.spacing[12],
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>
                      {ownerLabel}
                    </Text>
                    <Text style={uiStyles.secondaryText}>{calendarReference}</Text>
                  </View>

                  <Pressable
                    onPress={() => void handleCancelRequest(request.calendarId, request.requesterUid)}
                    disabled={cancellingRequestKey === requestKey}
                    accessibilityRole="button"
                    accessibilityLabel="Anfrage zurÃ¼ckziehen"
                    style={{ opacity: cancellingRequestKey === requestKey ? 0.45 : 1 }}>
                    <Feather name="trash-2" size={18} color={theme.colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={uiStyles.secondaryText}>Keine offenen Anfragen</Text>
        )}

        {pendingRequestsError && !pendingRequestsIndexError ? (
          <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>
            {pendingRequestsError}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
