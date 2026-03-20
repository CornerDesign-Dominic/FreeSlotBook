import { useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { requestCalendarAccessByOwnerEmail } from '../src/features/mvp/repository';
import { useAuth } from '../src/firebase/useAuth';
import { useTranslation } from '../src/i18n/provider';
import { theme, uiStyles } from '../src/theme/ui';

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
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.content}>
      <Text style={uiStyles.pageTitle}>{t('requestAccess.title')}</Text>

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
          {t('requestAccess.ownerEmail')}
        </Text>
        <TextInput
          placeholder={t('requestAccess.placeholder')}
          value={ownerEmailInput}
          onChangeText={setOwnerEmailInput}
          autoCapitalize="none"
          keyboardType="email-address"
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

      <View style={uiStyles.footerRow}>
        <Link href="/(tabs)">
          <Text style={uiStyles.linkText}>
            {t('nav.backToDashboard')}
          </Text>
        </Link>
      </View>
    </ScrollView>
  );
}
