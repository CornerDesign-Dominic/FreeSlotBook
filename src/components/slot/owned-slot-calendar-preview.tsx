import { useEffect, useMemo, useRef, useState } from 'react';
import type { ScrollView as ScrollViewType } from 'react-native';
import { View } from 'react-native';

import { useOwnerSlots } from '@/src/domain/useOwnerSlots';
import { DashboardSlotTimeline } from '@/src/features/dashboard/dashboard-slot-timeline';
import {
  createRelativeTimelineWindow,
  getInitialTimelineOffset,
} from '@/src/features/dashboard/dashboard-timeline-utils';

export function OwnedSlotCalendarPreview(props: { calendarId: string }) {
  const { slots, loading, error } = useOwnerSlots(props.calendarId);
  const [viewportWidth, setViewportWidth] = useState(0);
  const timelineRef = useRef<ScrollViewType | null>(null);
  const timelineWindow = useMemo(() => createRelativeTimelineWindow(new Date()), []);

  useEffect(() => {
    if (!viewportWidth || !timelineRef.current) {
      return;
    }

    const initialOffset = getInitialTimelineOffset(timelineWindow, viewportWidth);
    timelineRef.current.scrollTo({ x: initialOffset, animated: false });
  }, [timelineWindow, viewportWidth]);

  return (
    <View
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        setViewportWidth((currentWidth) =>
          Math.abs(currentWidth - nextWidth) < 1 ? currentWidth : nextWidth
        );
      }}>
      <DashboardSlotTimeline
        slots={slots}
        loading={loading}
        error={error}
        window={timelineWindow}
        scrollRef={timelineRef}
        onScroll={() => {}}
      />
    </View>
  );
}
