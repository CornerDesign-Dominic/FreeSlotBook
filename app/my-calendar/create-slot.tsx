import { useMemo, useState } from 'react';
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
  parseDayKey,
  parseGermanDateInput,
  parseTimeInput,
} from '../../src/features/mvp/calendar-utils';
import { createCalendarSlotWithOptionalAssignment } from '../../src/features/mvp/repository';
import { useCalendarAccessList } from '../../src/features/mvp/useCalendarAccessList';
import { useOwnerCalendar } from '../../src/features/mvp/useOwnerCalendar';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';
import { useAuth } from '../../src/firebase/useAuth';
import { LanguageSwitcher } from '../../src/i18n/language-switcher';
import { useTranslation } from '../../src/i18n/provider';

const weekdayLabels = {
  de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
} as const;

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
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const preselectedDateParam = Array.isArray(params.date) ? params.date[0] : params.date ?? '';
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

    const overlappingSlots = findOverlappingSlots(slots, [{ startsAt, endsAt }]);

    if (overlappingSlots.length) {
      setMessage(t('createSlot.overlap'));
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const slotId = await createCalendarSlotWithOptionalAssignment({
        calendarId: calendar.id,
        ownerId: user.uid,
        startsAt,
        endsAt,
        assigneeEmail: selectedAssigneeEmail,
      });

      router.replace(`/my-calendar/${getDayKey(startsAt)}?slotId=${slotId}`);
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('createSlot.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const approvedAccessRecords = accessRecords.filter((record) => record.status === 'approved');
  const monthGrid = buildMonthGrid(pickerMonth);

  if (authLoading || loading || slotsLoading || accessLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: 'white' }}
      contentContainerStyle={{ padding: 16 }}>
      <LanguageSwitcher />
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>{t('createSlot.title')}</Text>

      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 16 }}>
        <Text style={{ color: 'black', marginBottom: 8 }}>{t('createSlot.date')}</Text>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <TextInput
            placeholder="TT.MM.YYYY"
            value={startDateInput}
            onChangeText={(value) => setStartDateInput(sanitizeDateInput(value))}
            keyboardType="number-pad"
            style={{ flex: 1, borderWidth: 1, borderColor: 'black', padding: 12, marginRight: 8 }}
          />
          <Pressable
            onPress={() => openPicker('start')}
            style={{ borderWidth: 1, borderColor: 'black', paddingHorizontal: 12, justifyContent: 'center' }}>
            <Text style={{ color: 'black' }}>{t('createSlot.calendarButton')}</Text>
          </Pressable>
        </View>

        <Text style={{ color: 'black', marginBottom: 8 }}>{t('createSlot.startTime')}</Text>
        <TextInput
          placeholder="HH:MM"
          value={startTimeInput}
          onChangeText={(value) => setStartTimeInput(sanitizeTimeInput(value))}
          keyboardType="number-pad"
          maxLength={5}
          style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 12 }}
        />

        <Text style={{ color: 'black', marginBottom: 8 }}>{t('createSlot.endTime')}</Text>
        <TextInput
          placeholder="HH:MM"
          value={endTimeInput}
          onChangeText={(value) => setEndTimeInput(sanitizeTimeInput(value))}
          keyboardType="number-pad"
          maxLength={5}
          style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 12 }}
        />

        <Text style={{ color: 'black', marginBottom: 8 }}>{t('createSlot.endDateOptional')}</Text>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <TextInput
            placeholder="TT.MM.YYYY"
            value={endDateInput}
            onChangeText={(value) => setEndDateInput(sanitizeDateInput(value))}
            keyboardType="number-pad"
            style={{ flex: 1, borderWidth: 1, borderColor: 'black', padding: 12, marginRight: 8 }}
          />
          <Pressable
            onPress={() => openPicker('end')}
            style={{ borderWidth: 1, borderColor: 'black', paddingHorizontal: 12, justifyContent: 'center' }}>
            <Text style={{ color: 'black' }}>{t('createSlot.calendarButton')}</Text>
          </Pressable>
        </View>

        <Text style={{ color: 'black', marginBottom: 16 }}>
          {t('createSlot.sameDayHint')}
        </Text>

        <Pressable
          onPress={() => setShowAssignmentSection((currentValue) => !currentValue)}
          style={{ marginBottom: 12 }}>
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {showAssignmentSection ? t('createSlot.hideAssignment') : t('createSlot.showAssignment')}
          </Text>
        </Pressable>

        {showAssignmentSection ? (
          <View style={{ borderWidth: 1, borderColor: 'black', padding: 12, marginBottom: 16 }}>
            <Text style={{ color: 'black', marginBottom: 8 }}>
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
                      borderColor: 'black',
                      paddingTop: 12,
                      marginTop: 12,
                      backgroundColor: isSelected ? '#f1f1f1' : 'white',
                    }}>
                    <Text style={{ color: 'black', marginBottom: 4 }}>{record.granteeEmail}</Text>
                    <Text style={{ color: 'black' }}>
                      {isSelected ? t('createSlot.assignedDirectly') : t('createSlot.tapToSelect')}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <Text style={{ color: 'black' }}>{t('createSlot.noAssignees')}</Text>
            )}

            {selectedAssigneeEmail ? (
              <Pressable onPress={() => setSelectedAssigneeEmail(null)} style={{ marginTop: 12 }}>
                <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                  {t('createSlot.removeAssignment')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Pressable
          onPress={handleCreateSlot}
          disabled={submitting || !calendar}
          style={{
            borderWidth: 1,
            borderColor: 'black',
            paddingVertical: 12,
            alignItems: 'center',
            opacity: submitting || !calendar ? 0.6 : 1,
          }}>
          <Text style={{ color: 'black' }}>
            {submitting ? t('createSlot.saving') : t('createSlot.save')}
          </Text>
        </Pressable>

        {message ? <Text style={{ color: 'black', marginTop: 12 }}>{message}</Text> : null}
        {error ? <Text style={{ color: 'black', marginTop: 12 }}>{error}</Text> : null}
        {slotsError ? <Text style={{ color: 'black', marginTop: 12 }}>{slotsError}</Text> : null}
        {accessError ? <Text style={{ color: 'black', marginTop: 12 }}>{accessError}</Text> : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Pressable
          onPress={() =>
            router.replace(
              preselectedDateParam ? `/my-calendar/${preselectedDateParam}` : '/my-calendar'
            )
          }>
          <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
            {preselectedDateParam ? t('createSlot.backToDayView') : t('nav.backToCalendar')}
          </Text>
        </Pressable>
      </View>

      <Modal visible={pickerField !== null} animationType="slide" transparent onRequestClose={closePicker}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.2)',
            justifyContent: 'flex-end',
          }}>
          <View style={{ backgroundColor: 'white', padding: 16, minHeight: 420 }}>
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
                <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                  {t('createSlot.pickerBack')}
                </Text>
              </Pressable>
              <Text style={{ color: 'black', fontSize: 18 }}>{formatMonthTitle(pickerMonth, locale)}</Text>
              <Pressable
                onPress={() =>
                  setPickerMonth(
                    (currentMonth) =>
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                  )
                }>
                <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                  {t('createSlot.pickerNext')}
                </Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {weekdayLabels[language].map((label) => (
                <View key={label} style={{ flex: 1 }}>
                  <Text style={{ color: 'black', textAlign: 'center' }}>{label}</Text>
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
                        borderColor: 'black',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: day.isCurrentMonth ? 1 : 0.4,
                        backgroundColor: isSelected ? '#f1f1f1' : 'white',
                      }}>
                      <Text style={{ color: 'black' }}>{day.date.getDate()}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
              <Pressable onPress={closePicker}>
                <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
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
