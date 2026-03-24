import { useEffect, useState } from 'react';

import { subscribeToCalendarInvites } from './repository';
import type { CalendarInviteRecord } from './types';

export function useCalendarInvites(calendarId: string | null) {
  const [records, setRecords] = useState<CalendarInviteRecord[]>([]);
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

    const unsubscribe = subscribeToCalendarInvites(
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
