import { useEffect, useState } from 'react';

import { ensureOwnerAccountSetup, subscribeToOwnerCalendar } from './repository';
import type { CalendarRecord } from './types';

export function useOwnerCalendar(user: { uid: string; email: string | null } | null) {
  const [calendar, setCalendar] = useState<CalendarRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) {
      setCalendar(null);
      setError(null);
      setLoading(false);
      return;
    }

    let unsubscribed = false;
    let unsubscribeSnapshot: (() => void) | null = null;

    async function start() {
      setLoading(true);
      setError(null);

      try {
        await ensureOwnerAccountSetup({ uid: user.uid, email: user.email });

        if (unsubscribed) {
          return;
        }

        unsubscribeSnapshot = subscribeToOwnerCalendar(
          user.uid,
          (nextCalendar) => {
            setCalendar(nextCalendar);
            setLoading(false);
          },
          (nextError) => {
            setError(nextError.message);
            setLoading(false);
          }
        );
      } catch (nextError) {
        if (!unsubscribed) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Die Kalenderdaten konnten nicht geladen werden.'
          );
          setLoading(false);
        }
      }
    }

    start();

    return () => {
      unsubscribed = true;
      unsubscribeSnapshot?.();
    };
  }, [user?.email, user?.uid]);

  return { calendar, loading, error };
}
