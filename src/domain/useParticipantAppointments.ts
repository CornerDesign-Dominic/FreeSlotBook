import { useEffect, useState } from 'react';

import { subscribeToParticipantAppointments } from './repository';
import { getAppointmentLoadErrorMessage } from './repository-shared';
import type { AppointmentRecord } from './types';

export function useParticipantAppointments(participant: { uid?: string | null; email?: string | null } | string | null) {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const participantUid = typeof participant === 'string' ? null : participant?.uid ?? null;
  const participantEmail = typeof participant === 'string' ? participant : participant?.email ?? null;

  useEffect(() => {
    if (!participantUid && !participantEmail) {
      setAppointments([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToParticipantAppointments(
      { uid: participantUid, email: participantEmail },
      (nextAppointments) => {
        setAppointments(nextAppointments);
        setLoading(false);
      },
      (nextError) => {
        setError(getAppointmentLoadErrorMessage(nextError));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [participantEmail, participantUid]);

  return { appointments, loading, error };
}
