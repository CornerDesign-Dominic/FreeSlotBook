import { useMemo, useRef, useState, useEffect } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  Modal,
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
} from '../../src/features/mvp/calendar-utils';
import {
  assignCalendarSlotByOwner,
  cancelAppointmentByOwner,
  setCalendarSlotInactive,
  updateCalendarSlotAvailability,
} from '../../src/features/mvp/repository';
import { useOwnerCalendar } from '../../src/features/mvp/useOwnerCalendar';
import { useOwnerSlotDetail } from '../../src/features/mvp/useOwnerSlotDetail';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';
import type { CalendarSlotEventRecord, SlotStatus } from '../../src/features/mvp/types';
import { useAuth } from '../../src/firebase/useAuth';
import { LanguageSwitcher } from '../../src/i18n/language-switcher';
import { useTranslation } from '../../src/i18n/provider';

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

export default function CalendarDayScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
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
  const [updatingAvailabilitySlotId, setUpdatingAvailabilitySlotId] = useState<string | null>(null);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [assigningSlotId, setAssigningSlotId] = useState<string | null>(null);
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [assigneePhone, setAssigneePhone] = useState('');

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

  useEffect(() => {
    setActionMessage(null);
  }, [rawDate]);

  useEffect(() => {
    if (!assignmentModalVisible) {
      setAssigneeName('');
      setAssigneeEmail('');
      setAssigneePhone('');
    }
  }, [assignmentModalVisible]);

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

  const getFooterStatusHint = (status: SlotStatus | null, hasAppointment: boolean) => {
    if (!status) {
      return t('day.selectHint');
    }

    if (status === 'inactive') {
      return t('day.inactiveHint');
    }

    if (status === 'booked' || hasAppointment) {
      return t('day.bookedHint');
    }

    return t('day.availableHint');
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

  if (!selectedDate) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black', marginBottom: 16 }}>{t('day.invalidDate')}</Text>
        <Link href="/my-calendar">
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>{t('nav.backToCalendar')}</Text>
        </Link>
      </View>
    );
  }

  const handleDeactivateSlot = async () => {
    if (!calendar || !user || !selectedSlot) {
      return;
    }

    Alert.alert(t('day.setInactiveAlertTitle'), t('day.setInactiveAlertBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('day.setInactiveAlertConfirm'),
        onPress: async () => {
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

    Alert.alert(t('day.cancelAppointmentTitle'), t('day.cancelAppointmentBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('day.cancelToAvailable'),
        onPress: async () => {
          setCancellingAppointmentId(selectedSlot.appointmentId!);
          setActionMessage(null);

          try {
            await cancelAppointmentByOwner({
              calendarId: calendar.id,
              appointmentId: selectedSlot.appointmentId!,
              ownerId: user.uid,
              nextSlotStatus: 'available',
            });
            setActionMessage(t('day.cancelAppointmentAvailableSuccess'));
          } catch (nextError) {
            setActionMessage(
              nextError instanceof Error ? nextError.message : t('day.cancelAppointmentError')
            );
          } finally {
            setCancellingAppointmentId(null);
          }
        },
      },
      {
        text: t('day.cancelToInactive'),
        style: 'destructive',
        onPress: async () => {
          setCancellingAppointmentId(selectedSlot.appointmentId!);
          setActionMessage(null);

          try {
            await cancelAppointmentByOwner({
              calendarId: calendar.id,
              appointmentId: selectedSlot.appointmentId!,
              ownerId: user.uid,
              nextSlotStatus: 'inactive',
            });
            setActionMessage(t('day.cancelAppointmentInactiveSuccess'));
          } catch (nextError) {
            setActionMessage(
              nextError instanceof Error ? nextError.message : t('day.cancelAppointmentError')
            );
          } finally {
            setCancellingAppointmentId(null);
          }
        },
      },
    ]);
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

  if (authLoading || loading || slotsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const historyPanelMaxHeight = Math.max(Math.min(screenHeight * 0.33, 260), 180);
  const selectedSlotCanDeactivate = selectedSlot?.status === 'available' && !selectedSlot.appointmentId;
  const selectedSlotCanReactivate = selectedSlot?.status === 'inactive' && !selectedSlot.appointmentId;
  const selectedSlotCanEdit =
    Boolean(selectedSlot) && selectedSlot?.status !== 'booked' && !selectedSlot?.appointmentId;
  const selectedSlotCanAssign = selectedSlot?.status === 'available' && !selectedSlot?.appointmentId;
  const selectedSlotCanCancelAppointment =
    selectedSlot?.status === 'booked' && Boolean(selectedSlot?.appointmentId);
  const timeRailWidth = hourWidth * 24;
  const footerStatusHint = getFooterStatusHint(
    selectedSlot?.status ?? null,
    Boolean(selectedSlot?.appointmentId)
  );

  const navigateToRelativeDay = (offset: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + offset);
    router.replace(`/my-calendar/${getDayKey(nextDate)}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <LanguageSwitcher />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}>
          <Pressable onPress={() => navigateToRelativeDay(-1)}>
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
              {'<- '}{t('day.previous')}
            </Text>
          </Pressable>

          <Text style={{ color: 'black', fontSize: 24, flex: 1, textAlign: 'center' }}>
            {formatDayTitle(selectedDate, locale)}
          </Text>

          <Pressable onPress={() => navigateToRelativeDay(1)}>
            <Text style={{ color: 'black', textDecorationLine: 'underline', textAlign: 'right' }}>
              {t('day.next')}{' ->'}
            </Text>
          </Pressable>
        </View>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
          <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>{t('day.timeline')}</Text>

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
                          backgroundColor:
                            slot.status === 'inactive'
                              ? '#fff6d6'
                              : slot.status === 'booked'
                                ? '#f1f1f1'
                                : 'white',
                        }}>
                        <Text style={{ color: 'black', marginBottom: 6 }}>
                          {formatTime(slot.startsAt)} - {formatTime(slot.endsAt)}
                        </Text>
                        <Text style={{ color: 'black', marginBottom: 4 }}>
                          {formatSlotStatus(slot.status)}
                        </Text>
                        <Text style={{ color: 'black', fontSize: 12 }}>
                          {slot.appointmentId ? t('day.linkedAppointment') : t('day.noAppointment')}
                        </Text>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'black' }}>{t('day.noSlots')}</Text>
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
            {t('day.activity')}
          </Text>

          {selectedSlot ? (
            <>
              <Text style={{ color: 'black', marginBottom: 6 }}>
                {t('day.timeLabel', {
                  time: `${formatTime(selectedSlot.startsAt)} - ${formatTime(selectedSlot.endsAt)}`,
                })}
              </Text>
              <Text style={{ color: 'black', marginBottom: 6 }}>
                {t('day.statusLabel', { status: formatSlotStatus(selectedSlot.status) })}
              </Text>
              <Text style={{ color: 'black', marginBottom: 12 }}>
                {selectedSlot.appointmentId ? t('day.hasAppointment') : t('day.hasNoAppointment')}
              </Text>
            </>
          ) : null}

          <ScrollView style={{ maxHeight: historyPanelMaxHeight }}>
            {selectedSlot ? (
              slotDetailLoading ? (
                <Text style={{ color: 'black' }}>{t('day.historyLoading')}</Text>
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
                      {t('day.eventTime', { time: formatDateTime(event.createdAt) })}
                    </Text>
                    {event.statusAfter ? (
                      <Text style={{ color: 'black', marginBottom: 4 }}>
                        {t('day.eventStatusAfter', { status: formatSlotStatus(event.statusAfter) })}
                      </Text>
                    ) : null}
                    {event.targetEmail ? (
                      <Text style={{ color: 'black', marginBottom: 4 }}>
                        {t('day.eventReference', { email: event.targetEmail })}
                      </Text>
                    ) : null}
                    {event.note ? (
                      <Text style={{ color: 'black' }}>
                        {t('day.eventNote', { note: event.note })}
                      </Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={{ color: 'black' }}>{t('day.historyEmpty')}</Text>
              )
            ) : null}
          </ScrollView>

          {slotDetailError ? <Text style={{ color: 'black', marginTop: 12 }}>{slotDetailError}</Text> : null}
          {actionMessage ? <Text style={{ color: 'black', marginTop: 12 }}>{actionMessage}</Text> : null}
        </View>

        <View style={{ alignItems: 'flex-end', marginTop: 16 }}>
          <Link href="/my-calendar">
            <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
              {t('day.backToMonth')}
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
            <Text style={{ color: 'black' }}>{t('day.addSlot')}</Text>
          </Pressable>
        </Link>

        <View style={{ alignItems: 'flex-end' }}>
          {selectedSlotCanEdit ? (
            <Link href={`/my-calendar/create-slot?date=${rawDate}&slotId=${selectedSlot?.id}`} asChild>
              <Pressable
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: 'black',
                  marginBottom: 8,
                }}>
                <Text style={{ color: 'black' }}>{t('day.editSlot')}</Text>
              </Pressable>
            </Link>
          ) : null}
          {selectedSlotCanAssign ? (
            <Pressable
              onPress={handleOpenAssignmentModal}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: 'black',
                marginBottom: 8,
              }}>
              <Text style={{ color: 'black' }}>{t('day.assignSlot')}</Text>
            </Pressable>
          ) : null}
          {selectedSlotCanReactivate ? (
            <Pressable
              onPress={handleToggleHold}
              disabled={updatingAvailabilitySlotId === selectedSlot?.id}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: 'black',
                marginBottom: 8,
              }}>
              <Text style={{ color: 'black' }}>
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
              style={{ paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'black' }}>
              <Text style={{ color: 'black' }}>
                {deactivatingSlotId === selectedSlot?.id ? t('day.processing') : t('day.setInactive')}
              </Text>
            </Pressable>
          ) : selectedSlotCanCancelAppointment ? (
            <Pressable
              onPress={handleCancelAppointment}
              disabled={cancellingAppointmentId === selectedSlot?.appointmentId}
              style={{ paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'black' }}>
              <Text style={{ color: 'black' }}>
                {cancellingAppointmentId === selectedSlot?.appointmentId
                  ? t('day.processing')
                  : t('day.cancelAppointment')}
              </Text>
            </Pressable>
          ) : (
            <View style={{ paddingVertical: 10, paddingHorizontal: 12, opacity: 0.55 }}>
              <Text style={{ color: 'black' }}>{t('day.noAction')}</Text>
            </View>
          )}
          <Text style={{ color: 'black', marginTop: 8, maxWidth: 220, textAlign: 'right' }}>
            {footerStatusHint}
          </Text>
        </View>
      </View>

      <Modal
        visible={assignmentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAssignmentModalVisible(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.2)',
            justifyContent: 'flex-end',
          }}>
          <View style={{ backgroundColor: 'white', padding: 16 }}>
            <Text style={{ color: 'black', fontSize: 18, marginBottom: 12 }}>
              {t('day.assignTitle')}
            </Text>
            <Text style={{ color: 'black', marginBottom: 8 }}>{t('day.assignNameLabel')}</Text>
            <TextInput
              value={assigneeName}
              onChangeText={setAssigneeName}
              style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 12 }}
            />
            <Text style={{ color: 'black', marginBottom: 8 }}>{t('day.assignEmailLabel')}</Text>
            <TextInput
              value={assigneeEmail}
              onChangeText={setAssigneeEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 12 }}
            />
            <Text style={{ color: 'black', marginBottom: 8 }}>{t('day.assignPhoneLabel')}</Text>
            <TextInput
              value={assigneePhone}
              onChangeText={setAssigneePhone}
              keyboardType="phone-pad"
              style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 16 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable onPress={() => setAssignmentModalVisible(false)}>
                <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAssignSlot}
                disabled={assigningSlotId === selectedSlot?.id}
                style={{ borderWidth: 1, borderColor: 'black', paddingVertical: 10, paddingHorizontal: 12 }}>
                <Text style={{ color: 'black' }}>
                  {assigningSlotId === selectedSlot?.id ? t('day.processing') : t('day.assignConfirm')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
