import { useEffect, useMemo, useState } from 'react';

import {
  isSlotlymeUserIdAvailable,
  validateSlotlymeUserIdInput,
} from '@/src/domain/repository';

type SlotlymeIdAvailabilityState = {
  normalizedValue: string;
  formatError: string | null;
  availabilityMessage: string | null;
  isAvailable: boolean;
  isChecking: boolean;
  isValid: boolean;
};

export function useSlotlymeIdAvailability(value: string) {
  const normalizedValue = useMemo(() => value.trim().toLowerCase(), [value]);
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
      validateSlotlymeUserIdInput(normalizedValue);
      setFormatError(null);
    } catch (error) {
      setFormatError(error instanceof Error ? error.message : 'Bitte prüfe deine Slotlyme ID.');
      setAvailabilityMessage(null);
      setIsAvailable(false);
      setIsChecking(false);
      return () => {
        isCancelled = true;
      };
    }

    setIsChecking(true);
    setAvailabilityMessage('Slotlyme ID wird geprüft ...');
    setIsAvailable(false);

    void isSlotlymeUserIdAvailable(normalizedValue)
      .then((available) => {
        if (isCancelled) {
          return;
        }

        setIsAvailable(available);
        setAvailabilityMessage(
          available ? 'Diese Slotlyme ID ist verfügbar.' : 'Diese Slotlyme ID ist bereits vergeben.'
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
  }, [normalizedValue]);

  return {
    normalizedValue,
    formatError,
    availabilityMessage,
    isAvailable,
    isChecking,
    isValid: Boolean(normalizedValue) && !formatError,
  } satisfies SlotlymeIdAvailabilityState;
}
