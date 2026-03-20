import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { FirebaseError } from 'firebase/app';

import { sendResetPassword } from '../src/firebase/auth';
import { useTranslation } from '../src/i18n/provider';

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
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>{t('forgot.title')}</Text>

      <TextInput
        placeholder={t('forgot.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 12 }}
      />

      <Button
        title={submitting ? t('forgot.submitting') : t('forgot.submit')}
        onPress={handleReset}
        disabled={submitting}
      />

      {message ? <Text>{message}</Text> : null}
    </View>
  );
}
