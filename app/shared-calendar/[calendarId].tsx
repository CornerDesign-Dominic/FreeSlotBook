import { useEffect, useMemo, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { getDayKey } from '../../src/features/mvp/calendar-utils';
import { bookSharedCalendarSlot } from '../../src/features/mvp/repository';
import { useCalendar } from '../../src/features/mvp/useCalendar';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';
import { useAuth } from '../../src/firebase/useAuth';

function formatDateTime(value: Date | null) {
  if (!value) {
    return 'Zeitpunkt nicht verfuegbar';
  }

  return value.toLocaleString('de-DE');
}

export default function SharedCalendarScreen() {
  const params = useLocalSearchParams<{ calendarId?: string | string[] }>();
  const calendarId = Array.isArray(params.calendarId) ? params.calendarId[0] : params.calendarId ?? null;
  const { user, loading: authLoading } = useAuth();
  const { calendar, loading: calendarLoading, error: calendarError } = useCalendar(calendarId);
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(calendarId);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const availableSlots = useMemo(
    () =>
      slots.filter((slot) => slot.status === 'available' && slot.startsAt && slot.endsAt),
    [slots]
  );

  console.log('SharedCalendar:state', {
    routeCalendarId: calendarId,
    userEmail: user?.email ?? null,
    calendar,
    calendarError,
    slotsCount: slots.length,
    availableSlotsCount: availableSlots.length,
    slotsError,
    authLoading,
    calendarLoading,
    slotsLoading,
  });

  useEffect(() => {
    if (!selectedSlotId) {
      return;
    }

    const stillAvailable = availableSlots.some((slot) => slot.id === selectedSlotId);

    if (!stillAvailable) {
      setSelectedSlotId(null);
    }
  }, [availableSlots, selectedSlotId]);

  if (authLoading || calendarLoading || slotsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>Loading...</Text>
      </View>
    );
  }

  const selectedSlot = selectedSlotId
    ? availableSlots.find((slot) => slot.id === selectedSlotId) ?? null
    : null;
  const canBook = Boolean(
    selectedSlot &&
      user?.email &&
      user.uid &&
      calendar &&
      calendar.ownerId !== user.uid
  );

  const handleBookSlot = async () => {
    if (!selectedSlot || !calendar || !user?.email) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await bookSharedCalendarSlot({
        calendarId: calendar.id,
        slotId: selectedSlot.id,
        bookedByUid: user.uid,
        bookedByEmail: user.email,
      });
      setMessage('Der Slot wurde erfolgreich gebucht.');
      setSelectedSlotId(null);
    } catch (nextError) {
      setMessage(
        nextError instanceof Error ? nextError.message : 'Die Buchung konnte nicht abgeschlossen werden.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>Freigegebener Kalender</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        {calendar ? (
          <>
            <Text style={{ color: 'black', marginBottom: 8 }}>Inhaber: {calendar.ownerEmail}</Text>
            <Text style={{ color: 'black', marginBottom: 8 }}>Kalender-ID: {calendar.id}</Text>
            <Text style={{ color: 'black' }}>Sichtbarkeit: {calendar.visibility}</Text>
          </>
        ) : (
          <Text style={{ color: 'black' }}>Dieser Kalender konnte nicht geladen werden.</Text>
        )}

        {calendarError ? <Text style={{ color: 'black', marginTop: 12 }}>{calendarError}</Text> : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>Verfuegbare Slots</Text>
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
              <Text style={{ color: 'black', marginBottom: 4 }}>Status: offen</Text>
              {slot.startsAt ? (
                <Text style={{ color: 'black' }}>
                  Tag: {getDayKey(slot.startsAt)}
                </Text>
              ) : null}
            </Pressable>
          ))
        ) : (
          <Text style={{ color: 'black' }}>
            In diesem freigegebenen Kalender sind aktuell keine verfuegbaren Slots vorhanden.
          </Text>
        )}

        {slotsError ? <Text style={{ color: 'black', marginTop: 12 }}>{slotsError}</Text> : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>Buchung</Text>
        {selectedSlot ? (
          <>
            <Text style={{ color: 'black', marginBottom: 4 }}>
              Ausgewaehlter Slot: {formatDateTime(selectedSlot.startsAt)} bis {formatDateTime(selectedSlot.endsAt)}
            </Text>
            <Text style={{ color: 'black', marginBottom: 12 }}>
              {calendar?.ownerId === user?.uid
                ? 'Eigene Slots werden nicht ueber diese Fremdansicht gebucht.'
                : 'Dieser verfuegbare Slot kann jetzt direkt gebucht werden.'}
            </Text>
          </>
        ) : (
          <Text style={{ color: 'black', marginBottom: 12 }}>
            Waehle oben einen verfuegbaren Slot aus, um ihn zu buchen.
          </Text>
        )}

        <Pressable
          onPress={handleBookSlot}
          disabled={!canBook || submitting}
          style={{
            borderWidth: 1,
            borderColor: 'black',
            paddingVertical: 12,
            alignItems: 'center',
            opacity: !canBook || submitting ? 0.55 : 1,
          }}>
          <Text style={{ color: 'black' }}>
            {submitting ? 'Buche Slot...' : 'Slot buchen'}
          </Text>
        </Pressable>

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
