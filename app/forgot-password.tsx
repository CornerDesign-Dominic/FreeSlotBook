import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FirebaseError } from 'firebase/app';

import { sendResetPassword } from '../src/firebase/auth';
import { theme } from '../src/theme/ui';
import { authUiStyles } from '../src/theme/auth-ui';
import { useTranslation } from '@/src/i18n/provider';

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getResetErrorMessage = (error: unknown) => {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/invalid-email':
          return t('forgot.validationEmailInvalid');
        case 'auth/user-not-found':
          return t('forgot.errorUserNotFound');
        default:
          return t('forgot.errorGeneric');
      }
    }

    return t('forgot.errorGeneric');
  };

  const handleReset = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage(t('forgot.validationEmailRequired'));
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setMessage(t('forgot.validationEmailInvalid'));
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      await sendResetPassword(trimmedEmail);
      setMessage(t('forgot.success'));
    } catch (error) {
      setMessage(getResetErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={authUiStyles.keyboardShell}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={authUiStyles.scroll}
        contentContainerStyle={authUiStyles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={authUiStyles.formWrap}>
          <View style={authUiStyles.card}>
            <View style={authUiStyles.header}>
              <Text style={authUiStyles.title}>{t('forgot.title')}</Text>
            </View>

            <View style={authUiStyles.fieldGroup}>
              <Text style={authUiStyles.label}>{t('forgot.emailPlaceholder')}</Text>
              <TextInput
                placeholder={t('forgot.emailPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={authUiStyles.input}
              />
            </View>

            <Pressable
              onPress={handleReset}
              disabled={submitting}
              style={[
                authUiStyles.primaryButton,
                submitting ? authUiStyles.primaryButtonDisabled : null,
              ]}>
              <Text style={authUiStyles.primaryButtonText}>
                {submitting ? t('forgot.submitting') : t('forgot.submit')}
              </Text>
            </Pressable>

            {message ? (
              <View style={authUiStyles.messageBox}>
                <Text style={authUiStyles.messageText}>{message}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
