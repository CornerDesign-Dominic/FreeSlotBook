import { describe, expect, test } from 'vitest';

import {
  applyAppointmentCalendarSettings,
  appointmentIntersectsDay,
  buildAppointmentCountsByDay,
  buildOverflowTimelineLayout,
} from '../../src/domain/appointment-calendar-utils';
import type { AppointmentRecord } from '../../src/domain/types';

function localDate(year: number, monthIndex: number, day: number, hours: number, minutes: number) {
  return new Date(year, monthIndex, day, hours, minutes, 0, 0);
}

function createAppointment(params: {
  id: string;
  calendarId: string;
  startsAt: Date;
  endsAt: Date;
  status?: AppointmentRecord['status'];
}) {
  return {
    id: params.id,
    calendarId: params.calendarId,
    slotId: `slot-${params.id}`,
    ownerUid: 'owner_1',
    ownerId: 'owner_1',
    bookedByUserId: 'participant_1',
    participantUid: 'participant_1',
    participantName: 'Participant',
    participantPhone: null,
    bookedByEmail: 'participant@example.com',
    bookedByEmailKey: 'participant@example.com',
    participantEmail: 'participant@example.com',
    participantEmailKey: 'participant@example.com',
    guestBooking: false,
    accountCreationRequested: false,
    termsAccepted: true,
    termsAcceptedAt: new Date('2026-03-23T08:00:00.000Z'),
    termsVersion: '2026-03-18',
    privacyAccepted: true,
    privacyAcceptedAt: new Date('2026-03-23T08:00:00.000Z'),
    privacyVersion: '2026-03-18',
    startsAt: params.startsAt,
    endsAt: params.endsAt,
    source: 'self_service',
    status: params.status ?? 'booked',
    createdByUserId: 'participant_1',
    cancelledByUserId: null,
    createdAt: new Date('2026-03-23T08:00:00.000Z'),
    updatedAt: new Date('2026-03-23T08:00:00.000Z'),
    cancelledAt: null,
  } satisfies AppointmentRecord;
}

describe('Appointment calendar logic', () => {
  test('hidden calendar ids are filtered and cancelled appointments are separated', () => {
    const appointments = [
      createAppointment({
        id: 'visible-active',
        calendarId: 'calendar-visible',
        startsAt: localDate(2026, 2, 24, 9, 0),
        endsAt: localDate(2026, 2, 24, 10, 0),
      }),
      createAppointment({
        id: 'visible-cancelled',
        calendarId: 'calendar-visible',
        startsAt: localDate(2026, 2, 24, 11, 0),
        endsAt: localDate(2026, 2, 24, 12, 0),
        status: 'cancelled',
      }),
      createAppointment({
        id: 'hidden-active',
        calendarId: 'calendar-hidden',
        startsAt: localDate(2026, 2, 24, 13, 0),
        endsAt: localDate(2026, 2, 24, 14, 0),
      }),
    ];

    const result = applyAppointmentCalendarSettings(appointments, {
      hiddenCalendarIds: ['calendar-hidden'],
    });

    expect(result.visibleAppointments.map((appointment) => appointment.id)).toEqual([
      'visible-active',
      'visible-cancelled',
    ]);
    expect(result.activeAppointments.map((appointment) => appointment.id)).toEqual(['visible-active']);
    expect(result.cancelledAppointments.map((appointment) => appointment.id)).toEqual(['visible-cancelled']);
  });

  test('day inclusion uses the canonical day-boundary rule', () => {
    const overnightAppointment = createAppointment({
      id: 'overnight',
      calendarId: 'calendar-a',
      startsAt: localDate(2026, 2, 24, 23, 30),
      endsAt: localDate(2026, 2, 25, 1, 30),
    });

    expect(appointmentIntersectsDay(overnightAppointment, localDate(2026, 2, 24, 12, 0))).toBe(true);
    expect(appointmentIntersectsDay(overnightAppointment, localDate(2026, 2, 25, 12, 0))).toBe(true);
    expect(appointmentIntersectsDay(overnightAppointment, localDate(2026, 2, 26, 12, 0))).toBe(false);
  });

  test('month counts include every intersected day and exclude cancelled appointments', () => {
    const counts = buildAppointmentCountsByDay([
      createAppointment({
        id: 'overnight',
        calendarId: 'calendar-a',
        startsAt: localDate(2026, 2, 24, 23, 30),
        endsAt: localDate(2026, 2, 25, 1, 30),
      }),
      createAppointment({
        id: 'single-day',
        calendarId: 'calendar-b',
        startsAt: localDate(2026, 2, 25, 10, 0),
        endsAt: localDate(2026, 2, 25, 11, 0),
      }),
    ]);

    expect(counts['2026-03-24']).toBe(1);
    expect(counts['2026-03-25']).toBe(2);
  });

  test('overlap layout caps visible rows at three and emits an overflow block', () => {
    const layout = buildOverflowTimelineLayout(
      [
        {
          id: 'a',
          start: new Date('2026-03-24T09:00:00.000Z'),
          end: new Date('2026-03-24T10:00:00.000Z'),
        },
        {
          id: 'b',
          start: new Date('2026-03-24T09:05:00.000Z'),
          end: new Date('2026-03-24T10:05:00.000Z'),
        },
        {
          id: 'c',
          start: new Date('2026-03-24T09:10:00.000Z'),
          end: new Date('2026-03-24T10:10:00.000Z'),
        },
        {
          id: 'd',
          start: new Date('2026-03-24T09:15:00.000Z'),
          end: new Date('2026-03-24T10:15:00.000Z'),
        },
      ],
      3
    );

    expect(layout.laneCount).toBe(3);
    expect(layout.visibleItems).toHaveLength(2);
    expect(layout.overflowItems).toHaveLength(1);
    expect(layout.overflowItems[0]?.hiddenCount).toBe(2);
    expect(layout.overflowItems[0]?.lane).toBe(2);
  });
});
