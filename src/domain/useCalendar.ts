import { useEffect, useState } from 'react';

import { subscribeToCalendar } from './repository';
import type { CalendarRecord } from './types';

export function useCalendar(calendarId: string | null) {
  const [calendar, setCalendar] = useState<CalendarRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!calendarId) {
      setCalendar(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToCalendar(
      calendarId,
      (nextCalendar) => {
        setCalendar(nextCalendar);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [calendarId]);

  return { calendar, loading, error };
}
