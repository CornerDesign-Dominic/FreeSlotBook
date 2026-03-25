import { useEffect, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { AppScreenHeader } from '../../src/components/app-screen-header';
import { getOwnerCalendar, getUserProfileByUsername } from '../../src/domain/repository';
import type { CalendarRecord, OwnerProfile } from '../../src/domain/types';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '../../src/theme/ui';

export default function UserProfileRouteScreen() {
  const { t } = useTranslation();
  const { uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const params = useLocalSearchParams<{ username?: string | string[] }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username ?? '';
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [calendar, setCalendar] = useState<CalendarRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const nextProfile = await getUserProfileByUsername(username);

        if (!nextProfile) {
          throw new Error('Zu diesem Nutzer-Link wurde kein Nutzer gefunden.');
        }

        const nextCalendar = nextProfile.defaultCalendarId
          ? await getOwnerCalendar(nextProfile.defaultCalendarId)
          : null;

        if (!cancelled) {
          setProfile(nextProfile);
          setCalendar(nextCalendar);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Der Nutzer-Link konnte nicht geladen werden.');
          setProfile(null);
          setCalendar(null);
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
  }, [username]);

  if (loading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Nutzer-Link" />

      <View style={uiStyles.panel}>
        {profile ? (
          <>
            <Text style={uiStyles.sectionTitle}>{profile.username ?? username}</Text>
            <Text style={uiStyles.secondaryText}>
              Dieser Link identifiziert den Slotly-Nutzer, nicht direkt einen Kalender.
            </Text>
          </>
        ) : (
          <Text style={uiStyles.secondaryText}>
            {error ?? 'Zu diesem Nutzer-Link wurde kein Nutzer gefunden.'}
          </Text>
        )}
      </View>

      {calendar?.visibility === 'public' && calendar.publicSlug ? (
        <View style={uiStyles.panel}>
          <Text style={uiStyles.bodyText}>
            Der Standardkalender dieses Nutzers ist aktuell öffentlich erreichbar.
          </Text>
          <Link href={`/calendar/${calendar.publicSlug}`} asChild>
            <Text style={uiStyles.linkText}>Zum Kalender-Link</Text>
          </Link>
        </View>
      ) : null}
    </ScrollView>
  );
}
