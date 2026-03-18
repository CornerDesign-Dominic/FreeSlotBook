import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  formatDayTitle,
  getMinutesSinceStartOfDay,
  getSlotsForDay,
  parseDayKey,
} from '../../src/features/mvp/calendar-utils';
import { cancelCalendarSlot } from '../../src/features/mvp/repository';
import { useOwnerCalendar } from '../../src/features/mvp/useOwnerCalendar';
import { useOwnerSlotDetail } from '../../src/features/mvp/useOwnerSlotDetail';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';
import type { CalendarSlotEventRecord, SlotStatus } from '../../src/features/mvp/types';
import { useAuth } from '../../src/firebase/useAuth';

const hourWidth = 96;
const timelineHeight = 164;
const hours = Array.from({ length: 24 }, (_, index) => index);

function formatTime(value: Date | null) {
  if (!value) {
    return 'Zeit nicht verfuegbar';
  }

  return value.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return 'Zeitpunkt nicht verfuegbar';
  }

  return value.toLocaleString('de-DE');
}

function formatSlotStatus(status: SlotStatus) {
  switch (status) {
    case 'booked':
      return 'gebucht';
    case 'cancelled':
      return 'storniert';
    default:
      return 'offen';
  }
}

function getFooterStatusHint(status: SlotStatus | null, hasAppointment: boolean) {
  if (!status) {
    return 'Waehle einen Slot fuer Aktionen';
  }

  if (status === 'cancelled') {
    return 'Dieser Slot wurde bereits storniert';
  }

  if (status === 'booked' || hasAppointment) {
    return 'Gebuchte Slots werden spaeter separat behandelt';
  }

  return 'Dieser Slot kann storniert werden';
}

