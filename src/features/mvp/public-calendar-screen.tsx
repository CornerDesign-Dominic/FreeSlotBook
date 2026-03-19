import { useEffect, useMemo, useState } from 'react';
import { Link, Redirect } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { getDayKey } from './calendar-utils';
import { bookPublicCalendarSlot } from './repository';
import { PRIVACY_VERSION, TERMS_VERSION } from './types';
import { useCalendar } from './useCalendar';
import { useOwnerSlots } from './useOwnerSlots';

function formatDateTime(value: Date | null) {
  if (!value) {
    return 'Zeitpunkt nicht verfügbar';
  }

  return value.toLocaleString('de-DE');
}

function formatDate(value: Date | null) {
  if (!value) {
    return 'Datum nicht verfügbar';
  }

  return value.toLocaleDateString('de-DE');
}

function formatTimeRange(startsAt: Date | null, endsAt: Date | null) {
  if (!startsAt || !endsAt) {
    return 'Uhrzeit nicht verfügbar';
  }

  return `${startsAt.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endsAt.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

type BookingSuccessSummary = {
  startsAt: Date | null;
  endsAt: Date | null;
  ownerEmail: string;
  participantEmail: string;
  requestAccountCreation: boolean;
};

export function PublicCalendarScreenContent(props: {
  calendarId: string | null;
  currentPublicPath: string;
}) {
  const { calendar, loading: calendarLoading, error: calendarError } = useCalendar(props.calendarId);
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(props.calendarId);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [requestAccountCreation, setRequestAccountCreation] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successSummary, setSuccessSummary] = useState<BookingSuccessSummary | null>(null);

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
        <Text style={{ color: 'black' }}>Wird geladen...</Text>
      </View>
    );
  }

  if (calendar?.visibility === 'public' && calendar.publicSlug) {
    const canonicalPath = `/${calendar.publicSlug}`;

    if (props.currentPublicPath !== canonicalPath) {
      return <Redirect href={canonicalPath} />;
    }
  }

  if (!calendar || calendar.visibility !== 'public') {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black', marginBottom: 12 }}>
          Dieser Kalender ist aktuell nicht öffentlich verfügbar.
        </Text>
        {calendarError ? <Text style={{ color: 'black' }}>{calendarError}</Text> : null}
      </View>
    );
  }

  const selectedSlot = selectedSlotId
    ? availableSlots.find((slot) => slot.id === selectedSlotId) ?? null
    : null;
  const canBook = Boolean(selectedSlot && participantName.trim() && participantEmail.trim() && !submitting);
  const canConfirmConsent = termsAccepted && privacyAccepted && !submitting;

  const handleStartBooking = () => {
    if (!selectedSlot) {
      setMessage('Bitte wähle zuerst einen freien Slot aus.');
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

    setMessage(null);
    setSuccessSummary(null);
    setTermsAccepted(false);
    setPrivacyAccepted(false);
    setShowConsentModal(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      setShowConsentModal(false);
      setMessage('Bitte wähle zuerst einen freien Slot aus.');
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
        termsAccepted,
        privacyAccepted,
      });

      setSuccessSummary({
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        ownerEmail: calendar.ownerEmail,
        participantEmail: participantEmail.trim(),
        requestAccountCreation,
      });
      setMessage(
        requestAccountCreation
          ? 'Die Buchung wurde gespeichert. Für diese E-Mail-Adresse wurde eine spätere Kontoanlage vorgemerkt.'
          : 'Die Buchung wurde gespeichert. Du erhältst eine Bestätigung per E-Mail.'
      );
      setSelectedSlotId(null);
      setParticipantName('');
      setParticipantEmail('');
      setRequestAccountCreation(false);
      setTermsAccepted(false);
      setPrivacyAccepted(false);
      setShowConsentModal(false);
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
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>Öffentlicher Kalender</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', marginBottom: 8 }}>
          Freie Slots kannst du direkt ohne Konto buchen.
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
              {slot.startsAt ? <Text style={{ color: 'black' }}>Tag: {getDayKey(slot.startsAt)}</Text> : null}
            </Pressable>
          ))
        ) : (
          <Text style={{ color: 'black' }}>In diesem Kalender sind aktuell keine freien Slots vorhanden.</Text>
        )}

        {slotsError ? <Text style={{ color: 'black', marginTop: 12 }}>{slotsError}</Text> : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>Slot buchen</Text>
        {selectedSlot ? (
          <Text style={{ color: 'black', marginBottom: 12 }}>
            Ausgewählter Slot: {formatDateTime(selectedSlot.startsAt)} bis {formatDateTime(selectedSlot.endsAt)}
          </Text>
        ) : (
          <Text style={{ color: 'black', marginBottom: 12 }}>Bitte wähle oben einen freien Slot aus.</Text>
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
          onPress={handleStartBooking}
          disabled={!canBook}
          style={{
            borderWidth: 1,
            borderColor: 'black',
            paddingVertical: 12,
            alignItems: 'center',
            opacity: canBook ? 1 : 0.55,
          }}>
          <Text style={{ color: 'black' }}>{submitting ? 'Buche Slot...' : 'Verbindlich buchen'}</Text>
        </Pressable>

        {message ? <Text style={{ color: 'black', marginTop: 12 }}>{message}</Text> : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link
          href={{
            pathname: '/login',
            params: { redirect: props.currentPublicPath },
          }}>
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            Mit bestehendem Konto anmelden
          </Text>
        </Link>
      </View>

      <Modal
        visible={Boolean(successSummary)}
        animationType="fade"
        transparent
        onRequestClose={() => setSuccessSummary(null)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            justifyContent: 'center',
            padding: 16,
          }}>
          <View style={{ backgroundColor: 'white', borderWidth: 1, borderColor: 'black', padding: 16 }}>
            <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>Buchung erfolgreich</Text>

            {successSummary ? (
              <>
                <Text style={{ color: 'black', marginBottom: 8 }}>Datum: {formatDate(successSummary.startsAt)}</Text>
                <Text style={{ color: 'black', marginBottom: 8 }}>
                  Uhrzeit: {formatTimeRange(successSummary.startsAt, successSummary.endsAt)}
                </Text>
                <Text style={{ color: 'black', marginBottom: 8 }}>Kalender: {successSummary.ownerEmail}</Text>
                <Text style={{ color: 'black', marginBottom: 16 }}>
                  Bestätigung an: {successSummary.participantEmail}
                </Text>

                {successSummary.requestAccountCreation ? (
                  <Text style={{ color: 'black', marginBottom: 16 }}>
                    Zusätzlich wurde eine E-Mail zur Kontoerstellung an diese Adresse vorbereitet bzw.
                    verschickt.
                  </Text>
                ) : null}

                <View style={{ borderTopWidth: 1, borderColor: 'black', paddingTop: 16, marginBottom: 16 }}>
                  {successSummary.requestAccountCreation ? (
                    <Text style={{ color: 'black' }}>
                      Bitte bestätige die E-Mail, um deine Adresse zu bestätigen und die vorbereitete
                      Kontoanlage abzuschließen.
                    </Text>
                  ) : (
                    <>
                      <Text style={{ color: 'black', marginBottom: 8 }}>
                        Erstelle über diesen Link ein kostenloses Konto, damit du deine gebuchten Termine
                        später jederzeit sehen kannst.
                      </Text>
                      <Link href="/register">
                        <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                          Kostenlosen Account erstellen
                        </Text>
                      </Link>
                    </>
                  )}
                </View>
              </>
            ) : null}

            <Pressable
              onPress={() => setSuccessSummary(null)}
              style={{
                borderWidth: 1,
                borderColor: 'black',
                paddingVertical: 12,
                alignItems: 'center',
              }}>
              <Text style={{ color: 'black' }}>Schließen</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showConsentModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!submitting) {
            setShowConsentModal(false);
          }
        }}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            justifyContent: 'center',
            padding: 16,
          }}>
          <View style={{ backgroundColor: 'white', borderWidth: 1, borderColor: 'black', padding: 16 }}>
            <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>Buchung bestätigen</Text>
            <Text style={{ color: 'black', marginBottom: 16 }}>
              Mit der Buchung akzeptiere ich die AGB und bestätige, die Datenschutzerklärung gelesen zu
              haben.
            </Text>

            <Pressable
              onPress={() => setTermsAccepted((currentValue) => !currentValue)}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
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
                {termsAccepted ? <Text style={{ color: 'black' }}>x</Text> : null}
              </View>
              <Text style={{ color: 'black', flex: 1 }}>AGB akzeptieren</Text>
            </Pressable>

            <Pressable
              onPress={() => setPrivacyAccepted((currentValue) => !currentValue)}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
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
                {privacyAccepted ? <Text style={{ color: 'black' }}>x</Text> : null}
              </View>
              <Text style={{ color: 'black', flex: 1 }}>Datenschutzerklärung gelesen</Text>
            </Pressable>

            <View style={{ marginBottom: 16 }}>
              <Link href="/agb" style={{ marginBottom: 8 }}>
                <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                  AGB lesen (Version {TERMS_VERSION})
                </Text>
              </Link>
              <Link href="/datenschutz">
                <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                  Datenschutzerklärung lesen (Version {PRIVACY_VERSION})
                </Text>
              </Link>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Pressable
                onPress={() => setShowConsentModal(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: 'black',
                  paddingVertical: 12,
                  alignItems: 'center',
                  opacity: submitting ? 0.55 : 1,
                }}>
                <Text style={{ color: 'black' }}>Abbrechen</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmBooking}
                disabled={!canConfirmConsent}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: 'black',
                  paddingVertical: 12,
                  alignItems: 'center',
                  opacity: canConfirmConsent ? 1 : 0.55,
                }}>
                <Text style={{ color: 'black' }}>
                  {submitting ? 'Buche Slot...' : 'Jetzt verbindlich buchen'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
