import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { useOwnerCalendar } from '@/src/domain/useOwnerCalendar';
import { useOwnerSlotDetail } from '@/src/domain/useOwnerSlotDetail';
import type { CalendarSlotEventRecord, SlotStatus } from '@/src/domain/types';
import { useAuth } from '@/src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

export default function SlotHistoryScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const params = useLocalSearchParams<{ slotId?: string | string[]; date?: string | string[] }>();
  const slotId = Array.isArray(params.slotId) ? params.slotId[0] ?? null : params.slotId ?? null;
  const rawDate = Array.isArray(params.date) ? params.date[0] ?? null : params.date ?? null;
  const { calendar, loading: calendarLoading } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const {
    slot,
    events,
    loading: slotDetailLoading,
    error: slotDetailError,
  } = useOwnerSlotDetail(calendar?.id ?? null, slotId);

  const formatDateTime = (value: Date | null) => {
    if (!value) {
      return t('day.dateTimeUnavailable');
    }

    return value.toLocaleString(locale);
  };

  const formatSlotStatus = (status: SlotStatus) => {
    switch (status) {
      case 'inactive':
        return t('day.statusInactive');
      case 'booked':
        return t('day.statusBooked');
      default:
        return t('day.statusAvailable');
    }
  };

  const formatEventText = (event: CalendarSlotEventRecord) => {
    const actorLabel =
      event.actorRole === 'owner'
        ? t('day.eventActorOwner')
        : event.actorRole === 'member' || event.actorRole === 'guest'
          ? t('day.eventActorContact')
          : t('day.eventActorSystem');
    const target = event.targetEmail ?? actorLabel;

    switch (event.type) {
      case 'booked':
        return t('day.eventBooked', { actor: target });
      case 'assigned_by_owner':
        return t('day.eventAssigned', { actor: target });
      case 'set_inactive':
        return t('day.eventSetInactive');
      case 'cancelled_by_owner':
        return t('day.eventCancelled', { actor: actorLabel });
      case 'reactivated':
        return t('day.eventReactivated');
      case 'edited':
        return t('day.eventEdited');
      default:
        return t('day.eventCreated', { actor: actorLabel });
    }
  };

  if (authLoading || calendarLoading || slotDetailLoading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Slot Historie" />

      <View style={uiStyles.panel}>
        {slot ? (
          <View
            style={[
              uiStyles.subtlePanel,
              {
                marginBottom: theme.spacing[12],
                backgroundColor: theme.colors.surfaceSoft,
              },
            ]}>
            <Text style={[uiStyles.bodyText, { marginBottom: 6 }]}>
              {t('day.timeLabel', {
                time: `${slot.startsAt ? slot.startsAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : t('day.timeUnavailable')} - ${slot.endsAt ? slot.endsAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : t('day.timeUnavailable')}`,
              })}
            </Text>
            <Text style={uiStyles.secondaryText}>
              {t('day.statusLabel', { status: formatSlotStatus(slot.status) })}
            </Text>
          </View>
        ) : null}

        {events.length ? (
          events.map((event) => (
            <View
              key={event.id}
              style={{
                borderTopWidth: 1,
                borderColor: theme.colors.border,
                paddingTop: theme.spacing[12],
                marginTop: theme.spacing[12],
              }}>
              <Text style={[uiStyles.bodyText, { marginBottom: 4 }]}>{formatEventText(event)}</Text>
              <Text style={[uiStyles.secondaryText, { marginBottom: 4 }]}>
                {t('day.eventTime', { time: formatDateTime(event.createdAt) })}
              </Text>
              {event.statusAfter ? (
                <Text style={[uiStyles.secondaryText, { marginBottom: 4 }]}>
                  {t('day.eventStatusAfter', {
                    status: formatSlotStatus(event.statusAfter),
                  })}
                </Text>
              ) : null}
              {event.targetEmail ? (
                <Text style={[uiStyles.secondaryText, { marginBottom: 4 }]}>
                  {t('day.eventReference', { email: event.targetEmail })}
                </Text>
              ) : null}
              {event.note ? (
                <Text style={uiStyles.secondaryText}>
                  {t('day.eventNote', { note: event.note })}
                </Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={uiStyles.secondaryText}>
            {slotDetailError ? slotDetailError : t('day.historyEmpty')}
          </Text>
        )}
      </View>

      {rawDate ? (
        <Link
          href={{
            pathname: '/my-calendar/[date]',
            params: { date: rawDate, slotId: slotId ?? undefined },
          }}>
          <Text style={uiStyles.linkText}>{t('day.backToMonth')}</Text>
        </Link>
      ) : null}
    </ScrollView>
  );
}
