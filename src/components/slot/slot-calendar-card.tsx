import type { RefObject } from 'react';
import { Feather } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { DashboardSlotTimeline } from '@/src/features/dashboard/dashboard-slot-timeline';
import type { TimelineWindow } from '@/src/features/dashboard/dashboard-timeline-utils';
import type { CalendarSlotRecord } from '@/src/domain/types';
import { useAppTheme } from '@/src/theme/ui';

export function SlotCalendarCard(props: {
  mode: 'compact' | 'full';
  publicSlug: string | null;
  copyFeedbackVisible: boolean;
  onCopyPublicLink: () => void;
  slots: CalendarSlotRecord[];
  slotsLoading: boolean;
  slotsError: string | null;
  todaySlotCount?: number;
  timelineWindow: TimelineWindow;
  slotTimelineRef: RefObject<ScrollView | null>;
  onSlotTimelineScroll: (x: number) => void;
  onTimelineViewportLayout?: (width: number) => void;
  settingsHref?: Href;
  overviewHref?: Href;
}) {
  const { theme, uiStyles } = useAppTheme();

  return (
    <View style={uiStyles.panel}>
      <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>
        Slot-Kalender
      </Text>
      {props.mode === 'compact' ? (
        <>
          <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>
            {`${props.todaySlotCount ?? 0} Slots heute`}
          </Text>
          {props.slotsError ? (
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
              {props.slotsError}
            </Text>
          ) : null}
        </>
      ) : null}
      {props.mode === 'full' && props.publicSlug ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing[12],
            marginBottom: theme.spacing[8],
          }}>
          <Text
            style={[
              uiStyles.secondaryText,
              {
                flex: 1,
                fontSize: 14,
              },
            ]}>
            {`Kalender-Link: /calendar/${props.publicSlug}`}
          </Text>
          <Pressable
            onPress={() => props.onCopyPublicLink()}
            accessibilityRole="button"
            accessibilityLabel="Link kopieren">
            <Feather
              name={props.copyFeedbackVisible ? 'check' : 'copy'}
              size={16}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>
      ) : null}
      {props.mode === 'full' ? (
        <View
          onLayout={(event) =>
            props.onTimelineViewportLayout?.(event.nativeEvent.layout.width)
          }>
          <DashboardSlotTimeline
            slots={props.slots}
            loading={props.slotsLoading}
            error={props.slotsError}
            window={props.timelineWindow}
            scrollRef={props.slotTimelineRef}
            onScroll={props.onSlotTimelineScroll}
          />
        </View>
      ) : null}
      {props.mode === 'full' && props.settingsHref ? (
        <Link href={props.settingsHref} asChild>
          <Pressable style={{ alignSelf: 'flex-start', marginTop: theme.spacing[12] }}>
            <Text style={uiStyles.linkText}>Kalender-Einstellungen</Text>
          </Pressable>
        </Link>
      ) : null}
      {props.overviewHref ? (
        <Link href={props.overviewHref} asChild>
          <Pressable style={{ alignSelf: 'flex-start', marginTop: theme.spacing[12] }}>
            <Text style={uiStyles.linkText}>Zum Slot-Kalender</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}
