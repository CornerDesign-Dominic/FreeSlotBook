import { useEffect, useState } from 'react';

import { subscribeToCalendarAccessRequests } from './repository';
import type { CalendarAccessRequestRecord } from './types';

export function useCalendarAccessRequests(calendarId: string | null) {
  const [records, setRecords] = useState<CalendarAccessRequestRecord[]>([]);
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

    const unsubscribe = subscribeToCalendarAccessRequests(
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
