import { useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { requestCalendarAccessByOwnerEmail } from '../src/features/mvp/repository';
import { useAuth } from '../src/firebase/useAuth';

export default function RequestCalendarAccessScreen() {
  const { user, loading } = useAuth();
  const [ownerEmailInput, setOwnerEmailInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestAccess = async () => {
    if (!user?.email) {
      setMessage('Du musst eingeloggt sein, um eine Zugriffsanfrage zu stellen.');
      return;
    }

    const trimmedOwnerEmail = ownerEmailInput.trim();

    if (!trimmedOwnerEmail) {
      setMessage('Bitte gib die E-Mail des Kalenderinhabers ein.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const calendar = await requestCalendarAccessByOwnerEmail({
        ownerEmail: trimmedOwnerEmail,
        requesterEmail: user.email,
      });
      setMessage(
        `Deine Anfrage fuer den Kalender von ${calendar.ownerEmail || trimmedOwnerEmail} wurde gespeichert.`
      );
      setOwnerEmailInput('');
    } catch (nextError) {
      setMessage(
        nextError instanceof Error ? nextError.message : 'Anfrage konnte nicht gespeichert werden.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>Wird geladen...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>Zugriff anfragen</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', marginBottom: 8 }}>
          E-Mail des Kalenderinhabers
        </Text>
        <TextInput
          placeholder="inhaber@beispiel.de"
          value={ownerEmailInput}
          onChangeText={setOwnerEmailInput}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 12 }}
        />
        <Pressable
          onPress={handleRequestAccess}
          disabled={submitting || !user?.email}
          style={{ borderWidth: 1, borderColor: 'black', paddingVertical: 12, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}>
          <Text style={{ color: 'black' }}>
            {submitting ? 'Sende Anfrage...' : 'Zugriffsanfrage senden'}
          </Text>
        </Pressable>

        <Text style={{ color: 'black', marginTop: 12 }}>
          Die Anfrage wird als echter Firestore-Datensatz gespeichert und kann vom Kalenderinhaber angenommen oder abgelehnt werden.
        </Text>
        {message ? <Text style={{ color: 'black', marginTop: 12 }}>{message}</Text> : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link href="/(tabs)">
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            Zurueck zum Dashboard
          </Text>
        </Link>
      </View>
    </ScrollView>
  );
}
