import { useEffect, useMemo, useState } from 'react';

import { subscribeToOwnerSlots } from './repository';
import type { CalendarSlotRecord } from './types';

type OwnedSlotSummary = {
  total: number;
  available: number;
  booked: number;
  inactive: number;
};

const emptySummary: OwnedSlotSummary = {
  total: 0,
  available: 0,
  booked: 0,
  inactive: 0,
};

export function useOwnedSlotSummary(calendarIds: string[]) {
  const normalizedCalendarIds = useMemo(
    () => Array.from(new Set(calendarIds.filter((calendarId) => calendarId.trim().length))),
    [calendarIds]
  );
  const [slotsByCalendar, setSlotsByCalendar] = useState<Record<string, CalendarSlotRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!normalizedCalendarIds.length) {
      setSlotsByCalendar({});
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSlotsByCalendar({});

    const loadingCalendarIds = new Set(normalizedCalendarIds);

    const unsubscribeHandles = normalizedCalendarIds.map((calendarId) =>
      subscribeToOwnerSlots(
        calendarId,
        (nextSlots) => {
          setSlotsByCalendar((currentValue) => ({
            ...currentValue,
            [calendarId]: nextSlots,
          }));

          loadingCalendarIds.delete(calendarId);
          if (!loadingCalendarIds.size) {
            setLoading(false);
          }
        },
        (nextError) => {
          setError(nextError.message);
          setLoading(false);
        }
      )
    );

    return () => {
      unsubscribeHandles.forEach((unsubscribe) => unsubscribe());
    };
  }, [normalizedCalendarIds]);

  const summary = useMemo<OwnedSlotSummary>(() => {
    return Object.values(slotsByCalendar)
      .flat()
      .reduce(
        (accumulator, slot) => {
          accumulator.total += 1;

          if (slot.status === 'available') {
            accumulator.available += 1;
          } else if (slot.status === 'booked') {
            accumulator.booked += 1;
          } else if (slot.status === 'inactive') {
            accumulator.inactive += 1;
          }

          return accumulator;
        },
        { ...emptySummary }
      );
  }, [slotsByCalendar]);

  return { summary, loading, error };
}