function formatEventText(event: CalendarSlotEventRecord) {
  const actorLabel =
    event.actorRole === 'owner'
      ? 'Kalenderinhaber'
      : event.actorRole === 'contact'
        ? 'Kontakt'
        : 'System';

  switch (event.type) {
    case 'booked':
      return `Gebucht durch ${event.targetEmail ?? actorLabel}`;
    case 'assigned_by_owner':
      return `Manuell vergeben an ${event.targetEmail ?? 'Kontakt'}`;
    case 'cancelled_by_owner':
      return `Durch ${actorLabel} storniert`;
    case 'released':
      return 'Wieder freigegeben';
    case 'updated':
      return 'Slot aktualisiert';
    default:
      return `Slot erstellt durch ${actorLabel}`;
  }
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export default function CalendarDayScreen() {
  const params = useLocalSearchParams<{ date?: string | string[]; slotId?: string | string[] }>();
  const rawDate = Array.isArray(params.date) ? params.date[0] : params.date ?? '';
  const initialSlotId = Array.isArray(params.slotId) ? params.slotId[0] : params.slotId ?? null;
  const selectedDate = parseDayKey(rawDate);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const timelineScrollRef = useRef<ScrollView>(null);
  const { user, loading: authLoading } = useAuth();
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(calendar?.id ?? null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(initialSlotId);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [deactivatingSlotId, setDeactivatingSlotId] = useState<string | null>(null);

  const daySlots = useMemo(
    () => (selectedDate ? getSlotsForDay(slots, selectedDate) : []),
    [selectedDate, slots]
  );

  useEffect(() => {
    if (!daySlots.length) {
      setSelectedSlotId(null);
      return;
    }

    if (!selectedSlotId) {
      if (!initialSlotId) {
        return;
      }

      const slotFromRoute = daySlots.find((slot) => slot.id === initialSlotId)?.id ?? null;
      setSelectedSlotId(slotFromRoute);
      return;
    }

    const hasSelectedSlot = daySlots.some((slot) => slot.id === selectedSlotId);

    if (!hasSelectedSlot) {
      setSelectedSlotId(null);
    }
  }, [daySlots, initialSlotId, selectedSlotId]);

  const {
    slot: selectedSlot,
    events,
    loading: slotDetailLoading,
    error: slotDetailError,
  } = useOwnerSlotDetail(calendar?.id ?? null, selectedSlotId);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const now = new Date();
    const currentMinutes = isSameDay(now, selectedDate) ? getMinutesSinceStartOfDay(now) : 0;
    const defaultOffset = Math.max((currentMinutes / 60) * hourWidth - screenWidth * 0.35, 0);

    const timeout = setTimeout(() => {
      timelineScrollRef.current?.scrollTo({ x: defaultOffset, animated: false });
    }, 0);

    return () => clearTimeout(timeout);
  }, [screenWidth, selectedDate]);

  if (!selectedDate) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black', marginBottom: 16 }}>Das gewaehlte Datum ist ungueltig.</Text>
        <Link href="/my-calendar">
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>Zurueck zum Kalender</Text>
        </Link>
      </View>
    );
  }

  const handleDeactivateSlot = async () => {
    if (!calendar || !user || !selectedSlot) {
      return;
    }

    Alert.alert(
      'Slot stornieren',
      'Der ausgewaehlte Slot wird auf storniert gesetzt und in der Historie vermerkt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Stornieren',
          style: 'destructive',
          onPress: async () => {
            setDeactivatingSlotId(selectedSlot.id);
            setActionMessage(null);

            try {
              const result = await cancelCalendarSlot({
                calendarId: calendar.id,
                slotId: selectedSlot.id,
                actorUid: user.uid,
              });

              setActionMessage(
                result === 'already_cancelled'
                  ? 'Der Slot war bereits storniert.'
                  : 'Slot wurde storniert.'
              );
            } catch (nextError) {
              setActionMessage(
                nextError instanceof Error ? nextError.message : 'Slot konnte nicht storniert werden.'
              );
            } finally {
              setDeactivatingSlotId(null);
            }
          },
        },
      ]
    );
  };

  if (authLoading || loading || slotsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>Loading...</Text>
      </View>
    );
  }

  const historyPanelMaxHeight = Math.max(Math.min(screenHeight * 0.33, 260), 180);
  const selectedSlotCanDeactivate =
    selectedSlot?.status === 'available' && !selectedSlot.appointmentId;
  const timeRailWidth = hourWidth * 24;
  const footerStatusHint = getFooterStatusHint(
    selectedSlot?.status ?? null,
    Boolean(selectedSlot?.appointmentId)
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>
          {formatDayTitle(selectedDate)}
        </Text>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
          <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>Tageszeitstrahl</Text>

          <ScrollView
            ref={timelineScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ minWidth: timeRailWidth }}>
            <View style={{ width: timeRailWidth }}>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                {hours.map((hour) => (
                  <View
                    key={`hour-label-${hour}`}
                    style={{ width: hourWidth, borderRightWidth: 1, borderColor: 'black' }}>
                    <Text style={{ color: 'black' }}>{`${`${hour}`.padStart(2, '0')}:00`}</Text>
                  </View>
                ))}
              </View>

              <View
                style={{
                  position: 'relative',
                  height: timelineHeight,
                  borderWidth: 1,
                  borderColor: 'black',
                }}>
                {hours.map((hour) => (
                  <View
                    key={`hour-grid-${hour}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: hour * hourWidth,
                      width: 1,
                      backgroundColor: 'black',
                    }}
                  />
                ))}

                {daySlots.length ? (
                  daySlots.map((slot) => {
                    if (!slot.startsAt || !slot.endsAt) {
                      return null;
                    }

                    const left = (getMinutesSinceStartOfDay(slot.startsAt) / 60) * hourWidth;
                    const durationMinutes = Math.max(
                      (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60000,
                      30
                    );
                    const width = Math.max((durationMinutes / 60) * hourWidth, 84);
                    const isSelected = selectedSlotId === slot.id;

                    return (
                      <Pressable
                        key={slot.id}
                        onPress={() => {
                          setSelectedSlotId(slot.id);
                          setActionMessage(null);
                        }}
                        style={{
                          position: 'absolute',
                          left,
                          top: 28,
                          width,
                          minHeight: 92,
                          padding: 10,
                          borderWidth: 2,
                          borderColor: isSelected ? 'black' : '#666666',
                          backgroundColor: slot.status === 'cancelled' ? '#f1f1f1' : 'white',
                        }}>
                        <Text style={{ color: 'black', marginBottom: 6 }}>
                          {formatTime(slot.startsAt)} - {formatTime(slot.endsAt)}
                        </Text>
                        <Text style={{ color: 'black', marginBottom: 4 }}>
                          {formatSlotStatus(slot.status)}
                        </Text>
                        <Text style={{ color: 'black', fontSize: 12 }}>
                          {slot.appointmentId ? 'Mit Termin verknuepft' : 'Noch nicht gebucht'}
                        </Text>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'black' }}>
                      Fuer diesen Tag sind noch keine Slots vorhanden.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {slotsError ? <Text style={{ color: 'black', marginTop: 12 }}>{slotsError}</Text> : null}
          {error ? <Text style={{ color: 'black', marginTop: 12 }}>{error}</Text> : null}
        </View>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16 }}>
          <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>
            Aktivitaet und Slot-Status
          </Text>

          {selectedSlot ? (
            <>
              <Text style={{ color: 'black', marginBottom: 6 }}>
                Zeit: {formatTime(selectedSlot.startsAt)} - {formatTime(selectedSlot.endsAt)}
              </Text>
              <Text style={{ color: 'black', marginBottom: 6 }}>
                Status: {formatSlotStatus(selectedSlot.status)}
              </Text>
              <Text style={{ color: 'black', marginBottom: 12 }}>
                {selectedSlot.appointmentId
                  ? 'Dieser Slot ist bereits mit einem Termin verknuepft.'
                  : 'Dieser Slot ist aktuell noch keinem Termin zugeordnet.'}
              </Text>
            </>
          ) : (
            <Text style={{ color: 'black', marginBottom: 12 }}>
              Waehle oben einen Slot aus, um Details und Historie zu sehen.
            </Text>
          )}

          <ScrollView style={{ maxHeight: historyPanelMaxHeight }}>
            {selectedSlot ? (
              slotDetailLoading ? (
                <Text style={{ color: 'black' }}>Historie wird geladen...</Text>
              ) : events.length ? (
                events.map((event) => (
                  <View
                    key={event.id}
                    style={{
                      borderTopWidth: 1,
                      borderColor: 'black',
                      paddingTop: 12,
                      marginTop: 12,
                    }}>
                    <Text style={{ color: 'black', marginBottom: 4 }}>{formatEventText(event)}</Text>
                    <Text style={{ color: 'black', marginBottom: 4 }}>
                      Zeitpunkt: {formatDateTime(event.createdAt)}
                    </Text>
                    {event.statusAfter ? (
                      <Text style={{ color: 'black', marginBottom: 4 }}>
                        Status danach: {formatSlotStatus(event.statusAfter)}
                      </Text>
                    ) : null}
                    {event.targetEmail ? (
                      <Text style={{ color: 'black', marginBottom: 4 }}>
                        Bezug: {event.targetEmail}
                      </Text>
                    ) : null}
                    {event.note ? <Text style={{ color: 'black' }}>Hinweis: {event.note}</Text> : null}
                  </View>
                ))
              ) : (
                <Text style={{ color: 'black' }}>
                  Fuer den ausgewaehlten Slot ist bisher nur der aktuelle Zustand vorhanden.
                </Text>
              )
            ) : (
              <Text style={{ color: 'black' }}>
                Noch kein Slot ausgewaehlt. Die Historie erscheint nach der Auswahl direkt hier.
              </Text>
            )}
          </ScrollView>

          {slotDetailError ? <Text style={{ color: 'black', marginTop: 12 }}>{slotDetailError}</Text> : null}
          {actionMessage ? <Text style={{ color: 'black', marginTop: 12 }}>{actionMessage}</Text> : null}
        </View>

        <View style={{ alignItems: 'flex-end', marginTop: 16 }}>
          <Link href="/my-calendar">
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
              Zurueck zur Monatsansicht
            </Text>
          </Link>
        </View>
      </ScrollView>

      <View
        style={{
          borderTopWidth: 1,
          borderColor: 'black',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: 'white',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <Link href={`/my-calendar/create-slot?date=${rawDate}`} asChild>
          <Pressable style={{ paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'black' }}>
            <Text style={{ color: 'black' }}>Slot hinzufuegen</Text>
          </Pressable>
        </Link>

        <View style={{ alignItems: 'flex-end' }}>
          {selectedSlotCanDeactivate ? (
            <Pressable
              onPress={handleDeactivateSlot}
              disabled={deactivatingSlotId === selectedSlot?.id}
              style={{ paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'black' }}>
              <Text style={{ color: 'black' }}>
                {deactivatingSlotId === selectedSlot?.id ? 'Bearbeite...' : 'Slot stornieren'}
              </Text>
            </Pressable>
          ) : (
            <View style={{ paddingVertical: 10, paddingHorizontal: 12, opacity: 0.55 }}>
              <Text style={{ color: 'black' }}>Keine Aktion verfuegbar</Text>
            </View>
          )}
          <Text style={{ color: 'black', marginTop: 8, maxWidth: 220, textAlign: 'right' }}>
            {footerStatusHint}
          </Text>
        </View>
      </View>
    </View>
  );
}
