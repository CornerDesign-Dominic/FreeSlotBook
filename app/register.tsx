import { useEffect, useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';

import { logout, registerWithEmail, sendVerificationEmail } from '../src/firebase/auth';
import { ensureOwnerAccountSetup } from '../src/features/mvp/repository';
import { useAuth } from '../src/firebase/useAuth';
import { useTranslation } from '../src/i18n/provider';

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

export default function RegisterScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  useEffect(() => {
    if (!loading && user && user.emailVerified && !awaitingVerification) {
      router.replace('/(tabs)');
    }
  }, [awaitingVerification, loading, router, user]);

  const getRegisterErrorMessage = (error: unknown) => {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return t('register.errorEmailInUse');
        case 'auth/invalid-email':
          return t('register.validationEmailInvalid');
        case 'auth/weak-password':
          return t('register.validationPasswordWeak');
        default:
          return t('register.errorGeneric');
      }
    }

    return t('register.errorGeneric');
  };

  const handleRegister = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage(t('register.validationEmailRequired'));
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setMessage(t('register.validationEmailInvalid'));
      return;
    }

    if (!password) {
      setMessage(t('register.validationPasswordRequired'));
      return;
    }

    if (password.length < 6) {
      setMessage(t('register.validationPasswordWeak'));
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const credential = await registerWithEmail(trimmedEmail, password);
      await sendVerificationEmail(credential.user);
      await ensureOwnerAccountSetup({
        uid: credential.user.uid,
        email: credential.user.email ?? trimmedEmail,
      });
      await logout();
      setAwaitingVerification(true);
      setMessage(t('register.messageVerification'));
    } catch (error) {
      setMessage(getRegisterErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>{t('register.title')}</Text>

      <TextInput
        placeholder={t('register.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 12 }}
      />

      <TextInput
        placeholder={t('register.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 12 }}
      />

      <Button
        title={submitting ? t('register.submitting') : t('register.submit')}
        onPress={handleRegister}
        disabled={submitting}
      />

      {message ? <Text>{message}</Text> : null}
    </View>
  );
}
