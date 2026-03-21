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
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { FirebaseError } from 'firebase/app';

import { loginWithEmail, logout, sendVerificationEmail } from '../src/firebase/auth';
import { theme, useBottomSafeContentStyle } from '../src/theme/ui';
import { authUiStyles } from '../src/theme/auth-ui';
import { useAuth } from '../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

function getSafeRedirectTarget(value: string | string[] | undefined): Href | null {
  const redirect = Array.isArray(value) ? value[0] : value;

  if (!redirect) {
    return null;
  }

  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    return null;
  }

  return redirect as Href;
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string | string[] }>();
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const contentContainerStyle = useBottomSafeContentStyle(authUiStyles.scrollContent);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [canResendVerification, setCanResendVerification] = useState(false);
  const redirectTarget = getSafeRedirectTarget(params.redirect);

  useEffect(() => {
    if (!loading && user && user.emailVerified) {
      router.replace(redirectTarget ?? '/(tabs)');
    }
  }, [loading, redirectTarget, router, user]);

  const getLoginErrorMessage = (error: unknown) => {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/invalid-email':
          return t('login.validationEmailInvalid');
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          return t('login.errorInvalidCredentials');
        case 'auth/user-not-found':
          return t('login.errorUserNotFound');
        default:
          return t('login.errorGeneric');
      }
    }

    return t('login.errorGeneric');
  };

  const getVerificationEmailErrorMessage = (error: unknown) => {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/too-many-requests':
          return t('login.errorTooManyRequests');
        case 'auth/network-request-failed':
          return t('login.errorNetwork');
        case 'auth/user-token-expired':
        case 'auth/requires-recent-login':
          return t('login.errorRelogin');
        default:
          return t('login.errorResendGeneric');
      }
    }

    return t('login.errorResendGeneric');
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage(t('login.validationEmailRequired'));
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setMessage(t('login.validationEmailInvalid'));
      return;
    }

    if (!password) {
      setMessage(t('login.validationPasswordRequired'));
      return;
    }

    setSubmitting(true);
    setMessage('');
    setCanResendVerification(false);

    try {
      const credential = await loginWithEmail(trimmedEmail, password);

      if (!credential.user.emailVerified) {
        await logout();
        setCanResendVerification(true);
        setMessage(t('login.messageUnverified'));
        return;
      }

      router.replace(redirectTarget ?? '/(tabs)');
    } catch (error) {
      setMessage(getLoginErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setMessage(t('login.messageResendNeedsCredentials'));
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const credential = await loginWithEmail(trimmedEmail, password);
      await sendVerificationEmail(credential.user);
      await logout();
      setMessage(t('login.messageResendSuccess'));
    } catch (error) {
      setMessage(getVerificationEmailErrorMessage(error));
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
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled">
        <View style={authUiStyles.formWrap}>
          <View style={authUiStyles.card}>
            <View style={authUiStyles.header}>
              <Text style={authUiStyles.title}>{t('login.title')}</Text>
            </View>

            <View style={authUiStyles.fieldGroup}>
              <Text style={authUiStyles.label}>{t('login.emailPlaceholder')}</Text>
              <TextInput
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={authUiStyles.input}
              />
            </View>

            <View style={authUiStyles.fieldGroup}>
              <Text style={authUiStyles.label}>{t('login.passwordPlaceholder')}</Text>
              <TextInput
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={authUiStyles.input}
              />
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={submitting}
              style={[
                authUiStyles.primaryButton,
                submitting ? authUiStyles.primaryButtonDisabled : null,
              ]}>
              <Text style={authUiStyles.primaryButtonText}>
                {submitting ? t('login.submitting') : t('login.submit')}
              </Text>
            </Pressable>

            <View style={authUiStyles.secondaryActionGroup}>
              <Link href="/forgot-password" asChild>
                <Pressable>
                  <Text style={authUiStyles.linkText}>{t('login.forgotPassword')}</Text>
                </Pressable>
              </Link>

              {message ? (
                <View style={authUiStyles.messageBox}>
                  <Text style={authUiStyles.messageText}>{message}</Text>
                </View>
              ) : null}

              {canResendVerification ? (
                <Pressable
                  onPress={handleResendVerification}
                  disabled={submitting}
                  style={[
                    authUiStyles.primaryButton,
                    submitting ? authUiStyles.primaryButtonDisabled : null,
                  ]}>
                  <Text style={authUiStyles.primaryButtonText}>
                    {submitting ? t('login.resending') : t('login.resend')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
