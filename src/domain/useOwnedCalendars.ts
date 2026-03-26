import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ensureOwnerAccountSetup,
  listOwnedCalendars,
  setConnectedCalendarFavorite,
  subscribeToConnectedCalendarFavorites,
} from './repository';
import type { CalendarRecord } from './types';

type OwnedCalendarItem = {
  calendar: CalendarRecord;
  isFavorite: boolean;
};

export function useOwnedCalendars(user: { uid: string; email: string | null } | null) {
  const [calendars, setCalendars] = useState<CalendarRecord[]>([]);
  const [favoriteCalendarIds, setFavoriteCalendarIds] = useState<string[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const reload = useCallback(() => {
    setRefreshVersion((currentValue) => currentValue + 1);
  }, []);

  useEffect(() => {
    if (!user?.uid || !user.email) {
      setCalendars([]);
      setError(null);
      setCalendarsLoading(false);
      return;
    }

    const ownerUid = user.uid;
    const ownerEmail = user.email;
    let isCancelled = false;

    async function loadCalendars() {
      setCalendarsLoading(true);
      setError(null);

      try {
        await ensureOwnerAccountSetup({
          uid: ownerUid,
          email: ownerEmail,
        });
        const nextCalendars = await listOwnedCalendars(ownerUid);

        if (isCancelled) {
          return;
        }

        setCalendars(nextCalendars);
        setCalendarsLoading(false);
      } catch (nextError) {
        if (isCancelled) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Die eigenen Kalender konnten nicht geladen werden.'
        );
        setCalendarsLoading(false);
      }
    }

    void loadCalendars();

    return () => {
      isCancelled = true;
    };
  }, [refreshVersion, user?.email, user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setFavoriteCalendarIds([]);
      setFavoritesLoading(false);
      return;
    }

    setFavoritesLoading(true);

    const unsubscribe = subscribeToConnectedCalendarFavorites(
      user.uid,
      (nextFavoriteCalendarIds) => {
        setFavoriteCalendarIds(nextFavoriteCalendarIds);
        setFavoritesLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setFavoritesLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const records = useMemo<OwnedCalendarItem[]>(
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

  return {
    records,
    loading: calendarsLoading || favoritesLoading,
    error,
    reload,
    toggleFavorite,
  };
}
