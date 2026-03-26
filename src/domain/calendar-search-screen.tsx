import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  acceptCalendarInvite,
  cancelCalendarAccessRequest,
  rejectCalendarInvite,
  requestCalendarAccessBySlug,
} from './repository';
import { usePendingCalendarAccessRequests } from './usePendingCalendarAccessRequests';
import { usePendingCalendarInvites } from './usePendingCalendarInvites';
import { AppScreenHeader } from '@/src/components/app-screen-header';
import { useAuth } from '@/src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

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
    title: 'Firestore-Index erforderlich',
    message: match
      ? 'Für diese Abfrage wird ein Firestore-Index benötigt.'
      : 'Firestore-Index erforderlich. Bitte in der Firebase Console anlegen.',
    indexUrl: match?.[0] ?? null,
  };
}

type CalendarSearchScreenProps = {
  initialCalendarSlug?: string;
};

export function CalendarSearchScreen({ initialCalendarSlug = '' }: CalendarSearchScreenProps) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const {
    records: pendingRequests,
    loading: pendingRequestsLoading,
    error: pendingRequestsError,
  } = usePendingCalendarAccessRequests(user?.uid ?? null);
  const {
    records: inviteRecords,
    loading: invitesLoading,
    error: invitesError,
  } = usePendingCalendarInvites(user?.uid ?? null);
  const [calendarLinkInput, setCalendarLinkInput] = useState(initialCalendarSlug);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingRequestKey, setCancellingRequestKey] = useState<string | null>(null);
  const [processingInviteCalendarId, setProcessingInviteCalendarId] = useState<string | null>(null);
  const [expandedInviteKey, setExpandedInviteKey] = useState<string | null>(null);
  const [pendingRequestsExpanded, setPendingRequestsExpanded] = useState(false);
  const [invitesExpanded, setInvitesExpanded] = useState(false);
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

  const handleAcceptInvite = async (calendarId: string) => {
    if (!user?.uid) {
      return;
    }

    setProcessingInviteCalendarId(calendarId);
    setMessage(null);

    try {
      await acceptCalendarInvite({ calendarId, invitedUid: user.uid });
      setMessage(t('invite.accepted'));
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('invite.acceptError'));
    } finally {
      setProcessingInviteCalendarId(null);
    }
  };

  const handleRejectInvite = async (calendarId: string) => {
    if (!user?.uid) {
      return;
    }

    setProcessingInviteCalendarId(calendarId);
    setMessage(null);

    try {
      await rejectCalendarInvite({ calendarId, invitedUid: user.uid });
      setMessage(t('invite.rejected'));
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('invite.rejectError'));
    } finally {
      setProcessingInviteCalendarId(null);
    }
  };

  const confirmRejectInvite = (calendarId: string) => {
    Alert.alert('Bist du dir sicher?', undefined, [
      {
        text: 'Nein',
        style: 'cancel',
      },
      {
        text: 'Ja',
        style: 'destructive',
        onPress: () => {
          void handleRejectInvite(calendarId);
        },
      },
    ]);
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
      <AppScreenHeader title={t('calendarSearch.title')} />

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>
          {t('calendarSearch.searchSection')}
        </Text>
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

      <View style={uiStyles.panel}>
        <Pressable
          onPress={() => {
            setPendingRequestsExpanded((currentValue) => !currentValue);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing[12],
          }}>
          <Text style={[uiStyles.sectionTitle, { marginBottom: 0 }]}>
            {`${t('calendarSearch.pendingRequests')} (${pendingRequests.length})`}
          </Text>
          <Feather
            name={pendingRequestsExpanded ? 'chevron-down' : 'chevron-right'}
            size={18}
            color={theme.colors.textSecondary}
          />
        </Pressable>

        {pendingRequestsExpanded ? (
          <View style={{ marginTop: theme.spacing[12] }}>
            {pendingRequestsLoading ? (
              <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
            ) : pendingRequestsIndexError ? (
              <View style={{ marginTop: theme.spacing[4] }}>
                  <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4], fontWeight: '600' }]}>
                  {t('calendarSearch.indexRequiredTitle')}
                </Text>
                <Text style={uiStyles.secondaryText}>{t('calendarSearch.indexRequiredMessage')}</Text>
                {__DEV__ && pendingRequestsIndexError.indexUrl ? (
                  <Pressable
                    onPress={() => {
                      if (pendingRequestsIndexError.indexUrl) {
                        void Linking.openURL(pendingRequestsIndexError.indexUrl);
                      }
                    }}
                    style={[uiStyles.outlineAction, { marginTop: theme.spacing[12], alignSelf: 'flex-start' }]}>
                    <Text style={uiStyles.buttonText}>{t('calendarSearch.openIndex')}</Text>
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
                        <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>{ownerLabel}</Text>
                        <Text style={uiStyles.secondaryText}>{calendarReference}</Text>
                      </View>

                      <Pressable
                        onPress={() => void handleCancelRequest(request.calendarId, request.requesterUid)}
                        disabled={cancellingRequestKey === requestKey}
                        accessibilityRole="button"
                        accessibilityLabel={t('requestAccess.cancel')}
                        style={{ opacity: cancellingRequestKey === requestKey ? 0.45 : 1 }}>
                        <Feather name="trash-2" size={18} color={theme.colors.textSecondary} />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={uiStyles.secondaryText}>{t('calendarSearch.pendingRequestsEmpty')}</Text>
            )}

            {pendingRequestsError && !pendingRequestsIndexError ? (
              <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>
                {pendingRequestsError}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={uiStyles.panel}>
        <Pressable
          onPress={() => {
            setInvitesExpanded((currentValue) => !currentValue);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing[12],
          }}>
          <Text style={[uiStyles.sectionTitle, { marginBottom: 0 }]}>
            {`${t('calendarSearch.pendingInvites')} (${inviteRecords.length})`}
          </Text>
          <Feather
            name={invitesExpanded ? 'chevron-down' : 'chevron-right'}
            size={18}
            color={theme.colors.textSecondary}
          />
        </Pressable>

        {invitesExpanded ? (
          <View style={{ marginTop: theme.spacing[12] }}>
            {invitesLoading ? (
              <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
            ) : inviteRecords.length ? (
              inviteRecords.map(({ invite, calendar }) => {
                const ownerLabel = calendar?.ownerUsername || calendar?.ownerEmail || invite.calendarId;
                const inviteKey = `${invite.calendarId}:${invite.invitedUid}`;
                const inviteSlug = calendar?.publicSlug || calendar?.calendarSlug;
                const calendarLabel = inviteSlug ? `/calendar/${inviteSlug}` : calendar?.title || invite.calendarId;
                const isProcessing = processingInviteCalendarId === invite.calendarId;
                const isExpanded = expandedInviteKey === inviteKey;

                return (
                  <Pressable
                    key={inviteKey}
                    onPress={() => {
                      setExpandedInviteKey((currentValue) => (currentValue === inviteKey ? null : inviteKey));
                    }}
                    style={uiStyles.listItem}>
                    <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>{calendarLabel}</Text>
                    <Text style={uiStyles.secondaryText}>{ownerLabel}</Text>
                    {isExpanded ? (
                      <View style={{ flexDirection: 'row', gap: theme.spacing[12], marginTop: theme.spacing[12] }}>
                        <Pressable
                          onPress={() => confirmRejectInvite(invite.calendarId)}
                          disabled={isProcessing}
                          style={[uiStyles.button, { flex: 1, opacity: isProcessing ? 0.6 : 1 }]}>
                          <Text style={uiStyles.buttonText}>ablehnen</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleAcceptInvite(invite.calendarId)}
                          disabled={isProcessing}
                          style={[uiStyles.button, uiStyles.buttonActive, { flex: 1, opacity: isProcessing ? 0.6 : 1 }]}>
                          <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>annehmen</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })
            ) : (
              <Text style={uiStyles.secondaryText}>{t('calendarSearch.pendingInvitesEmpty')}</Text>
            )}

            {invitesError ? (
              <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{invitesError}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
