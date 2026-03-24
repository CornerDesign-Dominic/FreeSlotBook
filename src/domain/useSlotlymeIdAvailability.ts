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

const AVAILABILITY_DEBOUNCE_MS = 1500;

export function useSlotlymeIdAvailability(value: string) {
  const normalizedValue = useMemo(() => value, [value]);
  const [debouncedValue, setDebouncedValue] = useState(normalizedValue);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [checkedValue, setCheckedValue] = useState('');
  const [isRequestPending, setIsRequestPending] = useState(false);

  const formatError = useMemo(() => {
    if (!normalizedValue.trim()) {
      return null;
    }

    try {
      validateSlotlymeUserIdInput(normalizedValue);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Bitte pruefe deine Slotlyme ID.';
    }
  }, [normalizedValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(normalizedValue);
    }, AVAILABILITY_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [normalizedValue]);

  useEffect(() => {
    let isCancelled = false;

    if (!debouncedValue || formatError) {
      setAvailabilityMessage(null);
      setIsAvailable(false);
      setCheckedValue('');
      setIsRequestPending(false);
      return () => {
        isCancelled = true;
      };
    }

    setIsRequestPending(true);

    void isSlotlymeUserIdAvailable(debouncedValue)
      .then((available) => {
        if (isCancelled) {
          return;
        }

        setCheckedValue(debouncedValue);
        setIsAvailable(available);
        setAvailabilityMessage(
          available ? 'Diese Slotlyme ID ist verfuegbar.' : 'Diese Slotlyme ID ist bereits vergeben.'
        );
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setCheckedValue(debouncedValue);
        setIsAvailable(false);
        setAvailabilityMessage('Die Verfuegbarkeit konnte gerade nicht geprueft werden.');
      })
      .finally(() => {
        if (isCancelled) {
          return;
        }

        setIsRequestPending(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedValue, formatError]);

  const isChecking = Boolean(normalizedValue.trim()) && !formatError && isRequestPending;
  const hasCurrentAvailabilityResult = checkedValue === normalizedValue;
  const currentAvailabilityMessage = isChecking
    ? 'Slotlyme ID wird geprueft ...'
    : hasCurrentAvailabilityResult
      ? availabilityMessage
      : null;

  return {
    normalizedValue,
    formatError,
    availabilityMessage: currentAvailabilityMessage,
    isAvailable: hasCurrentAvailabilityResult && isAvailable,
    isChecking,
    isValid: Boolean(normalizedValue.trim()) && !formatError,
  } satisfies SlotlymeIdAvailabilityState;
}
