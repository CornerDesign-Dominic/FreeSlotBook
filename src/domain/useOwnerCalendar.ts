import { useEffect, useRef, useState } from 'react';

import { ensureOwnerAccountSetup, subscribeToOwnerCalendar } from './repository';
import type { CalendarRecord } from './types';

export function useOwnerCalendar(user: { uid: string; email: string | null } | null) {
  const [calendar, setCalendar] = useState<CalendarRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const ownerUid = user?.uid ?? null;
  const ownerEmail = user?.email ?? null;

  useEffect(() => {
    if (!ownerUid || !ownerEmail) {
      setCalendar(null);
      setError(null);
      setLoading(false);
      hasLoadedOnceRef.current = false;
      return;
    }
    const ownerUser = { uid: ownerUid, email: ownerEmail };

    let unsubscribed = false;
    let unsubscribeSnapshot: (() => void) | null = null;

    async function start() {
      if (!hasLoadedOnceRef.current) {
        setLoading(true);
      }
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
            hasLoadedOnceRef.current = true;
            setLoading(false);
          },
          (nextError) => {
            setError(nextError.message);
            hasLoadedOnceRef.current = true;
            setLoading(false);
          }
        );
      } catch (nextError) {
        if (!unsubscribed) {
          hasLoadedOnceRef.current = true;
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
  }, [ownerEmail, ownerUid]);

  return { calendar, loading, error };
}
