import { useEffect, useState } from 'react';

import { getOwnerCalendar, subscribeToPendingCalendarAccessRequestsByRequester } from './repository';
import type { CalendarAccessRequestRecord, CalendarRecord } from './types';

type PendingCalendarAccessRequestItem = {
  request: CalendarAccessRequestRecord;
  calendar: CalendarRecord | null;
};

export function usePendingCalendarAccessRequests(requesterUserId: string | null) {
  const [records, setRecords] = useState<PendingCalendarAccessRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requesterUserId) {
      setRecords([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToPendingCalendarAccessRequestsByRequester(
      requesterUserId,
      (nextRequests) => {
        void (async () => {
          try {
            const nextRecords = await Promise.all(
              nextRequests.map(async (request) => ({
                request,
                calendar: await getOwnerCalendar(request.calendarId),
              }))
            );

            setRecords(nextRecords);
            setLoading(false);
          } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Anfragen konnten nicht geladen werden.');
            setLoading(false);
          }
        })();
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [requesterUserId]);

  return { records, loading, error };
}
