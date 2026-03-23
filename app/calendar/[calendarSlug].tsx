import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { PublicCalendarScreenContent } from '../../src/domain/public-calendar-screen';
import { getPublicCalendarIdBySlug } from '../../src/domain/repository';
import { useTranslation } from '@/src/i18n/provider';

export default function CalendarSlugScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ calendarSlug?: string | string[] }>();
  const calendarSlug = Array.isArray(params.calendarSlug) ? params.calendarSlug[0] : params.calendarSlug ?? '';
  const [resolvedCalendarId, setResolvedCalendarId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const calendarId = await getPublicCalendarIdBySlug(calendarSlug);

        if (!cancelled) {
          setResolvedCalendarId(calendarId);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : t('public.notPublic'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [calendarSlug, t]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!resolvedCalendarId) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black', marginBottom: 12 }}>{t('public.notPublic')}</Text>
        {error ? <Text style={{ color: 'black' }}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <PublicCalendarScreenContent
      calendarId={resolvedCalendarId}
      currentPublicPath={`/calendar/${calendarSlug}`}
    />
  );
}
