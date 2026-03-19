import { useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  approveCalendarAccessRequest,
  rejectCalendarAccessRequest,
  upsertCalendarAccess,
} from '../../src/features/mvp/repository';
import { useCalendarAccessList } from '../../src/features/mvp/useCalendarAccessList';
import { useCalendarAccessRequests } from '../../src/features/mvp/useCalendarAccessRequests';
import { useOwnerCalendar } from '../../src/features/mvp/useOwnerCalendar';
import { useAuth } from '../../src/firebase/useAuth';

function formatRequestStatus(status: 'pending' | 'approved' | 'rejected') {
  if (status === 'approved') {
    return 'angenommen';
  }

  if (status === 'rejected') {
    return 'abgelehnt';
  }

  return 'offen';
}

export default function CalendarAccessScreen() {
  const { user, loading: authLoading } = useAuth();
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { records: accessRecords, loading: accessLoading, error: accessError } =
    useCalendarAccessList(calendar?.id ?? null);
  const { records: requestRecords, loading: requestsLoading, error: requestsError } =
    useCalendarAccessRequests(calendar?.id ?? null);
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);

  const pendingRequests = requestRecords.filter((record) => record.status === 'pending');

  const handleGrantAccess = async () => {
    if (!calendar || !user) {
      setMessage('Dein Kalender ist noch nicht verfuegbar.');
      return;
    }

    const trimmedEmail = emailInput.trim();

    if (!trimmedEmail) {
      setMessage('Bitte gib eine E-Mail-Adresse ein.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await upsertCalendarAccess({
        calendarId: calendar.id,
        ownerId: user.uid,
        granteeEmail: trimmedEmail,
        status: 'approved',
      });
      setEmailInput('');
      setMessage('Freigabe wurde gespeichert.');
    } catch (nextError) {
      setMessage(
        nextError instanceof Error ? nextError.message : 'Freigabe konnte nicht gespeichert werden.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRequest = async (requesterEmail: string) => {
    if (!calendar || !user) {
      return;
    }

    setProcessingEmail(requesterEmail);
    setMessage(null);

    try {
      await approveCalendarAccessRequest({
        calendarId: calendar.id,
        ownerId: user.uid,
        requesterEmail,
      });
      setMessage(`Anfrage von ${requesterEmail} wurde angenommen.`);
    } catch (nextError) {
      setMessage(
        nextError instanceof Error ? nextError.message : 'Anfrage konnte nicht angenommen werden.'
      );
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleRejectRequest = async (requesterEmail: string) => {
    if (!calendar) {
      return;
    }

    setProcessingEmail(requesterEmail);
    setMessage(null);

    try {
      await rejectCalendarAccessRequest({
        calendarId: calendar.id,
        requesterEmail,
      });
      setMessage(`Anfrage von ${requesterEmail} wurde abgelehnt.`);
    } catch (nextError) {
      setMessage(
        nextError instanceof Error ? nextError.message : 'Anfrage konnte nicht abgelehnt werden.'
      );
    } finally {
      setProcessingEmail(null);
    }
  };

  if (authLoading || loading || accessLoading || requestsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>Wird geladen...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>Freigaben verwalten</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', marginBottom: 8 }}>Neue Freigabe per E-Mail</Text>
        <TextInput
          placeholder="kontakt@beispiel.de"
          value={emailInput}
          onChangeText={setEmailInput}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 12 }}
        />
        <Pressable
          onPress={handleGrantAccess}
          disabled={submitting || !calendar}
          style={{ borderWidth: 1, borderColor: 'black', paddingVertical: 12, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}>
          <Text style={{ color: 'black' }}>
            {submitting ? 'Speichere...' : 'Freigabe hinzufuegen'}
          </Text>
        </Pressable>
        {message ? <Text style={{ color: 'black', marginTop: 12 }}>{message}</Text> : null}
        {error ? <Text style={{ color: 'black', marginTop: 12 }}>{error}</Text> : null}
        {accessError ? <Text style={{ color: 'black', marginTop: 12 }}>{accessError}</Text> : null}
        {requestsError ? <Text style={{ color: 'black', marginTop: 12 }}>{requestsError}</Text> : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>Freigegebene Personen</Text>
        {accessRecords.length ? (
          accessRecords.map((record) => (
            <View key={record.id} style={{ borderTopWidth: 1, borderColor: 'black', paddingTop: 12, marginTop: 12 }}>
              <Text style={{ color: 'black', marginBottom: 4 }}>{record.granteeEmail}</Text>
              <Text style={{ color: 'black' }}>Status: {record.status}</Text>
            </View>
          ))
        ) : (
          <Text style={{ color: 'black' }}>
            Es gibt aktuell noch keine freigegebenen Personen fuer diesen Kalender.
          </Text>
        )}
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>Eingehende Anfragen</Text>
        {pendingRequests.length ? (
          pendingRequests.map((record) => (
            <View key={record.id} style={{ borderTopWidth: 1, borderColor: 'black', paddingTop: 12, marginTop: 12 }}>
              <Text style={{ color: 'black', marginBottom: 4 }}>{record.requesterEmail}</Text>
              <Text style={{ color: 'black', marginBottom: 8 }}>
                Status: {formatRequestStatus(record.status)}
              </Text>
              <View style={{ flexDirection: 'row' }}>
                <Pressable
                  onPress={() => handleApproveRequest(record.requesterEmail)}
                  disabled={processingEmail === record.requesterEmail}
                  style={{ marginRight: 16 }}>
                  <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                    Annehmen
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleRejectRequest(record.requesterEmail)}
                  disabled={processingEmail === record.requesterEmail}>
                  <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                    Ablehnen
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <Text style={{ color: 'black' }}>
            Es liegen aktuell keine offenen Zugriffsanfragen vor.
          </Text>
        )}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link href="/my-calendar">
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            Zurueck zu meinem Kalender
          </Text>
        </Link>
      </View>
    </ScrollView>
  );
}
