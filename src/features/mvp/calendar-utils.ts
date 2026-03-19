import type { CalendarSlotRecord } from './types';
import type { WeekStartsOn } from '@/src/settings/types';

export type CalendarDayCell = {
  key: string;
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export function getDayKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseDayKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsedDate = new Date(`${value}T00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

export function formatMonthTitle(date: Date, locale = 'de-DE') {
  return date.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

export function formatDayTitle(date: Date, locale = 'de-DE') {
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatHourLabel(hour: number) {
  return `${`${hour}`.padStart(2, '0')}:00`;
}

function startOfCalendarGrid(date: Date, weekStartsOn: WeekStartsOn = 'monday') {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const weekday =
    weekStartsOn === 'sunday'
      ? firstDayOfMonth.getDay()
      : (firstDayOfMonth.getDay() + 6) % 7;
  const start = new Date(firstDayOfMonth);
  start.setDate(firstDayOfMonth.getDate() - weekday);
  start.setHours(0, 0, 0, 0);

  return start;
}

export function startOfWeek(date: Date, weekStartsOn: WeekStartsOn = 'monday') {
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);

  const weekday =
    weekStartsOn === 'sunday' ? baseDate.getDay() : (baseDate.getDay() + 6) % 7;
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - weekday);

  return start;
}

export function buildMonthGrid(date: Date, weekStartsOn: WeekStartsOn = 'monday') {
  const start = startOfCalendarGrid(date, weekStartsOn);
  const todayKey = getDayKey(new Date());
  const weeks: CalendarDayCell[][] = [];

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const week: CalendarDayCell[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + weekIndex * 7 + dayIndex);

      week.push({
        key: getDayKey(current),
        date: current,
        isCurrentMonth: current.getMonth() === date.getMonth(),
        isToday: getDayKey(current) === todayKey,
      });
    }

    weeks.push(week);
  }

  return weeks;
}

export function buildWeekDays(date: Date, weekStartsOn: WeekStartsOn = 'monday') {
  const start = startOfWeek(date, weekStartsOn);
  const todayKey = getDayKey(new Date());

  return Array.from({ length: 7 }, (_, dayIndex) => {
    const current = new Date(start);
    current.setDate(start.getDate() + dayIndex);

    return {
      key: getDayKey(current),
      date: current,
      isCurrentMonth: true,
      isToday: getDayKey(current) === todayKey,
    } satisfies CalendarDayCell;
  });
}

export function formatWeekRange(date: Date, locale = 'de-DE', weekStartsOn: WeekStartsOn = 'monday') {
  const start = startOfWeek(date, weekStartsOn);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startLabel = start.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
  });
  const endLabel = end.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `${startLabel} - ${endLabel}`;
}

export function getWeekdayLabels(
  language: 'de' | 'en',
  weekStartsOn: WeekStartsOn = 'monday'
) {
  const mondayFirstLabels =
    language === 'de'
      ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (weekStartsOn === 'monday') {
    return mondayFirstLabels;
  }

  return [mondayFirstLabels[6], ...mondayFirstLabels.slice(0, 6)];
}

export function getSlotCountsByDay(slots: CalendarSlotRecord[]) {
  return slots.reduce<Record<string, number>>((accumulator, slot) => {
    if (!slot.startsAt || slot.status === 'cancelled') {
      return accumulator;
    }

    const dayKey = getDayKey(slot.startsAt);
    accumulator[dayKey] = (accumulator[dayKey] ?? 0) + 1;

    return accumulator;
  }, {});
}

export function getSlotsForDay(slots: CalendarSlotRecord[], date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  return slots
    .filter((slot) => {
      if (!slot.startsAt || !slot.endsAt) {
        return false;
      }

      return slot.startsAt < dayEnd && slot.endsAt > dayStart;
    })
    .sort((left, right) => {
      if (!left.startsAt || !right.startsAt) {
        return 0;
      }

      return left.startsAt.getTime() - right.startsAt.getTime();
    });
}

export function getMinutesSinceStartOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function parseDateInput(value: string) {
  return parseDayKey(value.trim());
}

export function formatDateInput(value: Date | null) {
  if (!value) {
    return '';
  }

  const day = `${value.getDate()}`.padStart(2, '0');
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const year = value.getFullYear();

  return `${day}.${month}.${year}`;
}

export function parseGermanDateInput(value: string) {
  const trimmedValue = value.trim();

  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(trimmedValue)) {
    return null;
  }

  const [dayValue, monthValue, yearValue] = trimmedValue.split('.').map(Number);
  const parsedDate = new Date(yearValue, monthValue - 1, dayValue);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() !== yearValue ||
    parsedDate.getMonth() !== monthValue - 1 ||
    parsedDate.getDate() !== dayValue
  ) {
    return null;
  }

  parsedDate.setHours(0, 0, 0, 0);

  return parsedDate;
}

export function parseTimeInput(value: string, baseDate: Date) {
  if (!/^\d{2}:\d{2}$/.test(value.trim())) {
    return null;
  }

  const [hoursValue, minutesValue] = value.split(':').map(Number);

  if (
    Number.isNaN(hoursValue) ||
    Number.isNaN(minutesValue) ||
    hoursValue < 0 ||
    hoursValue > 23 ||
    minutesValue < 0 ||
    minutesValue > 59
  ) {
    return null;
  }

  const nextDate = new Date(baseDate);
  nextDate.setHours(hoursValue, minutesValue, 0, 0);

  return nextDate;
}

export function findOverlappingSlots(
  existingSlots: CalendarSlotRecord[],
  candidateSlots: { startsAt: Date; endsAt: Date }[]
) {
  const relevantExistingSlots = existingSlots.filter(
    (slot) => slot.status !== 'cancelled' && slot.startsAt && slot.endsAt
  );

  return candidateSlots.filter((candidateSlot) =>
    relevantExistingSlots.some((existingSlot) => {
      if (!existingSlot.startsAt || !existingSlot.endsAt) {
        return false;
      }

      return candidateSlot.startsAt < existingSlot.endsAt && candidateSlot.endsAt > existingSlot.startsAt;
    })
  );
}
