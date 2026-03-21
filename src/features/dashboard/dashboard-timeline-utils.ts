const HOUR_WIDTH = 96;
const PIXELS_PER_MINUTE = HOUR_WIDTH / 60;
const ITEM_HEIGHT = 40;
const LANE_GAP = 8;
const TOP_PADDING = 16;
const MIN_TRACK_HEIGHT = 84;

export type TimelineWindow = {
  now: Date;
  start: Date;
  end: Date;
  midnight: Date | null;
};

export type TimelineHourMarker = {
  date: Date;
  label: string;
  left: number;
};

export type TimelineSegment = {
  start: Date;
  end: Date;
};

export function createRelativeTimelineWindow(now: Date): TimelineWindow {
  const start = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const nextMidnight = new Date(start);
  nextMidnight.setHours(24, 0, 0, 0);

  return {
    now,
    start,
    end,
    midnight: nextMidnight > start && nextMidnight < end ? nextMidnight : null,
  };
}

export function intervalIntersectsWindow(
  startsAt: Date | null,
  endsAt: Date | null,
  window: TimelineWindow
) {
  if (!startsAt || !endsAt) {
    return false;
  }

  return startsAt < window.end && endsAt > window.start;
}

export function clipIntervalToWindow(
  startsAt: Date,
  endsAt: Date,
  window: TimelineWindow
): TimelineSegment | null {
  const start = startsAt > window.start ? startsAt : window.start;
  const end = endsAt < window.end ? endsAt : window.end;

  if (end <= start) {
    return null;
  }

  return { start, end };
}

export function splitIntervalAtMidnight(
  segment: TimelineSegment,
  window: TimelineWindow
) {
  if (!window.midnight) {
    return [segment];
  }

  if (segment.start < window.midnight && segment.end > window.midnight) {
    return [
      { start: segment.start, end: window.midnight },
      { start: window.midnight, end: segment.end },
    ];
  }

  return [segment];
}

export function getTimelineContentWidth(window: TimelineWindow) {
  const minutes = (window.end.getTime() - window.start.getTime()) / 60000;
  return minutes * PIXELS_PER_MINUTE;
}

export function getTimelinePosition(date: Date, window: TimelineWindow) {
  const baseMinutes = (date.getTime() - window.start.getTime()) / 60000;
  return baseMinutes * PIXELS_PER_MINUTE;
}

export function getInitialTimelineOffset(window: TimelineWindow, viewportWidth: number) {
  const contentWidth = getTimelineContentWidth(window);
  const nowPosition = getTimelinePosition(window.now, window);
  const preferredOffset = nowPosition - viewportWidth * 0.5;
  const maxOffset = Math.max(contentWidth - viewportWidth, 0);
  return Math.max(Math.min(preferredOffset, maxOffset), 0);
}

export function buildTimelineHourMarkers(window: TimelineWindow, locale: string) {
  const markers: TimelineHourMarker[] = [];
  const firstMarker = new Date(window.start);
  firstMarker.setMinutes(0, 0, 0);

  if (firstMarker < window.start) {
    firstMarker.setHours(firstMarker.getHours() + 1, 0, 0, 0);
  }

  for (
    const cursor = new Date(firstMarker);
    cursor <= window.end;
    cursor.setHours(cursor.getHours() + 1, 0, 0, 0)
  ) {
    markers.push({
      date: new Date(cursor),
      label: `${cursor.getHours()}`,
      left: getTimelinePosition(cursor, window),
    });
  }

  return markers;
}

export function getTimelineHourWidth() {
  return HOUR_WIDTH;
}

export function getDateDividerLabel(window: TimelineWindow, locale: string) {
  if (!window.midnight) {
    return null;
  }

  const day = window.midnight.getDate();
  const month = window.midnight.getMonth() + 1;
  return `${day}.${month}`;
}

export function assignTimelineLanes<T extends { id: string; start: Date; end: Date }>(
  items: T[]
) {
  const laneEndTimes: Date[] = [];
  const laneByItemId = new Map<string, number>();

  items
    .slice()
    .sort((left, right) => left.start.getTime() - right.start.getTime())
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

  return {
    laneByItemId,
    laneCount: Math.max(laneEndTimes.length, 1),
  };
}

export function getTimelineTrackHeight(laneCount: number) {
  return Math.max(
    MIN_TRACK_HEIGHT,
    TOP_PADDING * 2 + laneCount * ITEM_HEIGHT + Math.max(laneCount - 1, 0) * LANE_GAP
  );
}

export function getTimelineItemTop(laneIndex: number) {
  return TOP_PADDING + laneIndex * (ITEM_HEIGHT + LANE_GAP);
}

export function getTimelineItemHeight() {
  return ITEM_HEIGHT;
}
