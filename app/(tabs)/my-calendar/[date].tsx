import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  formatDayTitle,
  getDayKey,
  getMinutesSinceStartOfDay,
  getSlotsForDay,
  parseDayKey,
} from '../../../src/features/mvp/calendar-utils';
import { AppScreenHeader } from '../../../src/components/app-screen-header';
import { CalendarNavigationHeader } from '../../../src/components/calendar-navigation-header';
import {
  assignCalendarSlotByOwner,
  cancelAppointmentByOwner,
  setCalendarSlotInactive,
  updateCalendarSlotAvailability,
} from '../../../src/features/mvp/repository';
import { useOwnerCalendar } from '../../../src/features/mvp/useOwnerCalendar';
import { useOwnerDaySlots } from '../../../src/features/mvp/useOwnerDaySlots';
import { useOwnerSlotDetail } from '../../../src/features/mvp/useOwnerSlotDetail';
import type { CalendarSlotEventRecord, SlotStatus } from '../../../src/features/mvp/types';
import { useAuth } from '../../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { theme, uiStyles, useBottomSafeContentStyle } from '../../../src/theme/ui';

const hourWidth = 96;
const timelineHeight = 164;
const hours = Array.from({ length: 24 }, (_, index) => index);

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function shiftDay(date: Date, offset: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + offset);
  return nextDate;
}

