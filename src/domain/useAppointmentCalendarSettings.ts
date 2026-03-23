import { useEffect, useState } from 'react';

import { subscribeToAppointmentCalendarSettings, updateAppointmentCalendarSettings } from './repository';
import { getAppointmentLoadErrorMessage } from './repository-shared';
import type { AppointmentCalendarSettings } from './types';

const defaultSettings: AppointmentCalendarSettings = {
  hiddenCalendarIds: [],
};

export function useAppointmentCalendarSettings(uid: string | null) {
  const [settings, setSettings] = useState<AppointmentCalendarSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setSettings(defaultSettings);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    return subscribeToAppointmentCalendarSettings(
      uid,
      (nextSettings) => {
        setSettings(nextSettings);
        setLoading(false);
      },
      (nextError) => {
        setError(getAppointmentLoadErrorMessage(nextError));
        setLoading(false);
      }
    );
  }, [uid]);

  const setHiddenCalendarIds = async (hiddenCalendarIds: string[]) => {
    if (!uid) {
      throw new Error('Du musst eingeloggt sein.');
    }

    await updateAppointmentCalendarSettings({ uid, hiddenCalendarIds });
  };

  const toggleCalendarVisibility = async (calendarId: string, isHidden: boolean) => {
    const nextHiddenCalendarIds = isHidden
      ? settings.hiddenCalendarIds.filter((currentCalendarId) => currentCalendarId !== calendarId)
      : Array.from(new Set([...settings.hiddenCalendarIds, calendarId]));

    await setHiddenCalendarIds(nextHiddenCalendarIds);
  };

  return {
    settings,
    loading,
    error,
    setHiddenCalendarIds,
    toggleCalendarVisibility,
  };
}
