import type { AppointmentRecord, AppointmentCalendarSettings } from './types';

export type AppointmentTimelineItem = {
  id: string;
  appointment: AppointmentRecord;
  start: Date;
  end: Date;
};

export type TimelineOverflowItem = {
  id: string;
  start: Date;
  end: Date;
  lane: number;
  hiddenCount: number;
  appointmentIds: string[];
};

export type TimelineVisibleItem<T extends { id: string; start: Date; end: Date }> = {
  item: T;
  lane: number;
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function getDayBounds(date: Date) {
  const dayStart = startOfDay(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
}

export function intervalOverlaps(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) {
  return leftStart < rightEnd && leftEnd > rightStart;
}

export function appointmentIntersectsDay(appointment: AppointmentRecord, date: Date) {
  if (!appointment.startsAt || !appointment.endsAt) {
    return false;
  }

  const { dayStart, dayEnd } = getDayBounds(date);
  return intervalOverlaps(appointment.startsAt, appointment.endsAt, dayStart, dayEnd);
}

export function clipAppointmentToDay(appointment: AppointmentRecord, date: Date) {
  if (!appointment.startsAt || !appointment.endsAt) {
    return null;
  }

  const { dayStart, dayEnd } = getDayBounds(date);

  if (!intervalOverlaps(appointment.startsAt, appointment.endsAt, dayStart, dayEnd)) {
    return null;
  }

  return {
    start: appointment.startsAt > dayStart ? appointment.startsAt : dayStart,
    end: appointment.endsAt < dayEnd ? appointment.endsAt : dayEnd,
  };
}

export function applyAppointmentCalendarSettings(
  appointments: AppointmentRecord[],
  settings: AppointmentCalendarSettings
) {
  const hiddenCalendarIds = new Set(settings.hiddenCalendarIds);
  const visibleAppointments = appointments.filter((appointment) => !hiddenCalendarIds.has(appointment.calendarId));

  return {
    visibleAppointments,
    activeAppointments: visibleAppointments.filter((appointment) => appointment.status === 'booked'),
    cancelledAppointments: visibleAppointments.filter((appointment) => appointment.status === 'cancelled'),
  };
}

export function getAppointmentsIntersectingDay(appointments: AppointmentRecord[], date: Date) {
  return appointments.filter((appointment) => appointmentIntersectsDay(appointment, date));
}

export function buildAppointmentCountsByDay(appointments: AppointmentRecord[]) {
  const counts: Record<string, number> = {};

  for (const appointment of appointments) {
    if (!appointment.startsAt || !appointment.endsAt) {
      continue;
    }

    let cursor = startOfDay(appointment.startsAt);
    const exclusiveEnd = appointment.endsAt;

    while (cursor < exclusiveEnd) {
      if (appointmentIntersectsDay(appointment, cursor)) {
        const key = `${cursor.getFullYear()}-${`${cursor.getMonth() + 1}`.padStart(2, '0')}-${`${cursor.getDate()}`.padStart(2, '0')}`;
        counts[key] = (counts[key] ?? 0) + 1;
      }

      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return counts;
}

function assignUnlimitedLanes<T extends { id: string; start: Date; end: Date }>(items: T[]) {
  const laneEndTimes: Date[] = [];
  const laneByItemId = new Map<string, number>();

  items
    .slice()
    .sort((left, right) => {
      const startDiff = left.start.getTime() - right.start.getTime();
      if (startDiff !== 0) {
        return startDiff;
      }

      const endDiff = left.end.getTime() - right.end.getTime();
      if (endDiff !== 0) {
        return endDiff;
      }

      return left.id.localeCompare(right.id);
    })
    .forEach((item) => {
      let laneIndex = laneEndTimes.findIndex((laneEnd) => laneEnd <= item.start);

      if (laneIndex === -1) {
        laneIndex = laneEndTimes.length;
        laneEndTimes.push(item.end);
      } else {
        laneEndTimes[laneIndex] = item.end;
      }

      laneByItemId.set(item.id, laneIndex);
    });

  return laneByItemId;
}

export function buildOverflowTimelineLayout<T extends { id: string; start: Date; end: Date }>(
  items: T[],
  maxVisibleRows = 3
) {
  const laneByItemId = assignUnlimitedLanes(items);
  const overflowLane = Math.max(maxVisibleRows - 1, 0);
  const hiddenItems = items.filter((item) => (laneByItemId.get(item.id) ?? 0) >= maxVisibleRows);
  const thirdLaneItems = items.filter((item) => (laneByItemId.get(item.id) ?? 0) === overflowLane);

  const overflowSourceItems = Array.from(
    new Map(
      [
        ...hiddenItems,
        ...thirdLaneItems.filter((thirdLaneItem) =>
          hiddenItems.some((hiddenItem) =>
            intervalOverlaps(thirdLaneItem.start, thirdLaneItem.end, hiddenItem.start, hiddenItem.end)
          )
        ),
      ].map((item) => [item.id, item])
    ).values()
  ).sort((left, right) => {
    const startDiff = left.start.getTime() - right.start.getTime();
    if (startDiff !== 0) {
      return startDiff;
    }

    const endDiff = left.end.getTime() - right.end.getTime();
    if (endDiff !== 0) {
      return endDiff;
    }

    return left.id.localeCompare(right.id);
  });

  const overflowItems: TimelineOverflowItem[] = [];

  for (const item of overflowSourceItems) {
    const currentOverflow = overflowItems[overflowItems.length - 1];

    if (!currentOverflow || !intervalOverlaps(currentOverflow.start, currentOverflow.end, item.start, item.end)) {
      overflowItems.push({
        id: `overflow:${item.id}`,
        start: item.start,
        end: item.end,
        lane: overflowLane,
        hiddenCount: 1,
        appointmentIds: [item.id],
      });
      continue;
    }

    currentOverflow.end = currentOverflow.end > item.end ? currentOverflow.end : item.end;

    if (!currentOverflow.appointmentIds.includes(item.id)) {
      currentOverflow.appointmentIds.push(item.id);
      currentOverflow.hiddenCount += 1;
    }
  }

  const overflowAppointmentIds = new Set(overflowItems.flatMap((item) => item.appointmentIds));

  const visibleItems: TimelineVisibleItem<T>[] = items
    .filter((item) => {
      const lane = laneByItemId.get(item.id) ?? 0;
      if (lane < overflowLane) {
        return true;
      }

      if (lane > overflowLane) {
        return false;
      }

      return !overflowAppointmentIds.has(item.id);
    })
    .map((item) => ({
      item,
      lane: laneByItemId.get(item.id) ?? 0,
    }));

  const laneCount = overflowItems.length
    ? maxVisibleRows
    : Math.max(
        visibleItems.length ? Math.max(...visibleItems.map((item) => item.lane + 1)) : 0,
        1
      );

  return {
    visibleItems,
    overflowItems,
    laneCount,
  };
}
