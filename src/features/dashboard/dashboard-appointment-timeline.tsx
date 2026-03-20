import { useMemo } from 'react';
import type { RefObject } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { AppointmentRecord } from '../mvp/types';
import { useTranslation } from '@/src/i18n/provider';
import {
  clipIntervalToWindow,
  intervalIntersectsWindow,
  type TimelineWindow,
} from './dashboard-timeline-utils';
import { DashboardReadonlyTimeline } from './dashboard-readonly-timeline';
import { theme, uiStyles } from '../../theme/ui';

export function DashboardAppointmentTimeline(props: {
  appointments: AppointmentRecord[];
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
      props.appointments
        .filter((appointment) =>
          intervalIntersectsWindow(appointment.startsAt, appointment.endsAt, props.window)
        )
        .map((appointment) => {
          const clipped = clipIntervalToWindow(
            appointment.startsAt!,
            appointment.endsAt!,
            props.window
          );

          if (!clipped) {
            return null;
          }

          const primaryLabel = `${appointment.startsAt!.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          })} - ${appointment.endsAt!.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          })}`;

          return {
            id: appointment.id,
            start: clipped.start,
            end: clipped.end,
            primaryLabel,
            secondaryLabel:
              appointment.source === 'manual'
                ? t('appointments.sourceManual')
                : t('appointments.sourceSelfService'),
            backgroundColor: theme.colors.surfaceSoft,
            borderColor: theme.colors.border,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [locale, props.appointments, props.window, t]
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
        emptyLabel={t('dashboard.appointmentTimelineEmpty')}
        scrollRef={props.scrollRef}
        onScroll={props.onScroll}
      />
      {props.error ? <Text style={[uiStyles.secondaryText, { marginTop: theme.spacing[12] }]}>{props.error}</Text> : null}
    </View>
  );
}
