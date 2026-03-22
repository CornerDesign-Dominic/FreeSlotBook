import { useEffect, useMemo, useState } from 'react';

import {
  removeConnectedCalendar,
  setConnectedCalendarFavorite,
  subscribeToConnectedCalendarFavorites,
  subscribeToJoinedCalendars,
} from './repository';
import type { CalendarRecord } from './types';

type ConnectedCalendarItem = {
  calendar: CalendarRecord;
  isFavorite: boolean;
};

export function useConnectedCalendars(user: { uid: string; email: string | null } | null) {
  const [calendars, setCalendars] = useState<CalendarRecord[]>([]);
  const [favoriteCalendarIds, setFavoriteCalendarIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid || !user.email) {
      setCalendars([]);
      setFavoriteCalendarIds([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let joinedReady = false;
    let favoritesReady = false;

    const finishLoadingIfReady = () => {
      if (joinedReady && favoritesReady) {
        setLoading(false);
      }
    };

    const unsubscribeCalendars = subscribeToJoinedCalendars(
      user.email,
      (nextCalendars) => {
        setCalendars(nextCalendars);
        joinedReady = true;
        finishLoadingIfReady();
      },
      (nextError) => {
        setError(nextError.message);
        joinedReady = true;
        finishLoadingIfReady();
      }
    );

    const unsubscribeFavorites = subscribeToConnectedCalendarFavorites(
      user.uid,
      (nextFavoriteCalendarIds) => {
        setFavoriteCalendarIds(nextFavoriteCalendarIds);
        favoritesReady = true;
        finishLoadingIfReady();
      },
      (nextError) => {
        setError(nextError.message);
        favoritesReady = true;
        finishLoadingIfReady();
      }
    );

    return () => {
      unsubscribeCalendars();
      unsubscribeFavorites();
    };
  }, [user?.email, user?.uid]);

  const records = useMemo<ConnectedCalendarItem[]>(
    () =>
      calendars.map((calendar) => ({
        calendar,
        isFavorite: favoriteCalendarIds.includes(calendar.id),
      })),
    [calendars, favoriteCalendarIds]
  );

  const toggleFavorite = async (calendarId: string, nextIsFavorite: boolean) => {
    if (!user?.uid) {
      throw new Error('Du musst eingeloggt sein.');
    }

    await setConnectedCalendarFavorite({
      ownerUid: user.uid,
      calendarId,
      isFavorite: nextIsFavorite,
    });
  };

  const disconnectCalendar = async (calendarId: string) => {
    if (!user?.uid || !user.email) {
      throw new Error('Du musst eingeloggt sein.');
    }

    await removeConnectedCalendar({
      ownerUid: user.uid,
      calendarId,
      granteeEmail: user.email,
    });
  };

  return {
    records,
    loading,
    error,
    toggleFavorite,
    disconnectCalendar,
  };
}
