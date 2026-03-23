import { useEffect, useMemo, useState } from 'react';

import {
  isCalendarPublicSlugAvailable,
  validateCalendarPublicSlugInput,
} from '@/src/domain/repository';

type AvailabilityState = {
  normalizedValue: string;
  formatError: string | null;
  availabilityMessage: string | null;
  isAvailable: boolean;
  isChecking: boolean;
  isValid: boolean;
};

export function useCalendarIdAvailability(
  value: string,
  currentCalendarId?: string | null
): AvailabilityState {
  const normalizedValue = useMemo(() => value.trim(), [value]);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    if (!normalizedValue) {
      setFormatError(null);
      setAvailabilityMessage(null);
      setIsAvailable(false);
      setIsChecking(false);
      return () => {
        isCancelled = true;
      };
    }

    try {
      validateCalendarPublicSlugInput(normalizedValue);
      setFormatError(null);
    } catch (error) {
      setFormatError(error instanceof Error ? error.message : 'Bitte prüfe deine Kalender-ID.');
      setAvailabilityMessage(null);
      setIsAvailable(false);
      setIsChecking(false);
      return () => {
        isCancelled = true;
      };
    }

    setIsChecking(true);
    setAvailabilityMessage('Kalender-ID wird geprüft ...');
    setIsAvailable(false);

    void isCalendarPublicSlugAvailable(normalizedValue, currentCalendarId)
      .then((available) => {
        if (isCancelled) {
          return;
        }

        setIsAvailable(available);
        setAvailabilityMessage(
          available ? 'Diese Kalender-ID ist verfügbar.' : 'Diese Kalender-ID ist bereits vergeben.'
        );
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setIsAvailable(false);
        setAvailabilityMessage('Die Verfügbarkeit konnte gerade nicht geprüft werden.');
      })
      .finally(() => {
        if (isCancelled) {
          return;
        }

        setIsChecking(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [currentCalendarId, normalizedValue]);

  return {
    normalizedValue,
    formatError,
    availabilityMessage,
    isAvailable,
    isChecking,
    isValid: Boolean(normalizedValue) && !formatError,
  };
}
