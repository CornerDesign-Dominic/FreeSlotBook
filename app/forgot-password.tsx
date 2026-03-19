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
        return 'Bitte gib eine gültige E-Mail-Adresse ein.';
      case 'auth/user-not-found':
        return 'Für diese E-Mail-Adresse wurde kein Konto gefunden.';
      default:
        return 'Die E-Mail zum Zurücksetzen konnte nicht gesendet werden. Bitte versuche es noch einmal.';
    }
  }

  return 'Die E-Mail zum Zurücksetzen konnte nicht gesendet werden. Bitte versuche es noch einmal.';
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReset = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage('Bitte gib deine E-Mail-Adresse ein.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setMessage('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      await sendResetPassword(trimmedEmail);
      setMessage('Die E-Mail zum Zurücksetzen wurde gesendet.');
    } catch (error) {
      setMessage(getResetErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Passwort zurücksetzen</Text>

      <TextInput
        placeholder="E-Mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 12 }}
      />

      <Button
        title={submitting ? 'Sende E-Mail...' : 'E-Mail zum Zurücksetzen senden'}
        onPress={handleReset}
        disabled={submitting}
      />

      {message ? <Text>{message}</Text> : null}
    </View>
  );
}
