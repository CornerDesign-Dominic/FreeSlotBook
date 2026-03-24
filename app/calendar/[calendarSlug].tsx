import { useEffect, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PublicCalendarScreenContent } from '../../src/domain/public-calendar-screen';
import { getCalendarBySlug } from '../../src/domain/repository';
import { useAuth } from '../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme } from '@/src/theme/ui';
import type { CalendarRecord } from '@/src/domain/types';

export default function CalendarSlugScreen() {
  const { t } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const { user, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ calendarSlug?: string | string[] }>();
  const calendarSlug = Array.isArray(params.calendarSlug) ? params.calendarSlug[0] : params.calendarSlug ?? '';
  const [calendar, setCalendar] = useState<CalendarRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const nextCalendar = await getCalendarBySlug(calendarSlug);

        if (!cancelled) {
          setCalendar(nextCalendar);
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

  if (loading || authLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          padding: 16,
          justifyContent: 'center',
        }}>
        <Text style={{ color: theme.colors.textPrimary }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!calendar) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          padding: 16,
          justifyContent: 'center',
        }}>
        <Text style={{ color: theme.colors.textPrimary, marginBottom: 12 }}>{t('public.notPublic')}</Text>
        {error ? <Text style={{ color: theme.colors.textPrimary }}>{error}</Text> : null}
      </View>
    );
  }

  if (calendar.visibility !== 'public') {
    const canRequestAccess = user && user.uid !== calendar.ownerUid;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          padding: 16,
          justifyContent: 'center',
        }}>
        <Text style={{ color: theme.colors.textPrimary, marginBottom: 12, fontSize: 20 }}>
          Privater Kalender
        </Text>
        <Text style={{ color: theme.colors.textPrimary, marginBottom: 12 }}>
          Dieser Kalender ist privat. Wenn du noch keinen Zugriff hast, kannst du eine Zugriffsanfrage senden.
        </Text>

        {canRequestAccess ? (
          <Link
            href={{
              pathname: '/request-calendar-access',
              params: { calendarSlug },
            }}
            asChild>
            <Pressable style={[uiStyles.button, uiStyles.buttonActive, { marginBottom: theme.spacing[12] }]}>
              <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
                Zugriffsanfrage senden
              </Text>
            </Pressable>
          </Link>
        ) : user ? (
          <Text style={{ color: theme.colors.textSecondary }}>
            Du bist der Inhaber dieses Kalenders oder bereits eingeloggt, aber kannst hier keine neue Anfrage stellen.
          </Text>
        ) : (
          <Link href="/login" asChild>
            <Pressable style={uiStyles.button}>
              <Text style={uiStyles.buttonText}>Einloggen, um Zugriff anzufragen</Text>
            </Pressable>
          </Link>
        )}
      </View>
    );
  }

  return (
    <PublicCalendarScreenContent
      calendarId={calendar.id}
      currentPublicPath={`/calendar/${calendarSlug}`}
    />
  );
}
