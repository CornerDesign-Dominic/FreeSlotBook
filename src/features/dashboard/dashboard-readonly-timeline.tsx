import { useMemo } from 'react';
import type { RefObject } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { buildOverflowTimelineLayout } from '../../domain/appointment-calendar-utils';
import {
  buildTimelineHourMarkers,
  getDateDividerLabel,
  getTimelineContentWidth,
  getTimelineHourWidth,
  getTimelineItemHeight,
  getTimelineItemTop,
  getTimelinePosition,
  getTimelineTrackHeight,
  splitIntervalAtMidnight,
  type TimelineWindow,
} from './dashboard-timeline-utils';
import { useAppTheme } from '../../theme/ui';

export type DashboardTimelineItem = {
  id: string;
  start: Date;
  end: Date;
  primaryLabel: string;
  secondaryLabel?: string;
  backgroundColor: string;
  borderColor: string;
};

export function DashboardReadonlyTimeline(props: {
  items: DashboardTimelineItem[];
  window: TimelineWindow;
  locale: string;
  emptyLabel: string;
  scrollRef: RefObject<ScrollView | null>;
  onScroll: (x: number) => void;
  maxVisibleLanes?: number;
  overflowLabel?: (count: number) => string;
  onOverflowPress?: (start: Date) => void;
}) {
  const { theme, uiStyles } = useAppTheme();
  const hourMarkers = useMemo(
    () => buildTimelineHourMarkers(props.window, props.locale),
    [props.locale, props.window]
  );
  const dividerLabel = useMemo(
    () => getDateDividerLabel(props.window, props.locale),
    [props.locale, props.window]
  );
  const contentWidth = useMemo(
    () => getTimelineContentWidth(props.window),
    [props.window]
  );
  const hourWidth = getTimelineHourWidth();
  const { visibleItems, overflowItems, laneCount } = useMemo(
    () =>
      props.maxVisibleLanes
        ? buildOverflowTimelineLayout(props.items, props.maxVisibleLanes)
        : {
            visibleItems: props.items.map((item) => ({ item, lane: 0 })),
            overflowItems: [],
            laneCount: 1,
          },
    [props.items, props.maxVisibleLanes]
  );
  const standardLayout = useMemo(
    () => (!props.maxVisibleLanes ? buildOverflowTimelineLayout(props.items, Number.MAX_SAFE_INTEGER) : null),
    [props.items, props.maxVisibleLanes]
  );
  const standardVisibleItems = standardLayout?.visibleItems ?? [];
  const resolvedVisibleItems = props.maxVisibleLanes ? visibleItems : standardVisibleItems;
  const resolvedLaneCount = props.maxVisibleLanes ? laneCount : standardLayout?.laneCount ?? 1;
  const trackHeight = useMemo(() => getTimelineTrackHeight(resolvedLaneCount), [resolvedLaneCount]);
  const itemHeight = getTimelineItemHeight();
  const renderedSegments = useMemo(
    () =>
      resolvedVisibleItems.flatMap(({ item, lane }) =>
        splitIntervalAtMidnight({ start: item.start, end: item.end }, props.window).map(
          (segment, segmentIndex) => ({
            item,
            segment,
            segmentIndex,
            lane,
          })
        )
      ),
    [props.window, resolvedVisibleItems]
  );
  const renderedOverflowSegments = useMemo(
    () =>
      overflowItems.flatMap((item, segmentIndex) =>
        splitIntervalAtMidnight({ start: item.start, end: item.end }, props.window).map((segment) => ({
          item,
          segment,
          segmentIndex,
        }))
      ),
    [overflowItems, props.window]
  );
  const currentTimeLeft = useMemo(
    () => getTimelinePosition(props.window.now, props.window),
    [props.window]
  );
  const midnightLeft = props.window.midnight
    ? getTimelinePosition(props.window.midnight, props.window)
    : null;
  const dividerLabelOffset = dividerLabel ? Math.max(dividerLabel.length * 3.4, 8) : 0;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.large,
        paddingTop: theme.spacing[8],
        paddingBottom: theme.spacing[12],
        paddingHorizontal: 0,
        ...theme.shadow.soft,
      }}>
      <ScrollView
        ref={props.scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => props.onScroll(event.nativeEvent.contentOffset.x)}
        contentContainerStyle={{ minWidth: contentWidth }}>
        <View style={{ width: contentWidth }}>
          <View
            style={{
              position: 'relative',
              height: 10,
              marginBottom: theme.spacing[8],
              justifyContent: 'center',
            }}>
            {hourMarkers.map((marker) => (
              <View
                key={`hour-label-${marker.date.toISOString()}`}
                style={{
                  position: 'absolute',
                  left: marker.left,
                  top: 0,
                  bottom: 0,
                  width: hourWidth,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text
                  style={[
                    uiStyles.metaText,
                    {
                      textAlign: 'center',
                      fontSize: 12,
                      color: theme.colors.textSecondary,
                      lineHeight: 12,
                    },
                  ]}>
                  {marker.label}
                </Text>
              </View>
            ))}

            {props.window.midnight ? (
              <Text
              style={{
                position: 'absolute',
                left: (midnightLeft ?? 0) - dividerLabelOffset,
                top: 0,
                bottom: 0,
                color: theme.colors.textSecondary,
                fontSize: theme.typography.meta,
                fontWeight: '700',
                lineHeight: theme.typography.meta,
                textAlign: 'center',
                textAlignVertical: 'center',
              }}>
              {dividerLabel}
            </Text>
            ) : null}
          </View>

          <View
            style={{
              position: 'relative',
              height: trackHeight,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.medium,
              overflow: 'hidden',
            }}>
            {hourMarkers.map((marker) => (
              <View
                key={`hour-grid-${marker.date.toISOString()}`}
                style={{
                  position: 'absolute',
                  left: marker.left,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  backgroundColor: theme.colors.border,
                  opacity: 0.3,
                }}
              />
            ))}

            {props.window.midnight ? (
              <View
                style={{
                  position: 'absolute',
                  left: midnightLeft ?? 0,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  backgroundColor: theme.colors.border,
                  opacity: 0.5,
                }}
              />
            ) : null}

            <View
              style={{
                position: 'absolute',
                left: currentTimeLeft,
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: theme.colors.accent,
                opacity: 0.72,
              }}
            />

            {renderedSegments.length || renderedOverflowSegments.length ? (
              <>
              {renderedSegments.map(({ item, segment, segmentIndex, lane }) => {
                const left = getTimelinePosition(segment.start, props.window);
                const right = getTimelinePosition(segment.end, props.window);
                const width = Math.max(right - left, 18);

                return (
                  <View
                    key={`${item.id}-${segmentIndex}`}
                    style={{
                      position: 'absolute',
                      left,
                      top: getTimelineItemTop(lane),
                      width,
                      minHeight: itemHeight,
                      paddingHorizontal: theme.spacing[8],
                      paddingVertical: theme.spacing[8],
                      borderWidth: 1,
                      borderColor: item.borderColor,
                      backgroundColor: item.backgroundColor,
                      justifyContent: 'center',
                      borderRadius: theme.radius.small,
                    }}>
                    <Text style={uiStyles.metaText} numberOfLines={1}>
                      {item.primaryLabel}
                    </Text>
                    {item.secondaryLabel && width >= 96 ? (
                      <Text style={[uiStyles.metaText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {item.secondaryLabel}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
              {renderedOverflowSegments.map(({ item, segment, segmentIndex }) => {
                const left = getTimelinePosition(segment.start, props.window);
                const right = getTimelinePosition(segment.end, props.window);
                const width = Math.max(right - left, 36);
                const overflowLabel = props.overflowLabel
                  ? props.overflowLabel(item.hiddenCount)
                  : `+${item.hiddenCount}`;
                const Container = props.onOverflowPress ? Pressable : View;

                return (
                  <Container
                    key={`${item.id}-${segmentIndex}`}
                    {...(props.onOverflowPress
                      ? { onPress: () => props.onOverflowPress?.(item.start) }
                      : {})}
                    style={{
                      position: 'absolute',
                      left,
                      top: getTimelineItemTop(item.lane),
                      width,
                      minHeight: itemHeight,
                      paddingHorizontal: theme.spacing[8],
                      paddingVertical: theme.spacing[8],
                      borderWidth: 1,
                      borderColor: theme.colors.accent,
                      backgroundColor: theme.colors.accentSoft,
                      justifyContent: 'center',
                      borderRadius: theme.radius.small,
                    }}>
                    <Text style={[uiStyles.metaText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {overflowLabel}
                    </Text>
                  </Container>
                );
              })}
              </>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={uiStyles.secondaryText}>{props.emptyLabel}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
