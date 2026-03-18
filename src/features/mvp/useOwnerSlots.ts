import { useEffect, useState } from 'react';

import { subscribeToOwnerSlots } from './repository';
import type { CalendarSlotRecord } from './types';

export function useOwnerSlots(calendarId: string | null) {
  const [slots, setSlots] = useState<CalendarSlotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!calendarId) {
      setSlots([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToOwnerSlots(
      calendarId,
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
  }, [calendarId]);

  return { slots, loading, error };
}
