import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  approveCalendarAccessRequest,
  rejectCalendarAccessRequest,
  removeCalendarAccess,
  upsertCalendarAccess,
} from '../../../src/features/mvp/repository';
import { AppScreenHeader } from '../../../src/components/app-screen-header';
import { useCalendarAccessList } from '../../../src/features/mvp/useCalendarAccessList';
import { useCalendarAccessRequests } from '../../../src/features/mvp/useCalendarAccessRequests';
import { useOwnerCalendar } from '../../../src/features/mvp/useOwnerCalendar';
import { useAuth } from '../../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '../../../src/theme/ui';

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
  const [phoneInput, setPhoneInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);
  const [connectionMethod, setConnectionMethod] = useState<'email' | 'link'>('email');
  const [sharedPeopleExpanded, setSharedPeopleExpanded] = useState(true);
  const [requestsExpanded, setRequestsExpanded] = useState(true);
  const [copyFeedbackVisible, setCopyFeedbackVisible] = useState(false);

  const pendingRequests = requestRecords.filter((record) => record.status === 'pending');
  const publicSlug = calendar?.publicSlug ?? null;
  const publicCalendarUrl = publicSlug ? `https://slotlyme.app/${publicSlug}` : null;

  useEffect(() => {
    if (!copyFeedbackVisible) {
      return;
    }

    const timeout = setTimeout(() => {
      setCopyFeedbackVisible(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [copyFeedbackVisible]);

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
        phoneNumber: phoneInput,
        status: 'approved',
      });
      setEmailInput('');
      setPhoneInput('');
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

  const handleCopyPublicLink = async () => {
    if (!publicCalendarUrl) {
      return;
    }

    await Clipboard.setStringAsync(publicCalendarUrl);
    setCopyFeedbackVisible(true);
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
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>{t('access.newGrant')}</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing[8], marginBottom: theme.spacing[12] }}>
          <Pressable
            onPress={() => setConnectionMethod('email')}
            style={[
              uiStyles.button,
              connectionMethod === 'email' ? uiStyles.buttonActive : null,
              { flex: 1 },
            ]}>
            <Text style={uiStyles.buttonText}>E-Mail</Text>
          </Pressable>
          <Pressable
            onPress={() => setConnectionMethod('link')}
            style={[
              uiStyles.button,
              connectionMethod === 'link' ? uiStyles.buttonActive : null,
              { flex: 1 },
            ]}>
            <Text style={uiStyles.buttonText}>Link</Text>
          </Pressable>
        </View>

        {connectionMethod === 'email' ? (
          <>
            <TextInput
              placeholder={t('access.placeholder')}
              value={emailInput}
              onChangeText={setEmailInput}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={theme.colors.textSecondary}
              style={[uiStyles.input, { marginBottom: theme.spacing[12] }]}
            />
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>{t('access.phoneOptional')}</Text>
            <TextInput
              placeholder={t('access.phonePlaceholder')}
              value={phoneInput}
              onChangeText={setPhoneInput}
              keyboardType="phone-pad"
              placeholderTextColor={theme.colors.textSecondary}
              style={[uiStyles.input, { marginBottom: theme.spacing[12] }]}
            />
            <Pressable
              onPress={handleGrantAccess}
              disabled={submitting || !calendar}
              style={[uiStyles.outlineAction, { opacity: submitting ? 0.6 : 1 }]}>
              <Text style={uiStyles.buttonText}>
                {submitting ? t('access.adding') : t('access.add')}
              </Text>
            </Pressable>
          </>
        ) : (
          <View>
            <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>Link teilen</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.spacing[12],
              }}>
              <Text style={[uiStyles.secondaryText, { flex: 1 }]}>
                {publicSlug ?? '-'}
              </Text>
              <Pressable
                onPress={() => void handleCopyPublicLink()}
                disabled={!publicCalendarUrl}
                accessibilityRole="button"
                accessibilityLabel="Link kopieren"
                style={{ opacity: publicCalendarUrl ? 1 : 0.45 }}>
                <Feather
                  name={copyFeedbackVisible ? 'check' : 'copy'}
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>
        )}
        {message ? <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[12] }]}>{message}</Text> : null}
        {error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text> : null}
        {accessError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{accessError}</Text> : null}
        {requestsError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{requestsError}</Text> : null}
      </View>

      <View style={uiStyles.panel}>
        <Pressable
          onPress={() => setSharedPeopleExpanded((currentValue) => !currentValue)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={uiStyles.sectionTitle}>{`Freigegebene Personen (${accessRecords.length})`}</Text>
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
                <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>{record.granteeEmail}</Text>
                {record.phoneNumber ? (
                  <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[4] }]}>
                    {t('common.phone')}: {record.phoneNumber}
                  </Text>
                ) : null}
                <Text style={uiStyles.secondaryText}>
                  {t('common.status')}: {record.status === 'approved' ? t('access.statusApproved') : t('access.statusRevoked')}
                </Text>
                <Pressable
                  onPress={() => handleRemoveAccess(record.granteeEmail)}
                  disabled={processingEmail === record.granteeEmail}
                  style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                  <Text style={uiStyles.linkText}>
                    {processingEmail === record.granteeEmail ? t('access.removing') : t('access.remove')}
                  </Text>
                </Pressable>
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
