import { useEffect, useState } from 'react';

import { subscribeToOwnerSlot, subscribeToOwnerSlotEvents } from './repository';
import type { CalendarSlotEventRecord, CalendarSlotRecord } from './types';

export function useOwnerSlotDetail(calendarId: string | null, slotId: string | null) {
  const [slot, setSlot] = useState<CalendarSlotRecord | null>(null);
  const [events, setEvents] = useState<CalendarSlotEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!calendarId || !slotId) {
      setSlot(null);
      setEvents([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let slotReady = false;
    let eventsReady = false;

    const finishLoadingIfReady = () => {
      if (slotReady && eventsReady) {
        setLoading(false);
      }
    };

    const unsubscribeSlot = subscribeToOwnerSlot(
      calendarId,
      slotId,
      (nextSlot) => {
        setSlot(nextSlot);
        slotReady = true;
        finishLoadingIfReady();
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      }
    );

    const unsubscribeEvents = subscribeToOwnerSlotEvents(
      calendarId,
      slotId,
      (nextEvents) => {
        setEvents(nextEvents);
        eventsReady = true;
        finishLoadingIfReady();
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeSlot();
      unsubscribeEvents();
    };
  }, [calendarId, slotId]);

  return { slot, events, loading, error };
}
