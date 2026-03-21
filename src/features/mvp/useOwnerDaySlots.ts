import { useEffect, useMemo, useState } from 'react';

import { subscribeToOwnerSlotsInRange } from './repository';
import type { CalendarSlotRecord } from './types';

function getDayRange(date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return { dayStart, dayEnd };
}

export function useOwnerDaySlots(calendarId: string | null, date: Date | null) {
  const [slots, setSlots] = useState<CalendarSlotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dayRange = useMemo(() => (date ? getDayRange(date) : null), [date]);

  useEffect(() => {
    if (!calendarId || !dayRange) {
      setSlots([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToOwnerSlotsInRange(
      calendarId,
      dayRange.dayStart,
      dayRange.dayEnd,
      (nextSlots) => {
        setSlots(nextSlots);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [calendarId, dayRange]);

  return { slots, loading, error };
}
