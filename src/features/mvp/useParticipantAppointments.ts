import { useEffect, useState } from 'react';

import { subscribeToParticipantAppointments } from './repository';
import type { AppointmentRecord } from './types';

export function useParticipantAppointments(email: string | null) {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setAppointments([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToParticipantAppointments(
      email,
      (nextAppointments) => {
        setAppointments(nextAppointments);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [email]);

  return { appointments, loading, error };
}
