import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { useTranslation } from '@/src/i18n/provider';
import { useAuth } from '@/src/firebase/useAuth';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';
import {
  approveCalendarAccessRequest,
  rejectCalendarAccessRequest,
  removeCalendarAccess,
  upsertCalendarAccess,
} from '@/src/features/mvp/repository';
import { useCalendarAccessList } from '@/src/features/mvp/useCalendarAccessList';
import { useCalendarAccessRequests } from '@/src/features/mvp/useCalendarAccessRequests';
import { useOwnerCalendar } from '@/src/features/mvp/useOwnerCalendar';

export default function CalendarAccessScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { records: accessRecords, loading: accessLoading, error: accessError } =
    useCalendarAccessList(calendar?.id ?? null);
  const { records: requestRecords, loading: requestsLoading, error: requestsError } =
    useCalendarAccessRequests(calendar?.id ?? null);
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);
  const [sharedPeopleExpanded, setSharedPeopleExpanded] = useState(true);
  const [requestsExpanded, setRequestsExpanded] = useState(true);

  const pendingRequests = requestRecords.filter((record) => record.status === 'pending');

  const formatRequestStatus = (status: 'pending' | 'approved' | 'rejected') => {
    if (status === 'approved') {
      return t('access.statusApproved');
    }

    if (status === 'rejected') {
      return t('access.statusRejected');
    }

    return t('access.statusOpen');
  };

  const handleGrantAccess = async () => {
    if (!calendar || !user) {
      setMessage(t('access.noCalendar'));
      return;
    }

    const trimmedEmail = emailInput.trim();

    if (!trimmedEmail) {
      setMessage(t('access.emailRequired'));
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await upsertCalendarAccess({
        calendarId: calendar.id,
        ownerId: user.uid,
        granteeEmail: trimmedEmail,
        status: 'approved',
      });
      setEmailInput('');
      setMessage(t('access.saved'));
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('access.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRequest = async (requesterEmail: string) => {
    if (!calendar || !user) {
      return;
    }

    setProcessingEmail(requesterEmail);
    setMessage(null);

    try {
      await approveCalendarAccessRequest({
        calendarId: calendar.id,
        ownerId: user.uid,
        requesterEmail,
      });
      setMessage(t('access.approvedMessage', { email: requesterEmail }));
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('access.approveError'));
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleRejectRequest = async (requesterEmail: string) => {
    if (!calendar) {
      return;
    }

    setProcessingEmail(requesterEmail);
    setMessage(null);

    try {
      await rejectCalendarAccessRequest({
        calendarId: calendar.id,
        requesterEmail,
      });
      setMessage(t('access.rejectedMessage', { email: requesterEmail }));
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('access.rejectError'));
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleRemoveAccess = async (granteeEmail: string) => {
    if (!calendar) {
      return;
    }

    setProcessingEmail(granteeEmail);
    setMessage(null);

    try {
      await removeCalendarAccess({
        calendarId: calendar.id,
        granteeEmail,
      });
      setMessage(t('access.removedMessage', { email: granteeEmail }));
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('access.removeError'));
    } finally {
      setProcessingEmail(null);
    }
  };

  const confirmRemoveAccess = (granteeEmail: string) => {
    Alert.alert(
      'Freigabe aufheben?',
      'Der Nutzer verliert sofort den Zugriff auf diesen Kalender.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Freigabe aufheben',
          style: 'destructive',
          onPress: () => {
            void handleRemoveAccess(granteeEmail);
          },
        },
      ]
    );
  };

  if (authLoading || loading || accessLoading || requestsLoading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title={t('access.title')} />

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>Neue Freigabe</Text>
        <TextInput
          placeholder={t('access.placeholder')}
          value={emailInput}
          onChangeText={setEmailInput}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={theme.colors.textSecondary}
          style={[uiStyles.input, { marginBottom: theme.spacing[12] }]}
        />
        <Pressable
          onPress={handleGrantAccess}
          disabled={submitting || !calendar}
          style={[
            uiStyles.button,
            uiStyles.buttonActive,
            { opacity: submitting ? 0.6 : 1 },
          ]}>
          <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
            {submitting ? t('access.adding') : 'Nutzer freigeben'}
          </Text>
        </Pressable>
        {message ? <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[12] }]}>{message}</Text> : null}
        {error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text> : null}
        {accessError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{accessError}</Text> : null}
        {requestsError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{requestsError}</Text> : null}
      </View>

      <View style={uiStyles.panel}>
        <Pressable
          onPress={() => setSharedPeopleExpanded((currentValue) => !currentValue)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={uiStyles.sectionTitle}>{`Freigabeliste (${accessRecords.length})`}</Text>
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
                  <Text style={[uiStyles.bodyText, { flex: 1 }]}>{record.granteeEmail}</Text>
                  <Pressable
                    onPress={() => confirmRemoveAccess(record.granteeEmail)}
                    disabled={processingEmail === record.granteeEmail}
                    accessibilityRole="button"
                    accessibilityLabel="Freigabe aufheben"
                    style={{ opacity: processingEmail === record.granteeEmail ? 0.45 : 1 }}>
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
          onPress={() => setRequestsExpanded((currentValue) => !currentValue)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={uiStyles.sectionTitle}>{`Eingehende Anfragen (${pendingRequests.length})`}</Text>
          <Feather
            name={requestsExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        {requestsExpanded ? (
          pendingRequests.length ? (
            pendingRequests.map((record) => (
              <View key={record.id} style={uiStyles.listItem}>
                <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>{record.requesterEmail}</Text>
                <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
                  {t('common.status')}: {formatRequestStatus(record.status)}
                </Text>
                <View style={{ flexDirection: 'row' }}>
                  <Pressable
                    onPress={() => handleApproveRequest(record.requesterEmail)}
                    disabled={processingEmail === record.requesterEmail}
                    style={{ marginRight: 16 }}>
                    <Text style={uiStyles.linkText}>
                      {t('access.approve')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleRejectRequest(record.requesterEmail)}
                    disabled={processingEmail === record.requesterEmail}>
                    <Text style={uiStyles.linkText}>
                      {t('access.reject')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <Text style={uiStyles.secondaryText}>{t('access.requestsEmpty')}</Text>
          )
        ) : null}
      </View>
    </ScrollView>
  );
}
