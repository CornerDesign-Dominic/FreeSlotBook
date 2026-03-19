import { useEffect, useState } from 'react';
import { Button, Pressable, Text, TextInput, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';

import { loginWithEmail, logout, sendVerificationEmail } from '../src/firebase/auth';
import { useAuth } from '../src/firebase/useAuth';

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

function getLoginErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Bitte gib eine gültige E-Mail-Adresse ein.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'E-Mail oder Passwort ist nicht korrekt.';
      case 'auth/user-not-found':
        return 'Für diese E-Mail-Adresse wurde kein Konto gefunden.';
      default:
        return 'Anmeldung ist gerade nicht möglich. Bitte versuche es noch einmal.';
    }
  }

  return 'Anmeldung ist gerade nicht möglich. Bitte versuche es noch einmal.';
}

function getVerificationEmailErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/too-many-requests':
        return 'Die Bestätigungs-E-Mail konnte gerade nicht erneut gesendet werden. Bitte versuche es später noch einmal.';
      case 'auth/network-request-failed':
        return 'Die Bestätigungs-E-Mail konnte wegen eines Netzwerkproblems nicht gesendet werden.';
      case 'auth/user-token-expired':
      case 'auth/requires-recent-login':
        return 'Bitte melde dich erneut an, um die Bestätigungs-E-Mail zu senden.';
      default:
        return 'Die Bestätigungs-E-Mail konnte gerade nicht gesendet werden.';
    }
  }

  return 'Die Bestätigungs-E-Mail konnte gerade nicht gesendet werden.';
}

function getSafeRedirectTarget(value: string | string[] | undefined) {
  const redirect = Array.isArray(value) ? value[0] : value;

  if (!redirect) {
    return null;
  }

  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    return null;
  }

  return redirect;
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string | string[] }>();
  const { user, loading } = useAuth();
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

  const handleLogin = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage('Bitte gib deine E-Mail-Adresse ein.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setMessage('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    if (!password) {
      setMessage('Bitte gib dein Passwort ein.');
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
        setMessage(
          'Bitte bestätige zuerst deine E-Mail-Adresse über den Link in der Willkommens-E-Mail.'
        );
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
      setMessage('Bitte gib deine E-Mail-Adresse und dein Passwort ein, damit wir die Bestätigungs-E-Mail erneut senden können.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const credential = await loginWithEmail(trimmedEmail, password);
      const verificationUser = credential.user;

      await sendVerificationEmail(verificationUser);
      await logout();
      setMessage('Die Bestätigungs-E-Mail wurde erneut gesendet.');
    } catch (error) {
      setMessage(getVerificationEmailErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Anmelden</Text>

      <TextInput
        placeholder="E-Mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 12 }}
      />

      <TextInput
        placeholder="Passwort"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 12 }}
      />

      <Button
        title={submitting ? 'Melde an...' : 'Anmelden'}
        onPress={handleLogin}
        disabled={submitting}
      />

      <Link href="/forgot-password" asChild>
        <Pressable>
          <Text>Passwort vergessen?</Text>
        </Pressable>
      </Link>

      <Text>
        Einladung nach einer Gastbuchung erhalten? Nutze bitte zuerst den Link in der E-Mail und lege dort dein Passwort fest.
      </Text>

      {message ? <Text>{message}</Text> : null}

      {canResendVerification ? (
        <Button
          title={submitting ? 'Sende erneut...' : 'Bestätigungs-E-Mail erneut senden'}
          onPress={handleResendVerification}
          disabled={submitting}
        />
      ) : null}
    </View>
  );
}
