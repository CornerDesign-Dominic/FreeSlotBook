import { useEffect, useMemo, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { getDayKey } from '../../src/features/mvp/calendar-utils';
import { bookSharedCalendarSlot } from '../../src/features/mvp/repository';
import { useCalendar } from '../../src/features/mvp/useCalendar';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';
import { useAuth } from '../../src/firebase/useAuth';
import { LanguageSwitcher } from '../../src/i18n/language-switcher';
import { useTranslation } from '../../src/i18n/provider';

export default function SharedCalendarScreen() {
  const params = useLocalSearchParams<{ calendarId?: string | string[] }>();
  const { t, language } = useTranslation();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const calendarId = Array.isArray(params.calendarId) ? params.calendarId[0] : params.calendarId ?? null;
  const { user, loading: authLoading } = useAuth();
  const { calendar, loading: calendarLoading, error: calendarError } = useCalendar(calendarId);
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(calendarId);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const formatDateTime = (value: Date | null) => {
    if (!value) {
      return t('day.dateTimeUnavailable');
    }

    return value.toLocaleString(locale);
  };

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

  if (authLoading || calendarLoading || slotsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
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
      setMessage(t('shared.success'));
      setSelectedSlotId(null);
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('shared.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <LanguageSwitcher />
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>{t('shared.title')}</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        {calendar ? (
          <>
            <Text style={{ color: 'black', marginBottom: 8 }}>
              {t('shared.owner', { email: calendar.ownerEmail })}
            </Text>
            <Text style={{ color: 'black', marginBottom: 8 }}>
              {t('shared.calendarId', { id: calendar.id })}
            </Text>
            <Text style={{ color: 'black' }}>
              {t('dashboard.visibilityValue', { visibility: calendar.visibility })}
            </Text>
          </>
        ) : (
          <Text style={{ color: 'black' }}>{t('shared.notLoaded')}</Text>
        )}

        {calendarError ? <Text style={{ color: 'black', marginTop: 12 }}>{calendarError}</Text> : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>{t('shared.freeSlots')}</Text>
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
              <Text style={{ color: 'black', marginBottom: 4 }}>{t('shared.statusOpen')}</Text>
              {slot.startsAt ? (
                <Text style={{ color: 'black' }}>
                  {t('public.day', { day: getDayKey(slot.startsAt) })}
                </Text>
              ) : null}
            </Pressable>
          ))
        ) : (
          <Text style={{ color: 'black' }}>{t('shared.noSlots')}</Text>
        )}

        {slotsError ? <Text style={{ color: 'black', marginTop: 12 }}>{slotsError}</Text> : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>{t('shared.bookingTitle')}</Text>
        {selectedSlot ? (
          <>
            <Text style={{ color: 'black', marginBottom: 4 }}>
              {t('shared.selectedSlot', {
                range: `${formatDateTime(selectedSlot.startsAt)} bis ${formatDateTime(selectedSlot.endsAt)}`,
              })}
            </Text>
            <Text style={{ color: 'black', marginBottom: 12 }}>
              {calendar?.ownerId === user?.uid ? t('shared.ownSlotsLocked') : t('shared.canBook')}
            </Text>
          </>
        ) : (
          <Text style={{ color: 'black', marginBottom: 12 }}>{t('shared.selectSlot')}</Text>
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
            {submitting ? t('shared.submitting') : t('shared.submit')}
          </Text>
        </Pressable>

        {message ? <Text style={{ color: 'black', marginTop: 12 }}>{message}</Text> : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Link href="/(tabs)">
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {t('shared.backToDashboard')}
          </Text>
        </Link>
      </View>
    </ScrollView>
  );
}
