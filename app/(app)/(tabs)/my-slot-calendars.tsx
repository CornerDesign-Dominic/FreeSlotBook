import { useEffect, useMemo, useRef, useState } from 'react';
import type { ScrollView as ScrollViewType } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ScrollView, Text, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { SlotCalendarCard } from '@/src/components/slot/slot-calendar-card';
import {
  createRelativeTimelineWindow,
  getInitialTimelineOffset,
} from '@/src/features/dashboard/dashboard-timeline-utils';
import { useOwnerCalendar } from '@/src/domain/useOwnerCalendar';
import { useOwnerSlots } from '@/src/domain/useOwnerSlots';
import { useAuth } from '@/src/firebase/useAuth';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

export default function MySlotCalendarsScreen() {
  const { user, loading: authLoading } = useAuth();
  const { uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const authUser = useMemo(
    () => (user?.uid ? { uid: user.uid, email: user.email } : null),
    [user?.email, user?.uid]
  );
  const { calendar, loading: calendarLoading } = useOwnerCalendar(authUser);
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(calendar?.id ?? null);
  const publicSlug = calendar?.publicSlug ?? null;
  const publicCalendarUrl = publicSlug ? `https://slotlyme.app/calendar/${publicSlug}` : null;
  const [timelineNow, setTimelineNow] = useState(() => new Date());
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);
  const [copyFeedbackVisible, setCopyFeedbackVisible] = useState(false);
  const timelineWindow = useMemo(() => createRelativeTimelineWindow(timelineNow), [timelineNow]);
  const slotTimelineRef = useRef<ScrollViewType | null>(null);

  useEffect(() => {
    setTimelineNow(new Date());
  }, []);

  useEffect(() => {
    if (!copyFeedbackVisible) {
      return;
    }

    const timeout = setTimeout(() => {
      setCopyFeedbackVisible(false);
    }, 1800);

    return () => clearTimeout(timeout);
  }, [copyFeedbackVisible]);

  useEffect(() => {
    if (authLoading || calendarLoading || slotsLoading || !timelineViewportWidth) {
      return;
    }

    let cancelled = false;
    let frameHandle = 0;

    const scrollToNow = () => {
      if (cancelled) {
        return;
      }

      if (!slotTimelineRef.current) {
        frameHandle = requestAnimationFrame(scrollToNow);
        return;
      }

      const initialOffset = getInitialTimelineOffset(timelineWindow, timelineViewportWidth);
      slotTimelineRef.current.scrollTo({ x: initialOffset, animated: false });
    };

    frameHandle = requestAnimationFrame(scrollToNow);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameHandle);
    };
  }, [authLoading, calendarLoading, slotsLoading, timelineViewportWidth, timelineWindow]);

  const handleTimelineViewportLayout = (width: number) => {
    setTimelineViewportWidth((currentWidth) => {
      if (Math.abs(currentWidth - width) < 1) {
        return currentWidth;
      }

      return width;
    });
  };

  const handleCopyPublicLink = async () => {
    if (!publicCalendarUrl) {
      return;
    }

    await Clipboard.setStringAsync(publicCalendarUrl);
    setCopyFeedbackVisible(true);
  };

  if (authLoading || calendarLoading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>Wird geladen...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Meine Slot-Kalender" />

      <SlotCalendarCard
        mode="full"
        publicSlug={publicSlug}
        copyFeedbackVisible={copyFeedbackVisible}
        onCopyPublicLink={() => {
          void handleCopyPublicLink();
        }}
        slots={slots}
        slotsLoading={slotsLoading}
        slotsError={slotsError}
        timelineWindow={timelineWindow}
        slotTimelineRef={slotTimelineRef}
        onSlotTimelineScroll={() => {}}
        onTimelineViewportLayout={handleTimelineViewportLayout}
        settingsHref="/calendar-settings"
      />
    </ScrollView>
  );
}
