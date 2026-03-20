import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  buildMonthGrid,
  findOverlappingSlots,
  formatDateInput,
  formatMonthTitle,
  getDayKey,
  getWeekdayLabels,
  parseDayKey,
  parseGermanDateInput,
  parseTimeInput,
} from '../../src/features/mvp/calendar-utils';
import {
  createCalendarSlotWithOptionalAssignment,
  updateCalendarSlotTimes,
} from '../../src/features/mvp/repository';
import { useCalendarAccessList } from '../../src/features/mvp/useCalendarAccessList';
import { useOwnerCalendar } from '../../src/features/mvp/useOwnerCalendar';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';
import { useAuth } from '../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppSettings } from '@/src/settings/provider';
import { theme, uiStyles } from '../../src/theme/ui';

function sanitizeDateInput(value: string) {
  const digitsOnly = value.replace(/\D/g, '').slice(0, 8);
  const day = digitsOnly.slice(0, 2);
  const month = digitsOnly.slice(2, 4);
  const year = digitsOnly.slice(4, 8);

  return [day, month, year].filter(Boolean).join('.');
}

function sanitizeTimeInput(value: string) {
  const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
  const hours = digitsOnly.slice(0, 2);
  const minutes = digitsOnly.slice(2, 4);

  return minutes ? `${hours}:${minutes}` : hours;
}

type DateFieldKey = 'start' | 'end';

