import { useEffect, useState } from 'react';

import { subscribeToCalendarAccessList } from './repository';
import type { CalendarAccessRecord } from './types';

export function useCalendarAccessList(calendarId: string | null) {
  const [records, setRecords] = useState<CalendarAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!calendarId) {
      setRecords([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToCalendarAccessList(
      calendarId,
      (nextRecords) => {
        setRecords(nextRecords);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [calendarId]);

  return { records, loading, error };
}
