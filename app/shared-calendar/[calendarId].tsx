import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { getDayKey } from '../../src/features/mvp/calendar-utils';
import { AppScreenHeader } from '../../src/components/app-screen-header';
import { bookSharedCalendarSlot } from '../../src/features/mvp/repository';
import { useCalendar } from '../../src/features/mvp/useCalendar';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';
import { useAuth } from '../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { theme, uiStyles } from '../../src/theme/ui';

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
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
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
    <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.content}>
      <AppScreenHeader title={t('shared.title')} />

      <View style={uiStyles.panel}>
        {calendar ? (
          <>
            <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
              {t('shared.owner', { email: calendar.ownerEmail })}
            </Text>
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
              {t('shared.calendarId', { id: calendar.id })}
            </Text>
            <Text style={uiStyles.secondaryText}>
              {t('dashboard.visibilityValue', { visibility: calendar.visibility })}
            </Text>
          </>
        ) : (
          <Text style={uiStyles.secondaryText}>{t('shared.notLoaded')}</Text>
        )}

        {calendarError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{calendarError}</Text> : null}
      </View>

      <View style={uiStyles.panel}>
        <Text style={uiStyles.sectionTitle}>{t('shared.freeSlots')}</Text>
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
                borderColor: theme.colors.border,
                paddingTop: theme.spacing[12],
                marginTop: theme.spacing[12],
                backgroundColor: selectedSlotId === slot.id ? theme.colors.accentSoft : theme.colors.surface,
                borderRadius: theme.radius.small,
              }}>
              <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>
                {formatDateTime(slot.startsAt)} bis {formatDateTime(slot.endsAt)}
              </Text>
              <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[4] }]}>{t('shared.statusOpen')}</Text>
              {slot.startsAt ? (
                <Text style={uiStyles.metaText}>
                  {t('public.day', { day: getDayKey(slot.startsAt) })}
                </Text>
              ) : null}
            </Pressable>
          ))
        ) : (
          <Text style={uiStyles.secondaryText}>{t('shared.noSlots')}</Text>
        )}

        {slotsError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{slotsError}</Text> : null}
      </View>

      <View style={uiStyles.panel}>
        <Text style={uiStyles.sectionTitle}>{t('shared.bookingTitle')}</Text>
        {selectedSlot ? (
          <>
            <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>
              {t('shared.selectedSlot', {
                range: `${formatDateTime(selectedSlot.startsAt)} bis ${formatDateTime(selectedSlot.endsAt)}`,
              })}
            </Text>
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
              {calendar?.ownerId === user?.uid ? t('shared.ownSlotsLocked') : t('shared.canBook')}
            </Text>
          </>
        ) : (
          <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>{t('shared.selectSlot')}</Text>
        )}

        <Pressable
          onPress={handleBookSlot}
          disabled={!canBook || submitting}
          style={[uiStyles.outlineAction, { opacity: !canBook || submitting ? 0.55 : 1 }]}>
          <Text style={uiStyles.buttonText}>
            {submitting ? t('shared.submitting') : t('shared.submit')}
          </Text>
        </Pressable>

        {message ? <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[12] }]}>{message}</Text> : null}
      </View>

    </ScrollView>
  );
}
