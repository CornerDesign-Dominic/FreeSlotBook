import { useMemo } from 'react';
import type { RefObject } from 'react';
import { ScrollView, Text, View } from 'react-native';

import {
  assignTimelineLanes,
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
import { theme, uiStyles } from '../../theme/ui';

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
}) {
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
  const { laneByItemId, laneCount } = useMemo(
    () => assignTimelineLanes(props.items),
    [props.items]
  );
  const trackHeight = useMemo(() => getTimelineTrackHeight(laneCount), [laneCount]);
  const itemHeight = getTimelineItemHeight();
  const renderedSegments = useMemo(
    () =>
      props.items.flatMap((item) =>
        splitIntervalAtMidnight({ start: item.start, end: item.end }, props.window).map(
          (segment, segmentIndex) => ({
            item,
            segment,
            segmentIndex,
            lane: laneByItemId.get(item.id) ?? 0,
          })
        )
      ),
    [laneByItemId, props.items, props.window]
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
          <View style={{ position: 'relative', height: 18, marginBottom: theme.spacing[8] }}>
            {hourMarkers.map((marker) => (
              <View
                key={`hour-label-${marker.date.toISOString()}`}
                style={{
                  position: 'absolute',
                  left: marker.left,
                  top: 0,
                  width: hourWidth,
                  alignItems: 'center',
                }}>
                <Text
                  style={[
                    uiStyles.metaText,
                    {
                      textAlign: 'center',
                      fontSize: 12,
                      color: theme.colors.textSecondary,
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
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.meta,
                  fontWeight: '700',
                  textAlign: 'center',
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

            {renderedSegments.length ? (
              renderedSegments.map(({ item, segment, segmentIndex, lane }) => {
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
              })
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
