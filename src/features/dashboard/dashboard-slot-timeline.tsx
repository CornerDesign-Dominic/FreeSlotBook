import { useMemo } from 'react';
import type { RefObject } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { CalendarSlotRecord } from '../mvp/types';
import { useTranslation } from '../../i18n/provider';
import {
  clipIntervalToWindow,
  intervalIntersectsWindow,
  type TimelineWindow,
} from './dashboard-timeline-utils';
import { DashboardReadonlyTimeline } from './dashboard-readonly-timeline';

export function DashboardSlotTimeline(props: {
  slots: CalendarSlotRecord[];
  loading: boolean;
  error: string | null;
  window: TimelineWindow;
  scrollRef: RefObject<ScrollView | null>;
  onScroll: (x: number) => void;
}) {
  const { t, language } = useTranslation();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const items = useMemo(
    () =>
      props.slots
        .filter((slot) => intervalIntersectsWindow(slot.startsAt, slot.endsAt, props.window))
        .map((slot) => {
          const clipped = clipIntervalToWindow(slot.startsAt!, slot.endsAt!, props.window);

          if (!clipped) {
            return null;
          }

          const primaryLabel = `${slot.startsAt!.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          })} - ${slot.endsAt!.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          })}`;

          let secondaryLabel = t('day.statusAvailable');

          if (slot.status === 'booked') {
            secondaryLabel = t('day.statusBooked');
          } else if (slot.status === 'inactive') {
            secondaryLabel = t('day.statusInactive');
          }

          return {
            id: slot.id,
            start: clipped.start,
            end: clipped.end,
            primaryLabel,
            secondaryLabel,
            backgroundColor:
              slot.status === 'inactive' ? '#ededed' : slot.status === 'booked' ? '#f1f1f1' : 'white',
            borderColor: slot.status === 'inactive' ? '#666666' : 'black',
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [locale, props.slots, props.window, t]
  );

  if (props.loading) {
    return (
      <View style={{ borderWidth: 1, borderColor: 'black', padding: 16 }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View>
      <DashboardReadonlyTimeline
        items={items}
        window={props.window}
        locale={locale}
        emptyLabel={t('dashboard.slotTimelineEmpty')}
        scrollRef={props.scrollRef}
        onScroll={props.onScroll}
      />
      {props.error ? <Text style={{ color: 'black', marginTop: 12 }}>{props.error}</Text> : null}
    </View>
  );
}
