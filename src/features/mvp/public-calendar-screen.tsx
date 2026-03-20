import { useEffect, useMemo, useState } from 'react';
import { Link, Redirect } from 'expo-router';
import type { Href } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { getDayKey } from './calendar-utils';
import { bookPublicCalendarSlot } from './repository';
import { PRIVACY_VERSION, TERMS_VERSION } from './types';
import { useCalendar } from './useCalendar';
import { useOwnerSlots } from './useOwnerSlots';
import { useTranslation } from '@/src/i18n/provider';

function formatDateTime(value: Date | null, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  return value.toLocaleString(locale);
}

function formatDate(value: Date | null, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  return value.toLocaleDateString(locale);
}

function formatTimeRange(startsAt: Date | null, endsAt: Date | null, locale: string, fallback: string) {
  if (!startsAt || !endsAt) {
    return fallback;
  }

  return `${startsAt.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endsAt.toLocaleTimeString(locale, {
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
  const { t, language } = useTranslation();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
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
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (calendar?.visibility === 'public' && calendar.publicSlug) {
    const canonicalPath = `/${calendar.publicSlug}`;

    if (props.currentPublicPath !== canonicalPath) {
      return <Redirect href={canonicalPath as Href} />;
    }
  }

  if (!calendar || calendar.visibility !== 'public') {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black', marginBottom: 12 }}>{t('public.notPublic')}</Text>
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
      setMessage(t('public.validationSelectSlot'));
      return;
    }

    if (!participantName.trim()) {
      setMessage(t('public.validationName'));
      return;
    }

    if (!participantEmail.trim()) {
      setMessage(t('public.validationEmail'));
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
      setMessage(t('public.validationSelectSlot'));
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
        requestAccountCreation ? t('public.bookedInvite') : t('public.bookedMail')
      );
      setSelectedSlotId(null);
      setParticipantName('');
      setParticipantEmail('');
      setRequestAccountCreation(false);
      setTermsAccepted(false);
      setPrivacyAccepted(false);
      setShowConsentModal(false);
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('public.bookError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>{t('public.title')}</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', marginBottom: 8 }}>{t('public.intro')}</Text>
        <Text style={{ color: 'black' }}>
          {t('dashboard.visibilityValue', { visibility: calendar.visibility })}
        </Text>
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>{t('public.freeSlots')}</Text>
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
                {formatDateTime(slot.startsAt, locale, t('day.dateTimeUnavailable'))} - {formatDateTime(slot.endsAt, locale, t('day.dateTimeUnavailable'))}
              </Text>
              {slot.startsAt ? (
                <Text style={{ color: 'black' }}>
                  {t('public.day', { day: getDayKey(slot.startsAt) })}
                </Text>
              ) : null}
            </Pressable>
          ))
        ) : (
          <Text style={{ color: 'black' }}>{t('public.noFreeSlots')}</Text>
        )}

        {slotsError ? <Text style={{ color: 'black', marginTop: 12 }}>{slotsError}</Text> : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>{t('public.bookSlot')}</Text>
        {selectedSlot ? (
          <Text style={{ color: 'black', marginBottom: 12 }}>
            {t('public.selectedSlot', {
              range: `${formatDateTime(selectedSlot.startsAt, locale, t('day.dateTimeUnavailable'))} - ${formatDateTime(selectedSlot.endsAt, locale, t('day.dateTimeUnavailable'))}`,
            })}
          </Text>
        ) : (
          <Text style={{ color: 'black', marginBottom: 12 }}>{t('public.selectSlot')}</Text>
        )}

        <Text style={{ color: 'black', marginBottom: 8 }}>{t('public.nameLabel')}</Text>
        <TextInput
          value={participantName}
          onChangeText={setParticipantName}
          placeholder={t('public.namePlaceholder')}
          style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 12 }}
        />

        <Text style={{ color: 'black', marginBottom: 8 }}>{t('public.emailLabel')}</Text>
        <TextInput
          value={participantEmail}
          onChangeText={setParticipantEmail}
          placeholder={t('public.emailPlaceholder')}
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
          <Text style={{ color: 'black' }}>{t('public.requestAccount')}</Text>
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
          <Text style={{ color: 'black' }}>
            {submitting ? t('public.submitting') : t('public.submit')}
          </Text>
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
            {t('public.loginWithAccount')}
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
            <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>{t('public.successTitle')}</Text>

            {successSummary ? (
              <>
                <Text style={{ color: 'black', marginBottom: 8 }}>
                  {t('public.successDate', {
                    date: formatDate(successSummary.startsAt, locale, t('common.date')),
                  })}
                </Text>
                <Text style={{ color: 'black', marginBottom: 8 }}>
                  {t('public.successTime', {
                    time: formatTimeRange(
                      successSummary.startsAt,
                      successSummary.endsAt,
                      locale,
                      t('common.time')
                    ),
                  })}
                </Text>
                <Text style={{ color: 'black', marginBottom: 8 }}>
                  {t('public.successCalendar', { calendar: successSummary.ownerEmail })}
                </Text>
                <Text style={{ color: 'black', marginBottom: 16 }}>
                  {t('public.successEmail', { email: successSummary.participantEmail })}
                </Text>

                {successSummary.requestAccountCreation ? (
                  <Text style={{ color: 'black', marginBottom: 16 }}>
                    {t('public.successInviteInfo')}
                  </Text>
                ) : null}

                <View style={{ borderTopWidth: 1, borderColor: 'black', paddingTop: 16, marginBottom: 16 }}>
                  {successSummary.requestAccountCreation ? (
                    <Text style={{ color: 'black' }}>{t('public.successInviteHint')}</Text>
                  ) : (
                    <>
                      <Text style={{ color: 'black', marginBottom: 8 }}>
                        {t('public.successAccountHint')}
                      </Text>
                      <Link href="/register">
                        <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                          {t('public.successAccountLink')}
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
              <Text style={{ color: 'black' }}>{t('public.successClose')}</Text>
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
            <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>{t('public.confirmTitle')}</Text>
            <Text style={{ color: 'black', marginBottom: 16 }}>{t('public.confirmBody')}</Text>

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
              <Text style={{ color: 'black', flex: 1 }}>{t('public.acceptTerms')}</Text>
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
              <Text style={{ color: 'black', flex: 1 }}>{t('public.acceptPrivacy')}</Text>
            </Pressable>

            <View style={{ marginBottom: 16 }}>
              <Link href="/agb" style={{ marginBottom: 8 }}>
                <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                  {t('public.readTerms', { version: TERMS_VERSION })}
                </Text>
              </Link>
              <Link href="/datenschutz">
                <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                  {t('public.readPrivacy', { version: PRIVACY_VERSION })}
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
                <Text style={{ color: 'black' }}>{t('common.cancel')}</Text>
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
                  {submitting ? t('public.submitting') : t('public.confirmSubmit')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
