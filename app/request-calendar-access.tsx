import { useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { requestCalendarAccessByOwnerEmail } from '../src/features/mvp/repository';
import { useAuth } from '../src/firebase/useAuth';
import { useTranslation } from '../src/i18n/provider';

export default function RequestCalendarAccessScreen() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [ownerEmailInput, setOwnerEmailInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestAccess = async () => {
    if (!user?.email) {
      setMessage(t('requestAccess.loginRequired'));
      return;
    }

    const trimmedOwnerEmail = ownerEmailInput.trim();

    if (!trimmedOwnerEmail) {
      setMessage(t('requestAccess.emailRequired'));
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const calendar = await requestCalendarAccessByOwnerEmail({
        ownerEmail: trimmedOwnerEmail,
        requesterEmail: user.email,
      });
      setMessage(
        t('requestAccess.success', { email: calendar.ownerEmail || trimmedOwnerEmail })
      );
      setOwnerEmailInput('');
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('requestAccess.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>{t('requestAccess.title')}</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', marginBottom: 8 }}>
          {t('requestAccess.ownerEmail')}
        </Text>
        <TextInput
          placeholder={t('requestAccess.placeholder')}
          value={ownerEmailInput}
          onChangeText={setOwnerEmailInput}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 12 }}
        />
        <Pressable
          onPress={handleRequestAccess}
          disabled={submitting || !user?.email}
          style={{ borderWidth: 1, borderColor: 'black', paddingVertical: 12, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}>
          <Text style={{ color: 'black' }}>
            {submitting ? t('requestAccess.submitting') : t('requestAccess.submit')}
          </Text>
        </Pressable>

        <Text style={{ color: 'black', marginTop: 12 }}>{t('requestAccess.hint')}</Text>
        {message ? <Text style={{ color: 'black', marginTop: 12 }}>{message}</Text> : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link href="/(tabs)">
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {t('nav.backToDashboard')}
          </Text>
        </Link>
      </View>
    </ScrollView>
  );
}
