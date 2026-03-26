import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { useOwnerDaySlots } from '@/src/domain/useOwnerDaySlots';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme } from '@/src/theme/ui';

function formatPreviewDate(date: Date, locale: string) {
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function OwnedSlotCalendarPreview(props: { calendarId: string }) {
  const { theme, uiStyles } = useAppTheme();
  const { language, t } = useTranslation();
  const previewDate = useMemo(() => new Date(), []);
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const { slots, loading, error } = useOwnerDaySlots(props.calendarId, previewDate);

  const summary = useMemo(() => {
    return slots.reduce(
      (accumulator, slot) => {
        accumulator.total += 1;

        if (slot.status === 'available') {
          accumulator.available += 1;
        } else if (slot.status === 'booked') {
          accumulator.booked += 1;
        } else if (slot.status === 'inactive') {
          accumulator.inactive += 1;
        }

        return accumulator;
      },
      { total: 0, available: 0, booked: 0, inactive: 0 }
    );
  }, [slots]);

  if (loading) {
    return <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>;
  }

  if (error) {
    return <Text style={uiStyles.secondaryText}>{error}</Text>;
  }

  return (
    <View style={{ gap: theme.spacing[8] }}>
      <Text style={uiStyles.bodyText}>
        Slots am: {formatPreviewDate(previewDate, locale)}
      </Text>
      <Text style={uiStyles.secondaryText}>{summary.total} Gesamt</Text>
      <Text style={uiStyles.secondaryText}>{summary.available} Offen</Text>
      <Text style={uiStyles.secondaryText}>{summary.booked} Gebucht</Text>
      <Text style={uiStyles.secondaryText}>{summary.inactive} Deaktiviert</Text>
    </View>
  );
}
