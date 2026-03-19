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
        return 'Please enter a valid email address.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'Incorrect email or password.';
      case 'auth/user-not-found':
        return 'No account found for this email.';
      default:
        return 'Unable to log in right now. Please try again.';
    }
  }

  return 'Unable to log in right now. Please try again.';
}

function getVerificationEmailErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/too-many-requests':
        return 'Die Bestaetigungs-E-Mail konnte gerade nicht erneut gesendet werden. Bitte versuche es spaeter noch einmal.';
      case 'auth/network-request-failed':
        return 'Die Bestaetigungs-E-Mail konnte wegen eines Netzwerkproblems nicht gesendet werden.';
      case 'auth/user-token-expired':
      case 'auth/requires-recent-login':
        return 'Bitte melde dich erneut an, um die Bestaetigungs-E-Mail zu senden.';
      default:
        return 'Die Bestaetigungs-E-Mail konnte gerade nicht gesendet werden.';
    }
  }

  return 'Die Bestaetigungs-E-Mail konnte gerade nicht gesendet werden.';
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
      setMessage('Email is required.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setMessage('Password is required.');
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
          'Bitte bestaetige zuerst deine E-Mail-Adresse ueber den Link in der Willkommensmail.'
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
      setMessage('Bitte gib E-Mail und Passwort ein, damit wir die Bestaetigungs-E-Mail erneut senden koennen.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const credential = await loginWithEmail(trimmedEmail, password);
      const verificationUser = credential.user;

      await sendVerificationEmail(verificationUser);
      await logout();
      setMessage('Die Bestaetigungs-E-Mail wurde erneut gesendet.');
    } catch (error) {
      setMessage(getVerificationEmailErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Login</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 12 }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 12 }}
      />

      <Button
        title={submitting ? 'Logging in...' : 'Login'}
        onPress={handleLogin}
        disabled={submitting}
      />

      <Link href="/forgot-password" asChild>
        <Pressable>
          <Text>Forgot password?</Text>
        </Pressable>
      </Link>

      <Text>
        Einladung nach einer Gastbuchung erhalten? Bitte zuerst den Link in der E-Mail nutzen und dort dein Passwort festlegen.
      </Text>

      {message ? <Text>{message}</Text> : null}

      {canResendVerification ? (
        <Button
          title={submitting ? 'Sende erneut...' : 'Bestaetigungs-E-Mail erneut senden'}
          onPress={handleResendVerification}
          disabled={submitting}
        />
      ) : null}
    </View>
  );
}
