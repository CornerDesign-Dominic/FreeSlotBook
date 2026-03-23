import { useEffect, useState } from 'react';

import { subscribeToParticipantAppointments } from './repository';
import type { AppointmentRecord } from './types';

export function useParticipantAppointments(participant: { uid?: string | null; email?: string | null } | string | null) {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!participant || (typeof participant !== 'string' && !participant.uid && !participant.email)) {
      setAppointments([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToParticipantAppointments(
      participant,
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
  }, [participant]);

  return { appointments, loading, error };
}
