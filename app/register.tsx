import { useEffect, useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';

import { logout, registerWithEmail, sendVerificationEmail } from '../src/firebase/auth';
import { ensureOwnerAccountSetup } from '../src/features/mvp/repository';
import { useAuth } from '../src/firebase/useAuth';

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

function getRegisterErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Für diese E-Mail-Adresse gibt es bereits ein Konto.';
      case 'auth/invalid-email':
        return 'Bitte gib eine gültige E-Mail-Adresse ein.';
      case 'auth/weak-password':
        return 'Das Passwort muss mindestens 6 Zeichen lang sein.';
      default:
        return 'Dein Konto konnte gerade nicht erstellt werden. Bitte versuche es noch einmal.';
    }
  }

  return 'Dein Konto konnte gerade nicht erstellt werden. Bitte versuche es noch einmal.';
}

export default function RegisterScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
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

  const handleRegister = async () => {
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
      setMessage('Bitte gib ein Passwort ein.');
      return;
    }

    if (password.length < 6) {
      setMessage('Das Passwort muss mindestens 6 Zeichen lang sein.');
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
      setMessage(
        'Wir haben dir eine E-Mail geschickt. Bitte bestätige deine Adresse, bevor du dich anmelden kannst.'
      );
    } catch (error) {
      setMessage(getRegisterErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Konto erstellen</Text>

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
        title={submitting ? 'Erstelle Konto...' : 'Konto erstellen'}
        onPress={handleRegister}
        disabled={submitting}
      />

      {message ? <Text>{message}</Text> : null}
    </View>
  );
}
