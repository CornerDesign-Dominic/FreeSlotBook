import { useEffect, useState } from 'react';

import { getOwnerCalendar, subscribeToPendingCalendarInvitesByUser } from './repository';
import type { CalendarInviteRecord, CalendarRecord } from './types';

type PendingCalendarInviteItem = {
  invite: CalendarInviteRecord;
  calendar: CalendarRecord | null;
};

export function usePendingCalendarInvites(invitedUid: string | null) {
  const [records, setRecords] = useState<PendingCalendarInviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invitedUid) {
      setRecords([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToPendingCalendarInvitesByUser(
      invitedUid,
      (nextInvites) => {
        void (async () => {
          try {
            const nextRecords = await Promise.all(
              nextInvites.map(async (invite) => ({
                invite,
                calendar: await getOwnerCalendar(invite.calendarId),
              }))
            );

            setRecords(nextRecords);
            setLoading(false);
          } catch (nextError) {
            setError(
              nextError instanceof Error ? nextError.message : 'Einladungen konnten nicht geladen werden.'
            );
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
  }, [invitedUid]);

  return { records, loading, error };
}
