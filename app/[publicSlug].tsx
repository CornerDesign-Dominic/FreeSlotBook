import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { PublicCalendarScreenContent } from '../src/features/mvp/public-calendar-screen';
import { getPublicCalendarIdBySlug } from '../src/features/mvp/repository';

export default function PublicSlugScreen() {
  const params = useLocalSearchParams<{ publicSlug?: string | string[] }>();
  const publicSlug = Array.isArray(params.publicSlug) ? params.publicSlug[0] : params.publicSlug ?? '';
  const [resolvedCalendarId, setResolvedCalendarId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const calendarId = await getPublicCalendarIdBySlug(publicSlug);

        if (!cancelled) {
          setResolvedCalendarId(calendarId);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Der oeffentliche Kalender konnte nicht geladen werden.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [publicSlug]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black' }}>Wird geladen...</Text>
      </View>
    );
  }

  if (!resolvedCalendarId) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: 'black', marginBottom: 12 }}>
          Dieser oeffentliche Kalender ist aktuell nicht verfuegbar.
        </Text>
        {error ? <Text style={{ color: 'black' }}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <PublicCalendarScreenContent
      calendarId={resolvedCalendarId}
      currentPublicPath={`/${publicSlug}`}
    />
  );
}
