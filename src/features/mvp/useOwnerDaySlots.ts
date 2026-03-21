import { useEffect, useMemo, useRef, useState } from 'react';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dayRange = useMemo(() => (date ? getDayRange(date) : null), [date]);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    if (!calendarId || !dayRange) {
      setSlots([]);
      setError(null);
      setLoading(false);
      setIsRefreshing(false);
      hasLoadedOnceRef.current = false;
      return;
    }

    setError(null);
    setSlots([]);

    if (hasLoadedOnceRef.current) {
      setIsRefreshing(true);
      setLoading(false);
    } else {
      setLoading(true);
      setIsRefreshing(false);
    }

    const unsubscribe = subscribeToOwnerSlotsInRange(
      calendarId,
      dayRange.dayStart,
      dayRange.dayEnd,
      (nextSlots) => {
        setSlots(nextSlots);
        setLoading(false);
        setIsRefreshing(false);
        hasLoadedOnceRef.current = true;
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
        setIsRefreshing(false);
      }
    );

    return unsubscribe;
  }, [calendarId, dayRange]);

  return { slots, loading, isRefreshing, error };
}
