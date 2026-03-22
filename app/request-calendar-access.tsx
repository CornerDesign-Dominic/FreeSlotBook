import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { cancelCalendarAccessRequest, requestCalendarAccessBySlug } from '../src/features/mvp/repository';
import { usePendingCalendarAccessRequests } from '../src/features/mvp/usePendingCalendarAccessRequests';
import { useDashboardData } from '../src/features/mvp/useDashboardData';
import { AppScreenHeader } from '../src/components/app-screen-header';
import { useAuth } from '../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '../src/theme/ui';

function extractCalendarSlug(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  if (!trimmedValue.includes('://')) {
    return trimmedValue.replace(/^\/+|\/+$/g, '');
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

    if (!pathSegments.length) {
      return '';
    }

    if (pathSegments[0] === 'c' && pathSegments[1]) {
      return pathSegments[1];
    }

    return pathSegments[pathSegments.length - 1] ?? '';
  } catch {
    return '';
  }
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
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const { data, loading: dashboardLoading, error: dashboardError } = useDashboardData(
    user ? { uid: user.uid, email: user.email } : null
  );
  const {
    records: pendingRequests,
    loading: pendingRequestsLoading,
    error: pendingRequestsError,
  } = usePendingCalendarAccessRequests(user?.uid ?? null);
  const [calendarLinkInput, setCalendarLinkInput] = useState('');
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
        requesterUserId: user.uid,
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

  const handleCancelRequest = async (calendarId: string, requesterEmail: string) => {
    setCancellingRequestKey(`${calendarId}:${requesterEmail}`);
    setMessage(null);

    try {
      await cancelCalendarAccessRequest({ calendarId, requesterEmail });
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('requestAccess.error'));
    } finally {
      setCancellingRequestKey(null);
    }
  };

  if (loading || dashboardLoading) {
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
          onChangeText={setCalendarLinkInput}
          autoCapitalize="none"
          placeholderTextColor={theme.colors.textSecondary}
          style={[uiStyles.input, { marginBottom: theme.spacing[12] }]}
        />
        <Pressable
          onPress={handleRequestAccess}
          disabled={submitting || !user?.email}
          style={[uiStyles.outlineAction, { opacity: submitting ? 0.6 : 1 }]}>
          <Text style={uiStyles.buttonText}>
            {submitting ? t('requestAccess.submitting') : t('requestAccess.submit')}
          </Text>
        </Pressable>

        <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{t('requestAccess.hint')}</Text>
        {message ? <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[12] }]}>{message}</Text> : null}
      </View>

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
                onPress={() => void Linking.openURL(pendingRequestsIndexError.indexUrl)}
                style={[uiStyles.outlineAction, { marginTop: theme.spacing[12], alignSelf: 'flex-start' }]}>
                <Text style={uiStyles.buttonText}>Index in Firebase oeffnen</Text>
              </Pressable>
            ) : null}
          </View>
        ) : pendingRequests.length ? (
          pendingRequests.map(({ request, calendar }) => {
            const requestKey = `${request.calendarId}:${request.requesterEmail}`;
            const calendarLabel =
              request.calendarSlug || calendar?.publicSlug || calendar?.ownerEmail || request.calendarId;

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
                      {calendarLabel}
                    </Text>
                    <Text style={uiStyles.secondaryText}>Anfrage ausstehend</Text>
                  </View>

                  <Pressable
                    onPress={() => void handleCancelRequest(request.calendarId, request.requesterEmail)}
                    disabled={cancellingRequestKey === requestKey}
                    accessibilityRole="button"
                    accessibilityLabel="Anfrage zurückziehen"
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

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[4] }]}>
          {t('dashboard.sharedCalendars')}
        </Text>
        {data.joinedCalendars.length ? (
          data.joinedCalendars.map((calendar) => (
            <Link key={calendar.id} href={`/shared-calendar/${calendar.id}`} asChild>
              <Pressable style={{ marginTop: theme.spacing[12] }}>
                <Text style={uiStyles.linkText}>
                  {calendar.ownerEmail || t('dashboard.noOwnerEmail')}
                </Text>
              </Pressable>
            </Link>
          ))
        ) : (
          <Text style={uiStyles.secondaryText}>{t('dashboard.noJoinedCalendars')}</Text>
        )}
        {dashboardError ? (
          <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>
            {dashboardError}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