export default function CalendarDayScreen() {
  const { t, language } = useTranslation();
  const contentContainerStyle = useBottomSafeContentStyle({
    padding: theme.spacing[16],
  });
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const params = useLocalSearchParams<{ date?: string | string[]; slotId?: string | string[] }>();
  const rawDate = Array.isArray(params.date) ? params.date[0] : params.date ?? '';
  const routeDate = useMemo(() => parseDayKey(rawDate), [rawDate]);
  const routeDayKey = routeDate ? getDayKey(routeDate) : null;
  const initialSlotId = Array.isArray(params.slotId) ? params.slotId[0] : params.slotId ?? null;
  const [visibleDate, setVisibleDate] = useState<Date | null>(() => routeDate);
  const visibleDayKey = visibleDate ? getDayKey(visibleDate) : null;
  const previousRouteDayKeyRef = useRef<string | null>(routeDayKey);
  const previousVisibleDayKeyRef = useRef<string | null>(visibleDayKey);
  const timelineScrollRef = useRef<ScrollView>(null);
  const initialScrollDayKeyRef = useRef<string | null>(null);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const { user, loading: authLoading } = useAuth();
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const {
    slots,
    loading: slotsLoading,
    isRefreshing: slotsRefreshing,
    error: slotsError,
  } = useOwnerDaySlots(
    calendar?.id ?? null,
    visibleDate
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(initialSlotId);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [deactivatingSlotId, setDeactivatingSlotId] = useState<string | null>(null);
  const [updatingAvailabilitySlotId, setUpdatingAvailabilitySlotId] = useState<string | null>(null);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);
  const [cancellationModalVisible, setCancellationModalVisible] = useState(false);
  const [cancellationMessage, setCancellationMessage] = useState('');
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [assigningSlotId, setAssigningSlotId] = useState<string | null>(null);
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [assigneePhone, setAssigneePhone] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [timelineReadyDayKey, setTimelineReadyDayKey] = useState<string | null>(null);

  const daySlots = useMemo(
    () => (visibleDate ? getSlotsForDay(slots, visibleDate) : []),
    [slots, visibleDate]
  );

  const {
    slot: selectedSlot,
    events,
    loading: slotDetailLoading,
    error: slotDetailError,
  } = useOwnerSlotDetail(calendar?.id ?? null, selectedSlotId);

  useEffect(() => {
    if (!routeDate || !routeDayKey) {
      return;
    }

    if (previousRouteDayKeyRef.current === routeDayKey) {
      return;
    }

    previousRouteDayKeyRef.current = routeDayKey;
    setVisibleDate(routeDate);
    setSelectedSlotId(initialSlotId);
    setActionMessage(null);
    setHistoryExpanded(false);
  }, [initialSlotId, routeDate, routeDayKey]);

  useEffect(() => {
    if (previousVisibleDayKeyRef.current !== visibleDayKey) {
      setSelectedSlotId(null);
      setActionMessage(null);
      setHistoryExpanded(false);
      previousVisibleDayKeyRef.current = visibleDayKey;
    }
  }, [visibleDayKey]);

  useEffect(() => {
    if (!daySlots.length) {
      setSelectedSlotId(null);
      return;
    }

    if (selectedSlotId && daySlots.some((slot) => slot.id === selectedSlotId)) {
      return;
    }

    if (!selectedSlotId && initialSlotId && routeDayKey === visibleDayKey) {
      const slotFromRoute = daySlots.find((slot) => slot.id === initialSlotId)?.id ?? null;

      if (slotFromRoute) {
        setSelectedSlotId(slotFromRoute);
      }

      return;
    }

    setSelectedSlotId(null);
  }, [daySlots, initialSlotId, routeDayKey, selectedSlotId, visibleDayKey]);

  useEffect(() => {
    if (timelineReadyDayKey !== visibleDayKey || !visibleDate || !visibleDayKey) {
      return;
    }

    if (initialScrollDayKeyRef.current === visibleDayKey) {
      return;
    }

    const isTodayView = isSameDay(visibleDate, currentTime);
    const focusMinutes = isTodayView ? getMinutesSinceStartOfDay(currentTime) : 12 * 60;
    const defaultOffset = Math.max((focusMinutes / 60) * hourWidth - screenWidth * 0.35, 0);

    const animationFrame = requestAnimationFrame(() => {
      timelineScrollRef.current?.scrollTo({ x: defaultOffset, animated: false });
      initialScrollDayKeyRef.current = visibleDayKey;
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [currentTime, screenWidth, timelineReadyDayKey, visibleDate, visibleDayKey]);

  useEffect(() => {
    setTimelineReadyDayKey(null);
  }, [visibleDayKey]);

  useEffect(() => {
    if (!assignmentModalVisible) {
      setAssigneeName('');
      setAssigneeEmail('');
      setAssigneePhone('');
    }
  }, [assignmentModalVisible]);

  useEffect(() => {
    if (!cancellationModalVisible) {
      setCancellationMessage('');
    }
  }, [cancellationModalVisible]);

  useEffect(() => {
    setCurrentTime(new Date());

    if (!visibleDate || !isSameDay(visibleDate, new Date())) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [visibleDate]);

  const formatTime = (value: Date | null) => {
    if (!value) {
      return t('day.timeUnavailable');
    }

    return value.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
        : event.actorRole === 'contact'
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

  if (!routeDate || !visibleDate || !visibleDayKey) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[16] }]}>{t('day.invalidDate')}</Text>
        <Link href="/my-calendar">
          <Text style={uiStyles.linkText}>{t('nav.backToCalendar')}</Text>
        </Link>
      </View>
    );
  }

  const handleDeactivateSlot = async () => {
    if (!calendar || !user || !selectedSlot) {
      return;
    }

    const runDeactivation = async () => {
      setDeactivatingSlotId(selectedSlot.id);
      setActionMessage(null);

      try {
        const result = await setCalendarSlotInactive({
          calendarId: calendar.id,
          slotId: selectedSlot.id,
          actorUid: user.uid,
        });

        setActionMessage(
          result === 'already_inactive' ? t('day.inactiveAlready') : t('day.inactiveSuccess')
        );
      } catch (nextError) {
        setActionMessage(nextError instanceof Error ? nextError.message : t('day.inactiveError'));
      } finally {
        setDeactivatingSlotId(null);
      }
    };

    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      const confirmed = globalThis.confirm(
        `${t('day.setInactiveAlertTitle')}\n\n${t('day.setInactiveAlertBody')}`
      );

      if (!confirmed) {
        return;
      }

      void runDeactivation();
      return;
    }

    Alert.alert(t('day.setInactiveAlertTitle'), t('day.setInactiveAlertBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('day.setInactiveAlertConfirm'),
        onPress: () => {
          void runDeactivation();
        },
      },
    ]);
  };

  const handleToggleHold = async () => {
    if (!calendar || !user || !selectedSlot) {
      return;
    }

    setUpdatingAvailabilitySlotId(selectedSlot.id);
    setActionMessage(null);

    try {
      const nextStatus = selectedSlot.status === 'inactive' ? 'available' : 'inactive';
      const result = await updateCalendarSlotAvailability({
        calendarId: calendar.id,
        slotId: selectedSlot.id,
        actorUid: user.uid,
        nextStatus,
      });

      setActionMessage(
        result === 'already_set'
          ? nextStatus === 'inactive'
            ? t('day.inactiveAlready')
            : t('day.releaseAlready')
          : nextStatus === 'inactive'
            ? t('day.inactiveSuccess')
            : t('day.releaseSuccess')
      );
    } catch (nextError) {
      setActionMessage(nextError instanceof Error ? nextError.message : t('day.statusChangeError'));
    } finally {
      setUpdatingAvailabilitySlotId(null);
    }
  };

  const handleCancelAppointment = () => {
    if (!calendar || !user || !selectedSlot?.appointmentId) {
      return;
    }

    setActionMessage(null);
    setCancellationModalVisible(true);
  };

  const handleOpenAssignmentModal = () => {
    if (!selectedSlot || selectedSlot.status !== 'available' || selectedSlot.appointmentId) {
      return;
    }

    setActionMessage(null);
    setAssignmentModalVisible(true);
  };

  const handleAssignSlot = async () => {
    if (!calendar || !user || !selectedSlot) {
      return;
    }

    setAssigningSlotId(selectedSlot.id);
    setActionMessage(null);

    try {
      await assignCalendarSlotByOwner({
        calendarId: calendar.id,
        slotId: selectedSlot.id,
        ownerId: user.uid,
        participantName: assigneeName,
        participantEmail: assigneeEmail,
        participantPhone: assigneePhone,
      });
      setAssignmentModalVisible(false);
      setActionMessage(t('day.assignSuccess'));
    } catch (nextError) {
      setActionMessage(nextError instanceof Error ? nextError.message : t('day.assignError'));
    } finally {
      setAssigningSlotId(null);
    }
  };

  const runAppointmentCancellation = async (
    nextSlotStatus: 'available' | 'inactive',
    reopenAssignmentAfterwards = false
  ) => {
    if (!calendar || !user || !selectedSlot?.appointmentId) {
      return;
    }

    setCancellingAppointmentId(selectedSlot.appointmentId);
    setActionMessage(null);

    try {
      await cancelAppointmentByOwner({
        calendarId: calendar.id,
        appointmentId: selectedSlot.appointmentId,
        ownerId: user.uid,
        nextSlotStatus,
        cancellationMessage,
      });
      setCancellationModalVisible(false);
      setActionMessage(
        nextSlotStatus === 'available'
          ? t('day.cancelAppointmentAvailableSuccess')
          : t('day.cancelAppointmentInactiveSuccess')
      );

      if (reopenAssignmentAfterwards) {
        setAssignmentModalVisible(true);
      }
    } catch (nextError) {
      setActionMessage(
        nextError instanceof Error ? nextError.message : t('day.cancelAppointmentError')
      );
    } finally {
      setCancellingAppointmentId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const historyPanelMaxHeight = Math.max(Math.min(screenHeight * 0.33, 260), 180);
  const selectedSlotCanDeactivate =
    selectedSlot?.status === 'available' && !selectedSlot.appointmentId;
  const selectedSlotCanReactivate =
    selectedSlot?.status === 'inactive' && !selectedSlot.appointmentId;
  const selectedSlotCanEdit =
    Boolean(selectedSlot) && selectedSlot?.status !== 'booked' && !selectedSlot?.appointmentId;
  const selectedSlotCanAssign =
    selectedSlot?.status === 'available' && !selectedSlot?.appointmentId;
  const selectedSlotCanCancelAppointment =
    selectedSlot?.status === 'booked' && Boolean(selectedSlot?.appointmentId);
  const timeRailWidth = hourWidth * 24;
  const gridLineColor = theme.colors.border;
  const isTodayView = isSameDay(visibleDate, currentTime);
  const nowMarkerLeft = (getMinutesSinceStartOfDay(currentTime) / 60) * hourWidth;
  const timelineLoading = slotsLoading || slotsRefreshing;

  return (
    <View style={uiStyles.screen}>
      <ScrollView
        contentContainerStyle={contentContainerStyle}>
        <AppScreenHeader title="Slot-Kalender" />

        <View style={uiStyles.panel}>
          <CalendarNavigationHeader
            title={formatDayTitle(visibleDate, locale)}
            onPrevious={() => setVisibleDate((currentValue) => shiftDay(currentValue ?? visibleDate, -1))}
            onNext={() => setVisibleDate((currentValue) => shiftDay(currentValue ?? visibleDate, 1))}
          />

          <View
            style={[
              uiStyles.timelineShell,
              { backgroundColor: theme.colors.background, padding: theme.spacing[12] },
            ]}>
            <ScrollView
              ref={timelineScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onContentSizeChange={() => {
                setTimelineReadyDayKey((currentValue) =>
                  currentValue === visibleDayKey ? currentValue : visibleDayKey
                );
              }}
              contentContainerStyle={{ minWidth: timeRailWidth }}>
              <View style={{ width: timeRailWidth }}>
                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                  {hours.map((hour) => (
                    <View
                      key={`hour-label-${hour}`}
                      style={{ width: hourWidth, borderRightWidth: 1, borderColor: gridLineColor }}>
                      <Text style={[uiStyles.metaText, { fontSize: 12 }]}>{`${`${hour}`.padStart(2, '0')}:00`}</Text>
                    </View>
                  ))}
                </View>

                <View
                  style={{
                    position: 'relative',
                    height: timelineHeight,
                    borderWidth: 1,
                    borderColor: gridLineColor,
                    borderRadius: theme.radius.medium,
                    backgroundColor: theme.colors.surface,
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
                        backgroundColor: gridLineColor,
                        opacity: 0.7,
                      }}
                    />
                  ))}

                  {isTodayView ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: nowMarkerLeft,
                        width: 2,
                        backgroundColor: theme.colors.accent,
                        opacity: 0.7,
                      }}
                    />
                  ) : null}

                  {timelineLoading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
                    </View>
                  ) : daySlots.length ? (
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
                            borderWidth: isSelected ? 2 : 1,
                            borderColor:
                              isSelected
                                ? theme.colors.accent
                                : slot.status === 'inactive'
                                  ? theme.colors.textSecondary
                                  : theme.colors.border,
                            backgroundColor:
                              slot.status === 'inactive'
                                ? theme.colors.accentSoft
                                : slot.status === 'booked'
                                  ? theme.colors.surfaceSoft
                                  : theme.colors.surface,
                            borderRadius: theme.radius.medium,
                            shadowColor: isSelected ? theme.colors.shadow : 'transparent',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: isSelected ? 0.08 : 0,
                            shadowRadius: 12,
                            elevation: isSelected ? 1 : 0,
                          }}>
                          <Text style={[uiStyles.bodyText, { marginBottom: 6 }]}>
                            {formatTime(slot.startsAt)} - {formatTime(slot.endsAt)}
                          </Text>
                          <Text style={[uiStyles.secondaryText, { marginBottom: 4 }]}>
                            {formatSlotStatus(slot.status)}
                          </Text>
                          <Text style={uiStyles.metaText}>
                            {slot.appointmentId ? t('day.linkedAppointment') : t('day.noAppointment')}
                          </Text>
                        </Pressable>
                      );
                    })
                  ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={uiStyles.secondaryText}>{t('day.noSlots')}</Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>

          {slotsError ? (
            <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{slotsError}</Text>
          ) : null}
          {error ? (
            <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text>
          ) : null}
        </View>

        <View style={uiStyles.panel}>
          <Text style={uiStyles.sectionTitle}>{t('day.activity')}</Text>

          {selectedSlot ? (
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
                  time: `${formatTime(selectedSlot.startsAt)} - ${formatTime(selectedSlot.endsAt)}`,
                })}
              </Text>
              <Text style={[uiStyles.secondaryText, { marginBottom: 6 }]}>
                {t('day.statusLabel', { status: formatSlotStatus(selectedSlot.status) })}
              </Text>
              <Text style={[uiStyles.secondaryText, { marginBottom: 12 }]}>
                {selectedSlot.appointmentId ? t('day.hasAppointment') : t('day.hasNoAppointment')}
              </Text>
            </View>
          ) : null}

          {selectedSlot ? (
            <View style={{ marginTop: theme.spacing[4] }}>
              <Pressable
                onPress={() => setHistoryExpanded((currentValue) => !currentValue)}
                style={{ alignSelf: 'flex-start', paddingVertical: theme.spacing[4] }}>
                <Text style={uiStyles.linkText}>
                  {historyExpanded ? 'Historie ausblenden' : 'Historie anzeigen'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {historyExpanded ? (
            <ScrollView style={{ maxHeight: historyPanelMaxHeight, marginTop: theme.spacing[12] }}>
              {selectedSlot ? (
                slotDetailLoading ? (
                  <Text style={uiStyles.secondaryText}>{t('day.historyLoading')}</Text>
                ) : events.length ? (
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
                  <Text style={uiStyles.secondaryText}>{t('day.historyEmpty')}</Text>
                )
              ) : null}
            </ScrollView>
          ) : null}

          {slotDetailError ? (
            <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{slotDetailError}</Text>
          ) : null}
          {actionMessage ? (
            <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[12] }]}>{actionMessage}</Text>
          ) : null}
        </View>

        <View style={uiStyles.panel}>
          <View style={{ gap: theme.spacing[8] }}>
            {selectedSlot ? (
              <>
                {selectedSlotCanEdit ? (
              <Link href={`/new-slot?date=${visibleDayKey}&slotId=${selectedSlot?.id}`} asChild>
                <Pressable style={uiStyles.button}>
                  <Text style={uiStyles.buttonText}>{t('day.editSlot')}</Text>
                </Pressable>
              </Link>
                ) : null}
                {selectedSlotCanAssign ? (
              <Pressable onPress={handleOpenAssignmentModal} style={uiStyles.button}>
                <Text style={uiStyles.buttonText}>{t('day.assignSlot')}</Text>
              </Pressable>
                ) : null}
                {selectedSlotCanReactivate ? (
              <Pressable
                onPress={handleToggleHold}
                disabled={updatingAvailabilitySlotId === selectedSlot?.id}
                style={uiStyles.button}>
                <Text style={uiStyles.buttonText}>
                  {updatingAvailabilitySlotId === selectedSlot?.id
                    ? t('day.processing')
                    : t('day.releaseSlot')}
                </Text>
              </Pressable>
                ) : null}
                {selectedSlotCanDeactivate ? (
              <Pressable
                onPress={handleDeactivateSlot}
                disabled={deactivatingSlotId === selectedSlot?.id}
                style={uiStyles.button}>
                <Text style={uiStyles.buttonText}>
                  {deactivatingSlotId === selectedSlot?.id
                    ? t('day.processing')
                    : t('day.setInactive')}
                </Text>
              </Pressable>
                ) : null}
                {selectedSlotCanCancelAppointment ? (
              <Pressable
                onPress={handleCancelAppointment}
                disabled={cancellingAppointmentId === selectedSlot?.appointmentId}
                style={uiStyles.button}>
                <Text style={uiStyles.buttonText}>
                  {cancellingAppointmentId === selectedSlot?.appointmentId
                    ? t('day.processing')
                    : t('day.cancelAppointment')}
                </Text>
              </Pressable>
                ) : null}
              </>
            ) : (
              <Text style={uiStyles.secondaryText}>Slot auswählen</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={cancellationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCancellationModalVisible(false)}>
        <View style={uiStyles.modalBackdrop}>
          <View style={uiStyles.modalSheet}>
            <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>
              {t('day.cancelAppointmentTitle')}
            </Text>
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
              {t('day.cancelAppointmentBody')}
            </Text>
            <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
              {t('day.cancelMessageLabel')}
            </Text>
            <TextInput
              value={cancellationMessage}
              onChangeText={setCancellationMessage}
              multiline
              numberOfLines={4}
              placeholderTextColor={theme.colors.textSecondary}
              style={[
                uiStyles.input,
                { marginBottom: theme.spacing[16], minHeight: 96, textAlignVertical: 'top' },
              ]}
            />

            <Pressable
              onPress={() => void runAppointmentCancellation('available')}
              disabled={cancellingAppointmentId === selectedSlot?.appointmentId}
              style={[uiStyles.button, { marginBottom: theme.spacing[8] }]}>
              <Text style={uiStyles.buttonText}>{t('day.cancelToAvailable')}</Text>
            </Pressable>

            <Pressable
              onPress={() => void runAppointmentCancellation('inactive')}
              disabled={cancellingAppointmentId === selectedSlot?.appointmentId}
              style={[uiStyles.button, { marginBottom: theme.spacing[8] }]}>
              <Text style={uiStyles.buttonText}>{t('day.cancelToInactive')}</Text>
            </Pressable>

            <Pressable
              onPress={() => void runAppointmentCancellation('available', true)}
              disabled={cancellingAppointmentId === selectedSlot?.appointmentId}
              style={[uiStyles.button, { marginBottom: theme.spacing[12] }]}>
              <Text style={uiStyles.buttonText}>{t('day.cancelToReassign')}</Text>
            </Pressable>

            <Pressable onPress={() => setCancellationModalVisible(false)}>
              <Text style={uiStyles.linkText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={assignmentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAssignmentModalVisible(false)}>
        <View style={uiStyles.modalBackdrop}>
          <View style={uiStyles.modalSheet}>
            <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[12] }]}>
              {t('day.assignTitle')}
            </Text>
            <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
              {t('day.assignNameLabel')}
            </Text>
            <TextInput
              value={assigneeName}
              onChangeText={setAssigneeName}
              placeholderTextColor={theme.colors.textSecondary}
              style={[uiStyles.input, { marginBottom: theme.spacing[12] }]}
            />
            <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
              {t('day.assignEmailLabel')}
            </Text>
            <TextInput
              value={assigneeEmail}
              onChangeText={setAssigneeEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.colors.textSecondary}
              style={[uiStyles.input, { marginBottom: theme.spacing[12] }]}
            />
            <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>
              {t('day.assignPhoneLabel')}
            </Text>
            <TextInput
              value={assigneePhone}
              onChangeText={setAssigneePhone}
              keyboardType="phone-pad"
              placeholderTextColor={theme.colors.textSecondary}
              style={[uiStyles.input, { marginBottom: theme.spacing[16] }]}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable onPress={() => setAssignmentModalVisible(false)}>
                <Text style={uiStyles.linkText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={handleAssignSlot}
                disabled={assigningSlotId === selectedSlot?.id}
                style={uiStyles.button}>
                <Text style={uiStyles.buttonText}>
                  {assigningSlotId === selectedSlot?.id
                    ? t('day.processing')
                    : t('day.assignConfirm')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
