import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  buildMonthGrid,
  formatMonthTitle,
  getSlotCountsByDay,
} from '../../src/features/mvp/calendar-utils';
import {
  updateCalendarNotificationSettings,
  updateCalendarVisibility,
} from '../../src/features/mvp/repository';
import { useOwnerCalendar } from '../../src/features/mvp/useOwnerCalendar';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';
import { useAuth } from '../../src/firebase/useAuth';

const weekDayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function MyCalendarScreen() {
  const { user, loading: authLoading } = useAuth();
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(calendar?.id ?? null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [togglingNotifications, setTogglingNotifications] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);
  const [publicSlug, setPublicSlug] = useState('');

  useEffect(() => {
    setPublicSlug(calendar?.publicSlug ?? '');
  }, [calendar?.publicSlug]);

  if (authLoading || loading || slotsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>Loading...</Text>
      </View>
    );
  }

  const monthGrid = buildMonthGrid(visibleMonth);
  const slotCountsByDay = getSlotCountsByDay(slots);

  const goToPreviousMonth = () => {
    setVisibleMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setVisibleMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleToggleNewSlotsNotification = async () => {
    if (!calendar) {
      return;
    }

    setTogglingNotifications(true);
    setSettingsMessage(null);

    try {
      await updateCalendarNotificationSettings({
        calendarId: calendar.id,
        notifyOnNewSlotsAvailable: !calendar.notifyOnNewSlotsAvailable,
      });
      setSettingsMessage('Kalendereinstellung wurde aktualisiert.');
    } catch (nextError) {
      setSettingsMessage(
        nextError instanceof Error ? nextError.message : 'Einstellung konnte nicht aktualisiert werden.'
      );
    } finally {
      setTogglingNotifications(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!calendar) {
      return;
    }

    setTogglingVisibility(true);
    setSettingsMessage(null);

    try {
      await updateCalendarVisibility({
        calendarId: calendar.id,
        ownerId: calendar.ownerId,
        visibility: calendar.visibility === 'public' ? 'restricted' : 'public',
        publicSlug,
      });
      setSettingsMessage('Kalendersichtbarkeit wurde aktualisiert.');
    } catch (nextError) {
      setSettingsMessage(
        nextError instanceof Error
          ? nextError.message
          : 'Kalendersichtbarkeit konnte nicht aktualisiert werden.'
      );
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleSavePublicSlug = async () => {
    if (!calendar) {
      return;
    }

    setSavingSlug(true);
    setSettingsMessage(null);

    try {
      await updateCalendarVisibility({
        calendarId: calendar.id,
        ownerId: calendar.ownerId,
        visibility: calendar.visibility,
        publicSlug,
      });
      setSettingsMessage('Oeffentlicher Slug wurde aktualisiert.');
    } catch (nextError) {
      setSettingsMessage(
        nextError instanceof Error ? nextError.message : 'Oeffentlicher Slug konnte nicht gespeichert werden.'
      );
    } finally {
      setSavingSlug(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>Mein Kalender</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        {calendar ? (
          <>
            <Text style={{ color: 'black', marginBottom: 8 }}>Kalender-ID: {calendar.id}</Text>
            <Text style={{ color: 'black', marginBottom: 8 }}>Inhaber: {calendar.ownerEmail}</Text>
            <Text style={{ color: 'black', marginBottom: 8 }}>Sichtbarkeit: {calendar.visibility}</Text>
            <Text style={{ color: 'black', marginBottom: 8 }}>Oeffentlicher Slug</Text>
            <TextInput
              value={publicSlug}
              onChangeText={setPublicSlug}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="z. B. dominic-franz"
              style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 8 }}
            />
            <Text style={{ color: 'black', marginBottom: 8 }}>
              Erlaubt: a-z, 0-9 und Bindestriche. Laenge 3 bis 30 Zeichen. Der Slug wird fuer deine
              oeffentliche URL verwendet.
            </Text>
            <Pressable onPress={handleSavePublicSlug} disabled={savingSlug}>
              <Text style={{ color: 'black', textDecorationLine: 'underline', marginBottom: 12 }}>
                {savingSlug ? 'Speichere Slug...' : 'Slug speichern'}
              </Text>
            </Pressable>
            <Text style={{ color: 'black', marginBottom: 8 }}>
              Neue freie Slots benachrichtigen: {calendar.notifyOnNewSlotsAvailable ? 'aktiv' : 'inaktiv'}
            </Text>
            <Pressable onPress={handleToggleVisibility} disabled={togglingVisibility}>
              <Text style={{ color: 'black', textDecorationLine: 'underline', marginBottom: 12 }}>
                {togglingVisibility
                  ? 'Aktualisiere Sichtbarkeit...'
                  : calendar.visibility === 'public'
                    ? 'Kalender wieder eingeschraenkt machen'
                    : 'Kalender oeffentlich machen'}
              </Text>
            </Pressable>
            {calendar.visibility === 'public' && calendar.publicSlug ? (
              <>
                <Text style={{ color: 'black', marginBottom: 8 }}>
                  Oeffentlicher Link: /{calendar.publicSlug}
                </Text>
                <Link href={`/${calendar.publicSlug}`} asChild>
                  <Pressable style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
                    <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                      Oeffentliche Buchungsansicht oeffnen
                    </Text>
                  </Pressable>
                </Link>
              </>
            ) : calendar.visibility === 'public' ? (
              <Text style={{ color: 'black', marginBottom: 12 }}>
                Bitte hinterlege einen gueltigen Slug, damit dein Kalender oeffentlich erreichbar ist.
              </Text>
            ) : null}
            <Pressable onPress={handleToggleNewSlotsNotification} disabled={togglingNotifications}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                {togglingNotifications
                  ? 'Aktualisiere...'
                  : calendar.notifyOnNewSlotsAvailable
                    ? 'Benachrichtigung deaktivieren'
                    : 'Benachrichtigung aktivieren'}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: 'black' }}>Dein persoenlicher Kalender ist noch nicht verfuegbar.</Text>
        )}

        {error ? <Text style={{ color: 'black', marginTop: 12 }}>{error}</Text> : null}
        {settingsMessage ? <Text style={{ color: 'black', marginTop: 12 }}>{settingsMessage}</Text> : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Link href="/my-calendar/create-slot" asChild>
          <Pressable style={{ marginBottom: 16 }}>
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
              Slots erstellen
            </Text>
          </Pressable>
        </Link>

        <Link href="/my-calendar/access" asChild>
          <Pressable style={{ marginBottom: 16 }}>
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
              Freigaben verwalten
            </Text>
          </Pressable>
        </Link>

        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Pressable onPress={goToPreviousMonth}>
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>Vorheriger Monat</Text>
          </Pressable>
          <Text style={{ color: 'black', fontSize: 18 }}>{formatMonthTitle(visibleMonth)}</Text>
          <Pressable onPress={goToNextMonth}>
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>Naechster Monat</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {weekDayLabels.map((label) => (
            <View key={label} style={{ flex: 1 }}>
              <Text style={{ color: 'black', textAlign: 'center' }}>{label}</Text>
            </View>
          ))}
        </View>

        {monthGrid.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={{ flexDirection: 'row' }}>
            {week.map((day) => {
              const slotCount = slotCountsByDay[day.key] ?? 0;

              return (
                <Link key={day.key} href={`/my-calendar/${day.key}`} asChild>
                  <Pressable
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: 'black',
                      minHeight: 72,
                      padding: 8,
                      backgroundColor: day.isToday ? '#f3f3f3' : 'white',
                      opacity: day.isCurrentMonth ? 1 : 0.45,
                    }}>
                    <Text style={{ color: 'black', marginBottom: 6 }}>{day.date.getDate()}</Text>
                    {slotCount ? (
                      <Text style={{ color: 'black', fontSize: 12 }}>
                        {slotCount} Slot{slotCount === 1 ? '' : 's'}
                      </Text>
                    ) : null}
                  </Pressable>
                </Link>
              );
            })}
          </View>
        ))}

        <Text style={{ color: 'black', marginTop: 12 }}>
          Tage mit vorhandenen Slots sind direkt aus Firestore markiert.
        </Text>

        {slotsError ? <Text style={{ color: 'black', marginTop: 12 }}>{slotsError}</Text> : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link href="/(tabs)" style={{ marginTop: 16 }}>
          <Text style={{ color: 'black' }}>Zurueck zum Dashboard</Text>
        </Link>
      </View>
    </ScrollView>
  );
}
