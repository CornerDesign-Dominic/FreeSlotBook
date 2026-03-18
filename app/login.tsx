import { useEffect, useState } from 'react';
import { Button, Pressable, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';

import { loginWithEmail } from '../src/firebase/auth';
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

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)');
    }
  }, [loading, router, user]);

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

    try {
      await loginWithEmail(trimmedEmail, password);
      router.replace('/(tabs)');
    } catch (error) {
      setMessage(getLoginErrorMessage(error));
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

      {message ? <Text>{message}</Text> : null}
    </View>
  );
}