export default function CreateSlotScreen() {
  const { t, language } = useTranslation();
  const { weekStartsOn } = useAppSettings();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const params = useLocalSearchParams<{ date?: string | string[]; slotId?: string | string[] }>();
  const preselectedDateParam = Array.isArray(params.date) ? params.date[0] : params.date ?? '';
  const editingSlotId = Array.isArray(params.slotId) ? params.slotId[0] : params.slotId ?? '';
  const preselectedDate = parseDayKey(preselectedDateParam);
  const initialStartDate = preselectedDate ? formatDateInput(preselectedDate) : '';

  const { user, loading: authLoading } = useAuth();
  const { calendar, loading, error } = useOwnerCalendar(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(calendar?.id ?? null);
  const {
    records: accessRecords,
    loading: accessLoading,
    error: accessError,
  } = useCalendarAccessList(calendar?.id ?? null);
  const [startDateInput, setStartDateInput] = useState(initialStartDate);
  const [endDateInput, setEndDateInput] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pickerField, setPickerField] = useState<DateFieldKey | null>(null);
  const [showAssignmentSection, setShowAssignmentSection] = useState(false);
  const [selectedAssigneeEmail, setSelectedAssigneeEmail] = useState<string | null>(null);

  const parsedStartDate = useMemo(() => parseGermanDateInput(startDateInput), [startDateInput]);
  const parsedEndDate = useMemo(() => parseGermanDateInput(endDateInput), [endDateInput]);
  const [pickerMonth, setPickerMonth] = useState(() => {
    const base = preselectedDate ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const editingSlot = useMemo(
    () => slots.find((slot) => slot.id === editingSlotId) ?? null,
    [editingSlotId, slots]
  );
  const isEditing = Boolean(editingSlotId);

  const openPicker = (field: DateFieldKey) => {
    setPickerField(field);

    const baseDate =
      field === 'end'
        ? parsedEndDate ?? parsedStartDate ?? new Date()
        : parsedStartDate ?? new Date();

    setPickerMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
  };

  const closePicker = () => {
    setPickerField(null);
  };

  useEffect(() => {
    if (!editingSlot?.startsAt || !editingSlot.endsAt) {
      return;
    }

    setStartDateInput(formatDateInput(editingSlot.startsAt));
    setEndDateInput(
      getDayKey(editingSlot.startsAt) === getDayKey(editingSlot.endsAt)
        ? ''
        : formatDateInput(editingSlot.endsAt)
    );
    setStartTimeInput(
      editingSlot.startsAt.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    );
    setEndTimeInput(
      editingSlot.endsAt.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    );
    setShowAssignmentSection(false);
    setSelectedAssigneeEmail(null);
  }, [editingSlot]);

  const applyPickedDate = (date: Date) => {
    const formattedDate = formatDateInput(date);

    if (pickerField === 'end') {
      setEndDateInput(formattedDate);
    } else {
      setStartDateInput(formattedDate);
    }

    closePicker();
  };

  const handleCreateSlot = async () => {
    if (!calendar || !user) {
      setMessage(t('createSlot.notAvailable'));
      return;
    }

    const startDate = parseGermanDateInput(startDateInput);
    const endDate = endDateInput.trim() ? parseGermanDateInput(endDateInput) : startDate;

    if (!startDate) {
      setMessage(t('createSlot.invalidStartDate'));
      return;
    }

    if (!endDate) {
      setMessage(t('createSlot.invalidEndDate'));
      return;
    }

    const startsAt = parseTimeInput(startTimeInput, startDate);
    const endsAt = parseTimeInput(endTimeInput, endDate);

    if (!startTimeInput.trim()) {
      setMessage(t('createSlot.startTimeRequired'));
      return;
    }

    if (!endTimeInput.trim()) {
      setMessage(t('createSlot.endTimeRequired'));
      return;
    }

    if (!startsAt) {
      setMessage(t('createSlot.invalidStartTime'));
      return;
    }

    if (!endsAt) {
      setMessage(t('createSlot.invalidEndTime'));
      return;
    }

    if (endsAt <= startsAt) {
      setMessage(t('createSlot.endAfterStart'));
      return;
    }

    const overlappingSlotIds = findOverlappingSlots(
      slots,
      [{ startsAt, endsAt }],
      isEditing ? { excludeSlotIds: [editingSlotId] } : undefined
    );

    if (overlappingSlotIds.length) {
      setMessage(t('createSlot.overlap'));
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const slotId = isEditing
        ? editingSlotId
        : await createCalendarSlotWithOptionalAssignment({
            calendarId: calendar.id,
            ownerId: user.uid,
            startsAt,
            endsAt,
            assigneeEmail: selectedAssigneeEmail,
          });

      if (isEditing) {
        if (!editingSlot || editingSlot.status === 'booked' || editingSlot.appointmentId) {
          throw new Error(t('createSlot.editBookedError'));
        }

        await updateCalendarSlotTimes({
          calendarId: calendar.id,
          slotId: editingSlotId,
          actorUid: user.uid,
          startsAt,
          endsAt,
        });
      }

      router.replace(`/my-calendar/${getDayKey(startsAt)}?slotId=${slotId}`);
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('createSlot.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const approvedAccessRecords = accessRecords.filter((record) => record.status === 'approved');
  const monthGrid = buildMonthGrid(pickerMonth, weekStartsOn);
  const weekdayLabels = getWeekdayLabels(language, weekStartsOn);

  if (authLoading || loading || slotsLoading || accessLoading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={uiStyles.screen}
      contentContainerStyle={uiStyles.content}>
      <Text style={uiStyles.pageTitle}>
        {isEditing ? t('createSlot.editTitle') : t('createSlot.title')}
      </Text>

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>{t('createSlot.date')}</Text>
        <View style={{ flexDirection: 'row', marginBottom: theme.spacing[12] }}>
          <TextInput
            placeholder="TT.MM.YYYY"
            value={startDateInput}
            onChangeText={(value) => setStartDateInput(sanitizeDateInput(value))}
            keyboardType="number-pad"
            placeholderTextColor={theme.colors.textSecondary}
            style={[uiStyles.input, { flex: 1, marginRight: theme.spacing[8] }]}
          />
          <Pressable
            onPress={() => openPicker('start')}
            style={[uiStyles.button, { paddingHorizontal: theme.spacing[12] }]}>
            <Text style={uiStyles.buttonText}>{t('createSlot.calendarButton')}</Text>
          </Pressable>
        </View>

        <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>{t('createSlot.startTime')}</Text>
        <TextInput
          placeholder="HH:MM"
          value={startTimeInput}
          onChangeText={(value) => setStartTimeInput(sanitizeTimeInput(value))}
          keyboardType="number-pad"
          maxLength={5}
          placeholderTextColor={theme.colors.textSecondary}
          style={[uiStyles.input, { marginBottom: theme.spacing[12] }]}
        />

        <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>{t('createSlot.endTime')}</Text>
        <TextInput
          placeholder="HH:MM"
          value={endTimeInput}
          onChangeText={(value) => setEndTimeInput(sanitizeTimeInput(value))}
          keyboardType="number-pad"
          maxLength={5}
          placeholderTextColor={theme.colors.textSecondary}
          style={[uiStyles.input, { marginBottom: theme.spacing[12] }]}
        />

        <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[8] }]}>{t('createSlot.endDateOptional')}</Text>
        <View style={{ flexDirection: 'row', marginBottom: theme.spacing[12] }}>
          <TextInput
            placeholder="TT.MM.YYYY"
            value={endDateInput}
            onChangeText={(value) => setEndDateInput(sanitizeDateInput(value))}
            keyboardType="number-pad"
            placeholderTextColor={theme.colors.textSecondary}
            style={[uiStyles.input, { flex: 1, marginRight: theme.spacing[8] }]}
          />
          <Pressable
            onPress={() => openPicker('end')}
            style={[uiStyles.button, { paddingHorizontal: theme.spacing[12] }]}>
            <Text style={uiStyles.buttonText}>{t('createSlot.calendarButton')}</Text>
          </Pressable>
        </View>

        <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[16] }]}>
          {t('createSlot.sameDayHint')}
        </Text>

        {!isEditing ? (
          <Pressable
            onPress={() => setShowAssignmentSection((currentValue) => !currentValue)}
            style={{ marginBottom: theme.spacing[12] }}>
            <Text style={uiStyles.linkText}>
              {showAssignmentSection ? t('createSlot.hideAssignment') : t('createSlot.showAssignment')}
            </Text>
          </Pressable>
        ) : null}

        {!isEditing && showAssignmentSection ? (
          <View style={[uiStyles.subtlePanel, { marginBottom: theme.spacing[16] }]}>
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
              {t('createSlot.assignmentHint')}
            </Text>

            {approvedAccessRecords.length ? (
              approvedAccessRecords.map((record) => {
                const isSelected = selectedAssigneeEmail === record.granteeEmail;

                return (
                  <Pressable
                    key={record.id}
                    onPress={() =>
                      setSelectedAssigneeEmail(isSelected ? null : record.granteeEmail)
                    }
                    style={{
                      borderTopWidth: 1,
                      borderColor: theme.colors.border,
                      paddingTop: theme.spacing[12],
                      marginTop: theme.spacing[12],
                      backgroundColor: isSelected ? theme.colors.accentSoft : theme.colors.surface,
                    }}>
                    <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>{record.granteeEmail}</Text>
                    <Text style={uiStyles.secondaryText}>
                      {isSelected ? t('createSlot.assignedDirectly') : t('createSlot.tapToSelect')}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <Text style={uiStyles.secondaryText}>{t('createSlot.noAssignees')}</Text>
            )}

            {selectedAssigneeEmail ? (
              <Pressable onPress={() => setSelectedAssigneeEmail(null)} style={{ marginTop: theme.spacing[12] }}>
                <Text style={uiStyles.linkText}>
                  {t('createSlot.removeAssignment')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {isEditing ? (
          <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[16] }]}>{t('createSlot.editHint')}</Text>
        ) : null}

        <Pressable
          onPress={handleCreateSlot}
          disabled={
            submitting ||
            !calendar ||
            (isEditing && (!editingSlot || editingSlot.status === 'booked' || Boolean(editingSlot.appointmentId)))
          }
          style={[
            uiStyles.outlineAction,
            {
              opacity:
                submitting ||
                !calendar ||
                (isEditing && (!editingSlot || editingSlot.status === 'booked' || Boolean(editingSlot.appointmentId)))
                  ? 0.6
                  : 1,
            },
          ]}>
          <Text style={uiStyles.buttonText}>
            {submitting
              ? t('createSlot.saving')
              : isEditing
                ? t('createSlot.saveEdit')
                : t('createSlot.save')}
          </Text>
        </Pressable>

        {message ? <Text style={[uiStyles.bodyText, { marginTop: theme.spacing[12] }]}>{message}</Text> : null}
        {error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{error}</Text> : null}
        {slotsError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{slotsError}</Text> : null}
        {accessError ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{accessError}</Text> : null}
      </View>

      <View style={uiStyles.footerRow}>
        <Pressable
          onPress={() =>
            router.replace(
              preselectedDateParam ? `/my-calendar/${preselectedDateParam}` : '/my-calendar'
            )
          }>
          <Text style={uiStyles.linkText}>
            {preselectedDateParam ? t('createSlot.backToDayView') : t('nav.backToCalendar')}
          </Text>
        </Pressable>
      </View>

      <Modal visible={pickerField !== null} animationType="slide" transparent onRequestClose={closePicker}>
        <View style={uiStyles.modalBackdrop}>
          <View style={[uiStyles.modalSheet, { minHeight: 420 }]}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}>
              <Pressable
                onPress={() =>
                  setPickerMonth(
                    (currentMonth) =>
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                  )
                }>
                <Text style={uiStyles.linkText}>
                  {t('createSlot.pickerBack')}
                </Text>
              </Pressable>
              <Text style={uiStyles.sectionTitle}>{formatMonthTitle(pickerMonth, locale)}</Text>
              <Pressable
                onPress={() =>
                  setPickerMonth(
                    (currentMonth) =>
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                  )
                }>
                <Text style={uiStyles.linkText}>
                  {t('createSlot.pickerNext')}
                </Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: theme.spacing[8] }}>
              {weekdayLabels.map((label) => (
                <View key={label} style={{ flex: 1 }}>
                  <Text style={[uiStyles.metaText, { textAlign: 'center' }]}>{label}</Text>
                </View>
              ))}
            </View>

            {monthGrid.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={{ flexDirection: 'row' }}>
                {week.map((day) => {
                  const selectedValue =
                    pickerField === 'end'
                      ? parsedEndDate ?? parsedStartDate
                      : parsedStartDate;
                  const isSelected =
                    selectedValue &&
                    day.date.getFullYear() === selectedValue.getFullYear() &&
                    day.date.getMonth() === selectedValue.getMonth() &&
                    day.date.getDate() === selectedValue.getDate();

                  return (
                    <Pressable
                      key={day.key}
                      onPress={() => applyPickedDate(day.date)}
                      style={{
                        flex: 1,
                        minHeight: 48,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: day.isCurrentMonth ? 1 : 0.4,
                        backgroundColor: isSelected ? theme.colors.accentSoft : theme.colors.surface,
                        borderRadius: theme.radius.small,
                      }}>
                      <Text style={uiStyles.bodyText}>{day.date.getDate()}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <View style={{ marginTop: theme.spacing[16], alignItems: 'flex-end' }}>
              <Pressable onPress={closePicker}>
                <Text style={uiStyles.linkText}>
                  {t('createSlot.pickerClose')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
