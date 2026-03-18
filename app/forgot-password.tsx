import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { FirebaseError } from 'firebase/app';

import { sendResetPassword } from '../src/firebase/auth';

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

function getResetErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
        return 'No account found for this email.';
      default:
        return 'Unable to send the reset email. Please try again.';
    }
  }

  return 'Unable to send the reset email. Please try again.';
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReset = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage('Email is required.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setMessage('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      await sendResetPassword(trimmedEmail);
      setMessage('Password reset email sent.');
    } catch (error) {
      setMessage(getResetErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Reset password</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 12 }}
      />

      <Button
        title={submitting ? 'Sending...' : 'Send reset email'}
        onPress={handleReset}
        disabled={submitting}
      />

      {message ? <Text>{message}</Text> : null}
    </View>
  );
}
