import { useEffect, useState } from 'react';

import { ensureOwnerAccountSetup, subscribeToOwnerCalendar } from './repository';
import type { CalendarRecord } from './types';

export function useOwnerCalendar(user: { uid: string; email: string | null } | null) {
  const [calendar, setCalendar] = useState<CalendarRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = user;

    if (!currentUser?.email) {
      setCalendar(null);
      setError(null);
      setLoading(false);
      return;
    }
    const ownerUser = { uid: currentUser.uid, email: currentUser.email };

    let unsubscribed = false;
    let unsubscribeSnapshot: (() => void) | null = null;

    async function start() {
      setLoading(true);
      setError(null);

      try {
        await ensureOwnerAccountSetup(ownerUser);

        if (unsubscribed) {
          return;
        }

        unsubscribeSnapshot = subscribeToOwnerCalendar(
          ownerUser.uid,
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
  }, [user]);

  return { calendar, loading, error };
}
