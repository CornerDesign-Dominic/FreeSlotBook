import { useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  approveCalendarAccessRequest,
  rejectCalendarAccessRequest,
  removeCalendarAccess,
  upsertCalendarAccess,
} from '../../src/features/mvp/repository';
import { useCalendarAccessList } from '../../src/features/mvp/useCalendarAccessList';
import { useCalendarAccessRequests } from '../../src/features/mvp/useCalendarAccessRequests';
import { useOwnerCalendar } from '../../src/features/mvp/useOwnerCalendar';
import { useAuth } from '../../src/firebase/useAuth';
import { LanguageSwitcher } from '../../src/i18n/language-switcher';
import { useTranslation } from '../../src/i18n/provider';

export default function CalendarAccessScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
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

  if (authLoading || loading || accessLoading || requestsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <LanguageSwitcher />
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>{t('access.title')}</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', marginBottom: 8 }}>{t('access.newGrant')}</Text>
        <TextInput
          placeholder={t('access.placeholder')}
          value={emailInput}
          onChangeText={setEmailInput}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 12 }}
        />
        <Text style={{ color: 'black', marginBottom: 8 }}>{t('access.phoneOptional')}</Text>
        <TextInput
          placeholder={t('access.phonePlaceholder')}
          value={phoneInput}
          onChangeText={setPhoneInput}
          keyboardType="phone-pad"
          style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 12 }}
        />
        <Pressable
          onPress={handleGrantAccess}
          disabled={submitting || !calendar}
          style={{ borderWidth: 1, borderColor: 'black', paddingVertical: 12, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}>
          <Text style={{ color: 'black' }}>
            {submitting ? t('access.adding') : t('access.add')}
          </Text>
        </Pressable>
        {message ? <Text style={{ color: 'black', marginTop: 12 }}>{message}</Text> : null}
        {error ? <Text style={{ color: 'black', marginTop: 12 }}>{error}</Text> : null}
        {accessError ? <Text style={{ color: 'black', marginTop: 12 }}>{accessError}</Text> : null}
        {requestsError ? <Text style={{ color: 'black', marginTop: 12 }}>{requestsError}</Text> : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>{t('access.people')}</Text>
        {accessRecords.length ? (
          accessRecords.map((record) => (
            <View key={record.id} style={{ borderTopWidth: 1, borderColor: 'black', paddingTop: 12, marginTop: 12 }}>
              <Text style={{ color: 'black', marginBottom: 4 }}>{record.granteeEmail}</Text>
              {record.phoneNumber ? (
                <Text style={{ color: 'black', marginBottom: 4 }}>
                  {t('common.phone')}: {record.phoneNumber}
                </Text>
              ) : null}
              <Text style={{ color: 'black' }}>
                {t('common.status')}: {record.status === 'approved' ? t('access.statusApproved') : t('access.statusRevoked')}
              </Text>
              <Pressable
                onPress={() => handleRemoveAccess(record.granteeEmail)}
                disabled={processingEmail === record.granteeEmail}
                style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                  {processingEmail === record.granteeEmail ? t('access.removing') : t('access.remove')}
                </Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={{ color: 'black' }}>{t('access.peopleEmpty')}</Text>
        )}
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>{t('access.requests')}</Text>
        {pendingRequests.length ? (
          pendingRequests.map((record) => (
            <View key={record.id} style={{ borderTopWidth: 1, borderColor: 'black', paddingTop: 12, marginTop: 12 }}>
              <Text style={{ color: 'black', marginBottom: 4 }}>{record.requesterEmail}</Text>
              <Text style={{ color: 'black', marginBottom: 8 }}>
                {t('common.status')}: {formatRequestStatus(record.status)}
              </Text>
              <View style={{ flexDirection: 'row' }}>
                <Pressable
                  onPress={() => handleApproveRequest(record.requesterEmail)}
                  disabled={processingEmail === record.requesterEmail}
                  style={{ marginRight: 16 }}>
                  <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                    {t('access.approve')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleRejectRequest(record.requesterEmail)}
                  disabled={processingEmail === record.requesterEmail}>
                  <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                    {t('access.reject')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <Text style={{ color: 'black' }}>{t('access.requestsEmpty')}</Text>
        )}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link href="/my-calendar">
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {t('access.backToCalendar')}
          </Text>
        </Link>
      </View>
    </ScrollView>
  );
}
