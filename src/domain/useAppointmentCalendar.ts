import { useMemo } from 'react';

import {
  applyAppointmentCalendarSettings,
  buildAppointmentCountsByDay,
  getAppointmentsIntersectingDay,
} from './appointment-calendar-utils';
import { useAppointmentCalendarSettings } from './useAppointmentCalendarSettings';
import { useParticipantAppointments } from './useParticipantAppointments';

export function useAppointmentCalendar(user: { uid: string; email: string | null } | null) {
  const userUid = user?.uid ?? null;
  const userEmail = user?.email ?? null;
  const participant = useMemo(
    () => (userUid ? { uid: userUid, email: userEmail } : null),
    [userEmail, userUid]
  );
  const {
    appointments,
    loading: appointmentsLoading,
    error: appointmentsError,
  } = useParticipantAppointments(participant);
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
  } = useAppointmentCalendarSettings(user?.uid ?? null);

  const { visibleAppointments, activeAppointments, cancelledAppointments } = useMemo(
    () => applyAppointmentCalendarSettings(appointments, settings),
    [appointments, settings]
  );

  const activeAppointmentCountsByDay = useMemo(
    () => buildAppointmentCountsByDay(activeAppointments),
    [activeAppointments]
  );

  return {
    settings,
    appointments: visibleAppointments,
    activeAppointments,
    cancelledAppointments,
    activeAppointmentCountsByDay,
    getActiveAppointmentsForDay: (date: Date) => getAppointmentsIntersectingDay(activeAppointments, date),
    getCancelledAppointmentsForDay: (date: Date) => getAppointmentsIntersectingDay(cancelledAppointments, date),
    loading: appointmentsLoading || settingsLoading,
    error: appointmentsError ?? settingsError,
    sourceCalendarIds: Array.from(new Set(appointments.map((appointment) => appointment.calendarId).filter(Boolean))),
  };
}
