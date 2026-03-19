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
        return 'An account with this email already exists.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      default:
        return 'Unable to create your account. Please try again.';
    }
  }

  return 'Unable to create your account. Please try again.';
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

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
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
        'Wir haben dir eine E-Mail geschickt. Bitte bestaetige deine Adresse, bevor du dich einloggen kannst.'
      );
    } catch (error) {
      setMessage(getRegisterErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Register</Text>

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
        title={submitting ? 'Creating account...' : 'Create account'}
        onPress={handleRegister}
        disabled={submitting}
      />

      {message ? <Text>{message}</Text> : null}
    </View>
  );
}
