import { useEffect, useMemo, useState } from 'react';

import { listCalendarsByIds } from './repository';
import type { CalendarRecord } from './types';

export function useAppointmentCalendarSourceCalendars(calendarIds: string[]) {
  const normalizedCalendarIds = useMemo(
    () => Array.from(new Set(calendarIds.filter((calendarId) => calendarId.trim().length))),
    [calendarIds]
  );
  const [calendars, setCalendars] = useState<CalendarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!normalizedCalendarIds.length) {
      setCalendars([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void listCalendarsByIds(normalizedCalendarIds)
      .then((nextCalendars) => {
        if (cancelled) {
          return;
        }

        setCalendars(nextCalendars);
        setLoading(false);
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : 'Kalender konnten nicht geladen werden.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedCalendarIds]);

  return {
    calendars,
    loading,
    error,
  };
}
