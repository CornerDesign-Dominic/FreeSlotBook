import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';

import { logout, registerWithEmail, sendVerificationEmail } from '../src/firebase/auth';
import { ensureOwnerAccountSetup } from '../src/features/mvp/repository';
import { useAuth } from '../src/firebase/useAuth';
import { theme } from '../src/theme/ui';
import { authUiStyles } from '../src/theme/auth-ui';
import { useTranslation } from '@/src/i18n/provider';

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
              <Text style={authUiStyles.title}>{t('register.title')}</Text>
            </View>

            <View style={authUiStyles.fieldGroup}>
              <Text style={authUiStyles.label}>{t('register.emailPlaceholder')}</Text>
              <TextInput
                placeholder={t('register.emailPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={authUiStyles.input}
              />
            </View>

            <View style={authUiStyles.fieldGroup}>
              <Text style={authUiStyles.label}>{t('register.passwordPlaceholder')}</Text>
              <TextInput
                placeholder={t('register.passwordPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={authUiStyles.input}
              />
            </View>

            <Pressable
              onPress={handleRegister}
              disabled={submitting}
              style={[
                authUiStyles.primaryButton,
                submitting ? authUiStyles.primaryButtonDisabled : null,
              ]}>
              <Text style={authUiStyles.primaryButtonText}>
                {submitting ? t('register.submitting') : t('register.submit')}
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
