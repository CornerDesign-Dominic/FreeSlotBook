import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { useTranslation } from '@/src/i18n/provider';
import { useAuth } from '@/src/firebase/useAuth';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';
import {
  approveCalendarAccessRequest,
  createCalendarInvite,
  rejectCalendarAccessRequest,
  removeCalendarAccess,
} from '@/src/domain/repository';
import { useCalendarAccessList } from '@/src/domain/useCalendarAccessList';
import { useCalendar } from '@/src/domain/useCalendar';
import { useCalendarInvites } from '@/src/domain/useCalendarInvites';
import { useCalendarAccessRequests } from '@/src/domain/useCalendarAccessRequests';
import { useOwnerCalendar } from '@/src/domain/useOwnerCalendar';
import { useOwnerProfile } from '@/src/domain/useOwnerProfile';
import { canAddWhitelistEntry } from '@/src/domain/subscription-policy';
import type { AccessRequestStatus } from '@/src/domain/types';

export default function CalendarAccessScreen() {
  const { user, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ calendarId?: string | string[] }>();
  const { t } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const selectedCalendarId = Array.isArray(params.calendarId) ? params.calendarId[0] ?? null : params.calendarId ?? null;
  const ownerCalendarState = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const selectedCalendarState = useCalendar(selectedCalendarId);
  const calendar = selectedCalendarId ? selectedCalendarState.calendar : ownerCalendarState.calendar;
  const loading = selectedCalendarId ? selectedCalendarState.loading : ownerCalendarState.loading;
  const error = selectedCalendarId ? selectedCalendarState.error : ownerCalendarState.error;
  const { profile } = useOwnerProfile(user ? { uid: user.uid, email: user.email } : null);
  const { records: accessRecords, loading: accessLoading, error: accessError } =
    useCalendarAccessList(calendar?.id ?? null);
  const { records: inviteRecords, loading: invitesLoading, error: invitesError } =
    useCalendarInvites(calendar?.id ?? null);
  const { records: requestRecords, loading: requestsLoading, error: requestsError } =
    useCalendarAccessRequests(calendar?.id ?? null);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [processingRequestUid, setProcessingRequestUid] = useState<string | null>(null);
  const [processingMemberUid, setProcessingMemberUid] = useState<string | null>(null);
  const [sharedPeopleExpanded, setSharedPeopleExpanded] = useState(true);
  const [invitesExpanded, setInvitesExpanded] = useState(true);
  const [requestsExpanded, setRequestsExpanded] = useState(true);
  const [pendingRemoval, setPendingRemoval] = useState<{
    memberUid: string;
    email: string;
    username: string | null;
  } | null>(null);

  const accessUids = new Set(accessRecords.map((record) => record.uid));
  const pendingInvites = inviteRecords.filter(
    (record) => record.status === 'pending' && !accessUids.has(record.invitedUid)
  );
  const pendingRequests = requestRecords.filter(
    (record) =>
      record.status === 'pending' &&
      record.requesterUid !== user?.uid &&
      !accessUids.has(record.requesterUid)
  );
  const whitelistUsageCount = accessRecords.filter((record) => record.role === 'member').length + pendingInvites.length;
  const whitelistPermission = canAddWhitelistEntry({
    tier: profile?.subscriptionTier ?? 'free',
    currentWhitelistCount: whitelistUsageCount,
  });

  const formatRequestStatus = (status: AccessRequestStatus) => {
    if (status === 'approved') {
      return t('access.statusApproved');
    }

    if (status === 'rejected') {
      return t('access.statusRejected');
    }

    return t('access.statusOpen');
  };
  const getIdentityLabel = (username: string | null, email: string) => username || email;

  const handleCreateInvite = async () => {
    if (!calendar || !user) {
      setMessage(t('access.noCalendar'));
      return;
    }

    const trimmedIdentifier = inviteIdentifier.trim();

    if (!trimmedIdentifier) {
      setMessage(t('invite.identifierRequired'));
      return;
    }

    setSubmittingInvite(true);
    setMessage(null);

    try {
      await createCalendarInvite({
        calendarId: calendar.id,
        ownerUid: user.uid,
        inviteeIdentifier: trimmedIdentifier,
      });
      setInviteIdentifier('');
      setMessage(t('invite.created'));
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('invite.createError'));
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleApproveRequest = async (
    requesterUid: string,
    requesterEmail: string,
    requesterUsername: string | null
  ) => {
    if (!calendar || !user) {
      return;
    }

    setProcessingRequestUid(requesterUid);
    setMessage(null);

    try {
      await approveCalendarAccessRequest({
        calendarId: calendar.id,
        ownerId: user.uid,
        requesterUid,
      });
      setMessage(
        t('access.approvedMessage', {
          email: getIdentityLabel(requesterUsername, requesterEmail),
        })
      );
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('access.approveError'));
    } finally {
      setProcessingRequestUid(null);
    }
  };

  const handleRejectRequest = async (
    requesterUid: string,
    requesterEmail: string,
    requesterUsername: string | null
  ) => {
    if (!calendar) {
      return;
    }

    setProcessingRequestUid(requesterUid);
    setMessage(null);

    try {
      await rejectCalendarAccessRequest({
        calendarId: calendar.id,
        ownerId: user?.uid,
        requesterUid,
      });
      setMessage(
        t('access.rejectedMessage', {
          email: getIdentityLabel(requesterUsername, requesterEmail),
        })
      );
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('access.rejectError'));
    } finally {
      setProcessingRequestUid(null);
    }
  };

  const handleRemoveAccess = async (memberUid: string, granteeEmail: string, granteeUsername: string | null) => {
    if (!calendar) {
      return;
    }

    setProcessingMemberUid(memberUid);
    setMessage(null);

    try {
      await removeCalendarAccess({
        calendarId: calendar.id,
        memberUid,
      });
      setMessage(
        t('access.removedMessage', {
          email: getIdentityLabel(granteeUsername, granteeEmail),
        })
      );
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('access.removeError'));
    } finally {
      setProcessingMemberUid(null);
    }
  };

  const confirmRemoveAccess = (memberUid: string, granteeEmail: string, granteeUsername: string | null) => {
    setPendingRemoval({
      memberUid,
      email: granteeEmail,
      username: granteeUsername,
    });
  };

  if (authLoading || loading || accessLoading || invitesLoading || requestsLoading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Mitglieder" />

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>
          {t('invite.title')}
        </Text>
        <TextInput
          placeholder={t('invite.placeholder')}
          value={inviteIdentifier}
          onChangeText={(nextValue) => {
            setInviteIdentifier(nextValue);
            setMessage(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={theme.colors.textSecondary}
          style={[uiStyles.input, { marginBottom: theme.spacing[12] }]}
        />
        <Pressable
          onPress={() => void handleCreateInvite()}
          disabled={submittingInvite || !calendar || !whitelistPermission.allowed}
          style={[
            uiStyles.button,
            uiStyles.buttonActive,
            { opacity: submittingInvite || !whitelistPermission.allowed ? 0.6 : 1 },
          ]}>
          <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
            {submittingInvite ? t('invite.creating') : t('invite.submit')}
          </Text>
        </Pressable>
        {!whitelistPermission.allowed ? (
          <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>
            {whitelistPermission.reason}
          </Text>
        ) : null}
      </View>

      <View style={uiStyles.panel}>
        <Pressable
          onPress={() => setSharedPeopleExpanded((currentValue) => !currentValue)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={uiStyles.sectionTitle}>{`Mitglieder (${accessRecords.length})`}</Text>
          <Feather
            name={sharedPeopleExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        {sharedPeopleExpanded ? (
          accessRecords.length ? (
            accessRecords.map((record) => (
              <View key={record.id} style={uiStyles.listItem}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: theme.spacing[12],
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>
                      {getIdentityLabel(record.username, record.email)}
                    </Text>
                    {record.username ? (
                      <Text style={uiStyles.secondaryText}>{record.email}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => confirmRemoveAccess(record.uid, record.email, record.username)}
                    disabled={processingMemberUid === record.uid}
                    accessibilityRole="button"
                    accessibilityLabel="Freigabe aufheben"
                    style={{ opacity: processingMemberUid === record.uid ? 0.45 : 1 }}>
                    <Feather name="trash-2" size={18} color={theme.colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <Text style={uiStyles.secondaryText}>{t('access.peopleEmpty')}</Text>
          )
        ) : null}
      </View>

      <View style={uiStyles.panel}>
        <Pressable
          onPress={() => setInvitesExpanded((currentValue) => !currentValue)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={uiStyles.sectionTitle}>{`Eingeladen (${pendingInvites.length})`}</Text>
          <Feather
            name={invitesExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        {invitesExpanded ? (
          <>
            <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[4] }]}>
              Offene Einladungen.
            </Text>
            {pendingInvites.length ? (
              pendingInvites.map((record) => (
              <View key={record.id} style={uiStyles.listItem}>
                <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>
                  {getIdentityLabel(record.invitedUsername, record.invitedEmail)}
                </Text>
                {record.invitedUsername ? (
                  <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[4] }]}>
                    {record.invitedEmail}
                  </Text>
                ) : null}
                <Text style={uiStyles.secondaryText}>{t('invite.statusPending')}</Text>
              </View>
            ))
            ) : null}
          </>
        ) : null}
      </View>

      <View style={uiStyles.panel}>
        <Pressable
          onPress={() => setRequestsExpanded((currentValue) => !currentValue)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={uiStyles.sectionTitle}>{`Anfragen (${pendingRequests.length})`}</Text>
          <Feather
            name={requestsExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        {requestsExpanded ? (
          <>
            <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[4] }]}>
              Offene Anfragen.
            </Text>
            {pendingRequests.length ? (
              pendingRequests.map((record) => (
              <View key={record.id} style={uiStyles.listItem}>
                <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>
                  {getIdentityLabel(record.requesterUsername, record.requesterEmail)}
                </Text>
                {record.requesterUsername ? (
                  <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[4] }]}>
                    {record.requesterEmail}
                  </Text>
                ) : null}
                <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
                  {t('common.status')}: {formatRequestStatus(record.status)}
                </Text>
                <View style={{ flexDirection: 'row' }}>
                  <Pressable
                    onPress={() =>
                      handleApproveRequest(
                        record.requesterUid,
                        record.requesterEmail,
                        record.requesterUsername
                      )
                    }
                    disabled={processingRequestUid === record.requesterUid}
                    style={{ marginRight: 16 }}>
                    <Text style={uiStyles.linkText}>
                      {t('access.approve')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      handleRejectRequest(
                        record.requesterUid,
                        record.requesterEmail,
                        record.requesterUsername
                      )
                    }
                    disabled={processingRequestUid === record.requesterUid}>
                    <Text style={uiStyles.linkText}>
                      {t('access.reject')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
            ) : null}
          </>
        ) : null}
      </View>

      {message ? <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[4] }]}>{message}</Text> : null}
      {error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text> : null}
      {accessError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{accessError}</Text> : null}
      {invitesError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{invitesError}</Text> : null}
      {requestsError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{requestsError}</Text> : null}

      <Modal
        visible={pendingRemoval !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPendingRemoval(null)}>
        <View style={uiStyles.modalBackdrop}>
          <View style={uiStyles.modalSheet}>
            <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>
              Kalendermitglied entfernen ?
            </Text>
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[16] }]}>
              Der Nutzer verliert sofort den Zugriff auf diesen Kalender.
            </Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing[8] }}>
              <Pressable
                onPress={() => setPendingRemoval(null)}
                style={[uiStyles.button, { flex: 1 }]}>
                <Text style={uiStyles.buttonText}>Abbrechen</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!pendingRemoval) {
                    return;
                  }

                  setPendingRemoval(null);
                  void handleRemoveAccess(
                    pendingRemoval.memberUid,
                    pendingRemoval.email,
                    pendingRemoval.username
                  );
                }}
                style={[uiStyles.button, uiStyles.buttonActive, { flex: 1 }]}>
                <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
                  Bestätigen
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
