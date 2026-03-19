import { useEffect, useMemo, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { getDayKey } from '../../src/features/mvp/calendar-utils';
import { bookPublicCalendarSlot } from '../../src/features/mvp/repository';
import { useCalendar } from '../../src/features/mvp/useCalendar';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';

function formatDateTime(value: Date | null) {
  if (!value) {
    return 'Zeitpunkt nicht verfuegbar';
  }

  return value.toLocaleString('de-DE');
}

export default function PublicCalendarScreen() {
  const params = useLocalSearchParams<{ calendarId?: string | string[] }>();
  const calendarId = Array.isArray(params.calendarId) ? params.calendarId[0] : params.calendarId ?? null;
  const { calendar, loading: calendarLoading, error: calendarError } = useCalendar(calendarId);
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(calendarId);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [requestAccountCreation, setRequestAccountCreation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const availableSlots = useMemo(
    () =>
      slots.filter((slot) => slot.status === 'available' && slot.startsAt && slot.endsAt),
    [slots]
  );

  useEffect(() => {
    if (!selectedSlotId) {
      return;
    }

    const stillAvailable = availableSlots.some((slot) => slot.id === selectedSlotId);

    if (!stillAvailable) {
      setSelectedSlotId(null);
    }
  }, [availableSlots, selectedSlotId]);

  if (calendarLoading || slotsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>Loading...</Text>
      </View>
    );
  }

  if (!calendar || calendar.visibility !== 'public') {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black', marginBottom: 12 }}>
          Dieser Kalender ist aktuell nicht oeffentlich verfuegbar.
        </Text>
        {calendarError ? <Text style={{ color: 'black' }}>{calendarError}</Text> : null}
      </View>
    );
  }

  const selectedSlot = selectedSlotId
    ? availableSlots.find((slot) => slot.id === selectedSlotId) ?? null
    : null;
  const canBook = Boolean(
    selectedSlot &&
      participantName.trim() &&
      participantEmail.trim() &&
      !submitting
  );

  const handleBookSlot = async () => {
    if (!selectedSlot) {
      setMessage('Bitte waehle zuerst einen freien Slot aus.');
      return;
    }

    if (!participantName.trim()) {
      setMessage('Bitte gib deinen Namen ein.');
      return;
    }

    if (!participantEmail.trim()) {
      setMessage('Bitte gib deine E-Mail ein.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await bookPublicCalendarSlot({
        calendarId: calendar.id,
        slotId: selectedSlot.id,
        participantName,
        participantEmail,
        requestAccountCreation,
      });

      setMessage(
        requestAccountCreation
          ? 'Buchung gespeichert. Eine spaetere Kontoanlage mit dieser E-Mail wurde vorbereitet.'
          : 'Buchung gespeichert. Du erhaeltst spaeter eine Bestaetigung an diese E-Mail.'
      );
      setSelectedSlotId(null);
      setParticipantName('');
      setParticipantEmail('');
      setRequestAccountCreation(false);
    } catch (nextError) {
      setMessage(
        nextError instanceof Error ? nextError.message : 'Die Buchung konnte nicht gespeichert werden.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>Oeffentlicher Kalender</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', marginBottom: 8 }}>
          Verfuegbare Slots koennen direkt ohne Konto gebucht werden.
        </Text>
        <Text style={{ color: 'black' }}>Sichtbarkeit: {calendar.visibility}</Text>
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>Freie Slots</Text>
        {availableSlots.length ? (
          availableSlots.map((slot) => (
            <Pressable
              key={slot.id}
              onPress={() => {
                setSelectedSlotId(slot.id);
                setMessage(null);
              }}
              style={{
                borderTopWidth: 1,
                borderColor: 'black',
                paddingTop: 12,
                marginTop: 12,
                backgroundColor: selectedSlotId === slot.id ? '#f1f1f1' : 'white',
              }}>
              <Text style={{ color: 'black', marginBottom: 4 }}>
                {formatDateTime(slot.startsAt)} bis {formatDateTime(slot.endsAt)}
              </Text>
              {slot.startsAt ? (
                <Text style={{ color: 'black' }}>Tag: {getDayKey(slot.startsAt)}</Text>
              ) : null}
            </Pressable>
          ))
        ) : (
          <Text style={{ color: 'black' }}>
            In diesem Kalender sind aktuell keine freien Slots vorhanden.
          </Text>
        )}

        {slotsError ? <Text style={{ color: 'black', marginTop: 12 }}>{slotsError}</Text> : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>Slot buchen</Text>
        {selectedSlot ? (
          <Text style={{ color: 'black', marginBottom: 12 }}>
            Ausgewaehlter Slot: {formatDateTime(selectedSlot.startsAt)} bis {formatDateTime(selectedSlot.endsAt)}
          </Text>
        ) : (
          <Text style={{ color: 'black', marginBottom: 12 }}>
            Bitte waehle oben einen freien Slot aus.
          </Text>
        )}

        <Text style={{ color: 'black', marginBottom: 8 }}>Name</Text>
        <TextInput
          value={participantName}
          onChangeText={setParticipantName}
          placeholder="Vor- und Nachname"
          style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 12 }}
        />

        <Text style={{ color: 'black', marginBottom: 8 }}>E-Mail</Text>
        <TextInput
          value={participantEmail}
          onChangeText={setParticipantEmail}
          placeholder="name@beispiel.de"
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 12 }}
        />

        <Pressable
          onPress={() => setRequestAccountCreation((currentValue) => !currentValue)}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              width: 18,
              height: 18,
              borderWidth: 1,
              borderColor: 'black',
              marginRight: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {requestAccountCreation ? <Text style={{ color: 'black' }}>x</Text> : null}
          </View>
          <Text style={{ color: 'black' }}>Mit dieser E-Mail auch ein Konto anlegen</Text>
        </Pressable>

        <Pressable
          onPress={handleBookSlot}
          disabled={!canBook}
          style={{
            borderWidth: 1,
            borderColor: 'black',
            paddingVertical: 12,
            alignItems: 'center',
            opacity: canBook ? 1 : 0.55,
          }}>
          <Text style={{ color: 'black' }}>
            {submitting ? 'Buche Slot...' : 'Slot verbindlich buchen'}
          </Text>
        </Pressable>

        {message ? <Text style={{ color: 'black', marginTop: 12 }}>{message}</Text> : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link href="/login">
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            Mit bestehendem Konto anmelden
          </Text>
        </Link>
      </View>
    </ScrollView>
  );
}
