import { useMemo } from 'react';
import type { RefObject } from 'react';
import { ScrollView, Text, View } from 'react-native';

import {
  assignTimelineLanes,
  buildTimelineHourMarkers,
  getDateDividerLabel,
  getDateDividerWidth,
  getTimelineContentWidth,
  getTimelineItemHeight,
  getTimelineItemTop,
  getTimelinePosition,
  getTimelineTrackHeight,
  splitIntervalAtMidnight,
  type TimelineWindow,
} from './dashboard-timeline-utils';

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

  return (
    <ScrollView
      ref={props.scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(event) => props.onScroll(event.nativeEvent.contentOffset.x)}
      contentContainerStyle={{ minWidth: contentWidth }}>
      <View style={{ width: contentWidth }}>
        <View style={{ position: 'relative', height: 28, marginBottom: 10 }}>
          {hourMarkers.map((marker) => (
            <View
              key={`hour-label-${marker.date.toISOString()}`}
              style={{ position: 'absolute', left: marker.left, top: 0 }}>
              <Text style={{ color: 'black', fontSize: 12 }}>{marker.label}</Text>
            </View>
          ))}

          {props.window.midnight ? (
            <View
              style={{
                position: 'absolute',
                left: getTimelinePosition(props.window.midnight, props.window),
                top: 0,
                bottom: 0,
                width: getDateDividerWidth(),
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'black',
                backgroundColor: '#f3f3f3',
              }}>
              <Text style={{ color: 'black', fontSize: 10 }}>{dividerLabel}</Text>
            </View>
          ) : null}
        </View>

        <View
          style={{
            position: 'relative',
            height: trackHeight,
            borderWidth: 1,
            borderColor: 'black',
            backgroundColor: 'white',
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
                backgroundColor: 'black',
              }}
            />
          ))}

          {props.window.midnight ? (
            <View
              style={{
                position: 'absolute',
                left: getTimelinePosition(props.window.midnight, props.window),
                top: 0,
                bottom: 0,
                width: getDateDividerWidth(),
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: 'black',
                backgroundColor: '#f3f3f3',
              }}
            />
          ) : null}

          <View
            style={{
              position: 'absolute',
              left: currentTimeLeft,
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: 'black',
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
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: item.borderColor,
                    backgroundColor: item.backgroundColor,
                    justifyContent: 'center',
                  }}>
                  <Text style={{ color: 'black', fontSize: 12 }} numberOfLines={1}>
                    {item.primaryLabel}
                  </Text>
                  {item.secondaryLabel && width >= 96 ? (
                    <Text style={{ color: 'black', fontSize: 11 }} numberOfLines={1}>
                      {item.secondaryLabel}
                    </Text>
                  ) : null}
                </View>
              );
            })
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'black' }}>{props.emptyLabel}</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
