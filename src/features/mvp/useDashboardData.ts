import { useEffect, useState } from 'react';

import { getDashboardData } from './repository';
import type { DashboardData } from './types';

const emptyDashboardData: DashboardData = {
  ownerProfile: null,
  ownerCalendar: null,
  joinedCalendars: [],
  upcomingAppointments: [],
  recentNotifications: [],
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

        if (!cancelled) {
          setData(nextData);
        }
      } catch (nextError) {
        if (!cancelled) {
          const errorMessage =
            nextError instanceof Error
              ? nextError.message
              : 'Dashboard data could not be loaded.';

          setError(
            errorMessage
          );
          setData(emptyDashboardData);
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
