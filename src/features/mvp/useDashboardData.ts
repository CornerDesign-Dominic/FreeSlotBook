import { useEffect, useState } from 'react';

import { DashboardDataLoadError, getDashboardData } from './repository';
import type { DashboardData } from './types';

const emptyDashboardData: DashboardData = {
  ownerProfile: null,
  ownerCalendar: null,
  joinedCalendars: [],
  upcomingAppointments: [],
  recentNotifications: [],
  debug: {
    currentEmail: null,
    normalizedEmail: null,
    ownerSetupOk: false,
    debugQueryName: null,
    debugRawErrorCode: null,
    debugRawErrorMessage: null,
    debugAccessQueryStarted: false,
    debugAccessQuerySucceeded: false,
    debugAccessDocsCount: 0,
    debugJoinedCalendarsLoadSucceeded: false,
    accessRecordsCount: 0,
    accessRecords: [],
    calendarIds: [],
    joinedCalendarsCount: 0,
    joinedCalendarIds: [],
    errorMessage: null,
  },
};

export function useDashboardData(user: { uid: string; email: string | null } | null) {
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.email) {
        setData(emptyDashboardData);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextData = await getDashboardData({ uid: user.uid, email: user.email });

        console.log('useDashboardData:loaded', {
          userEmail: user.email,
          ownerCalendarId: nextData.ownerCalendar?.id ?? null,
          joinedCalendarsCount: nextData.joinedCalendars.length,
          joinedCalendars: nextData.joinedCalendars,
          recentNotificationsCount: nextData.recentNotifications.length,
        });

        if (!cancelled) {
          setData(nextData);
        }
      } catch (nextError) {
        console.log('useDashboardData:error', {
          userEmail: user.email,
          error: nextError,
        });
        if (!cancelled) {
          const errorMessage =
            nextError instanceof Error
              ? nextError.message
              : 'Dashboard data could not be loaded.';

          setError(
            errorMessage
          );
          setData(
            nextError instanceof DashboardDataLoadError
              ? {
                  ...emptyDashboardData,
                  debug: nextError.debug,
                }
              : {
                  ...emptyDashboardData,
                  debug: {
                    currentEmail: user.email,
                    normalizedEmail: user.email.trim().toLowerCase(),
                    ownerSetupOk: false,
                    accessRecordsCount: 0,
                    accessRecords: [],
                    calendarIds: [],
                    joinedCalendarsCount: 0,
                    joinedCalendarIds: [],
                    errorMessage: errorMessage,
                  },
                }
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user?.email, user?.uid]);

  return { data, loading, error };
}
