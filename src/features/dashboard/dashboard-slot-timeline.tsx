import { useMemo } from 'react';
import type { RefObject } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { CalendarSlotRecord } from '../../domain/types';
import { useTranslation } from '@/src/i18n/provider';
import {
  clipIntervalToWindow,
  intervalIntersectsWindow,
  type TimelineWindow,
} from './dashboard-timeline-utils';
import { DashboardReadonlyTimeline } from './dashboard-readonly-timeline';
import { useAppTheme } from '../../theme/ui';

export function DashboardSlotTimeline(props: {
  slots: CalendarSlotRecord[];
  loading: boolean;
  error: string | null;
  window: TimelineWindow;
  scrollRef: RefObject<ScrollView | null>;
  onScroll: (x: number) => void;
}) {
  const { t, language } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const colors = theme.colors;
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
              slot.status === 'inactive'
                ? colors.accentSoft
                : slot.status === 'booked'
                  ? colors.surfaceSoft
                  : colors.surface,
            borderColor:
              slot.status === 'inactive' ? colors.accent : colors.border,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [colors.accent, colors.accentSoft, colors.border, colors.surface, colors.surfaceSoft, locale, props.slots, props.window, t]
  );

  if (props.loading) {
    return (
      <View style={uiStyles.timelineShell}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
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
      {props.error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{props.error}</Text> : null}
    </View>
  );
}
