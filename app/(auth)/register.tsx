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

import { logout, registerWithEmail, sendVerificationEmail } from '../../src/firebase/auth';
import {
  ensureOwnerAccountSetup,
  isSlotlymeUserIdAvailable,
} from '../../src/domain/repository';
import { useSlotlymeIdAvailability } from '../../src/domain/useSlotlymeIdAvailability';
import { useAuthUiStyles } from '../../src/theme/auth-ui';
import { useAppTheme, useBottomSafeContentStyle } from '../../src/theme/ui';
import { useTranslation } from '@/src/i18n/provider';

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

function sanitizeSlotlymeIdInput(value: string) {
  return value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');
}

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const authUiStyles = useAuthUiStyles();
  const contentContainerStyle = useBottomSafeContentStyle(authUiStyles.scrollContent);
  const [email, setEmail] = useState('');
  const [slotlymeId, setSlotlymeId] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const slotlymeIdAvailability = useSlotlymeIdAvailability(slotlymeId);

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

    if (error instanceof Error && error.message) {
      return error.message;
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

    if (!slotlymeIdAvailability.normalizedValue) {
      setMessage(t('register.validationSlotlymeIdRequired'));
      return;
    }

    if (slotlymeIdAvailability.formatError) {
      setMessage(slotlymeIdAvailability.formatError);
      return;
    }

    if (slotlymeIdAvailability.isChecking) {
      setMessage(t('register.validationSlotlymeIdChecking'));
      return;
    }

    if (!slotlymeIdAvailability.isAvailable) {
      setMessage(t('register.validationSlotlymeIdTaken'));
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

      try {
        const isStillAvailable = await isSlotlymeUserIdAvailable(
          slotlymeIdAvailability.normalizedValue
        );

        if (!isStillAvailable) {
          throw new Error(t('register.validationSlotlymeIdTaken'));
        }

        await ensureOwnerAccountSetup({
          uid: credential.user.uid,
          email: credential.user.email ?? trimmedEmail,
          slotlymeId: slotlymeIdAvailability.normalizedValue,
        });
      } catch (profileError) {
        try {
          await credential.user.delete();
        } catch {
          // Best effort cleanup to avoid half-created accounts.
        }

        throw profileError;
      }

      await sendVerificationEmail(credential.user);
      await logout();
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
        contentContainerStyle={contentContainerStyle}
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
              <Text style={authUiStyles.label}>Slotlyme ID</Text>
              <TextInput
                placeholder="deine-id"
                placeholderTextColor={theme.colors.textSecondary}
                value={slotlymeId}
                onChangeText={(nextValue) => {
                  const sanitizedValue = sanitizeSlotlymeIdInput(nextValue);
                  setSlotlymeId((currentValue) =>
                    currentValue === sanitizedValue ? currentValue : sanitizedValue
                  );
                  setMessage('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                style={authUiStyles.input}
              />
              {slotlymeIdAvailability.formatError ? (
                <Text style={[authUiStyles.helperText, { marginTop: theme.spacing[8] }]}>
                  {slotlymeIdAvailability.formatError}
                </Text>
              ) : slotlymeIdAvailability.availabilityMessage ? (
                <Text style={[authUiStyles.helperText, { marginTop: theme.spacing[8] }]}>
                  {slotlymeIdAvailability.availabilityMessage}
                </Text>
              ) : null}
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
