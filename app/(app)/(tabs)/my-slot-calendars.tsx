import { useEffect, useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { OwnedSlotCalendarPreview } from '@/src/components/slot/owned-slot-calendar-preview';
import { SlotCalendarCard } from '@/src/components/slot/slot-calendar-card';
import { getDayKey } from '@/src/domain/calendar-utils';
import { createOwnerCalendar } from '@/src/domain/repository';
import { canCreateAnotherCalendar } from '@/src/domain/subscription-policy';
import type { CalendarRecord } from '@/src/domain/types';
import { useOwnedCalendars } from '@/src/domain/useOwnedCalendars';
import { useOwnerProfile } from '@/src/domain/useOwnerProfile';
import { useAuth } from '@/src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

function CalendarActionLink(props: {
  href: Href;
  label: string;
}) {
  const { uiStyles } = useAppTheme();

  return (
    <View style={{ flex: 1 }}>
      <Link href={props.href} asChild>
        <Pressable style={uiStyles.button}>
          <Text style={[uiStyles.buttonText, { textAlign: 'center' }]}>{props.label}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

export default function MySlotCalendarsScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const isFocused = useIsFocused();
  const authUser = useMemo(
    () => (user?.uid ? { uid: user.uid, email: user.email } : null),
    [user?.email, user?.uid]
  );
  const { profile, loading: profileLoading } = useOwnerProfile(authUser);
  const { records, loading, error, reload, toggleFavorite } = useOwnedCalendars(authUser);
  const [expandedCalendarId, setExpandedCalendarId] = useState<string | null>(null);
  const [copiedCalendarId, setCopiedCalendarId] = useState<string | null>(null);
  const [processingFavoriteCalendarId, setProcessingFavoriteCalendarId] = useState<string | null>(null);
  const [addFormVisible, setAddFormVisible] = useState(false);
  const [newCalendarTitle, setNewCalendarTitle] = useState('');
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
  const todayKey = getDayKey(new Date());
  const subscriptionTier = profile?.subscriptionTier ?? 'free';
  const createCalendarPermission = canCreateAnotherCalendar({
    tier: subscriptionTier,
    currentCalendarCount: records.length,
  });

  useEffect(() => {
    if (isFocused && authUser?.uid) {
      reload();
    }
  }, [authUser?.uid, isFocused, reload]);

  useEffect(() => {
    if (!profileLoading && authUser?.uid) {
      reload();
    }
  }, [authUser?.uid, profileLoading, reload]);

  useEffect(() => {
    if (!copiedCalendarId) {
      return;
    }

    const timeout = setTimeout(() => {
      setCopiedCalendarId(null);
    }, 1800);

    return () => clearTimeout(timeout);
  }, [copiedCalendarId]);

  const handleToggleFavorite = async (calendarId: string, nextIsFavorite: boolean) => {
    setProcessingFavoriteCalendarId(calendarId);

    try {
      await toggleFavorite(calendarId, nextIsFavorite);
    } finally {
      setProcessingFavoriteCalendarId(null);
    }
  };

  const handleCopyCalendarLink = async (calendar: CalendarRecord) => {
    if (!calendar.publicSlug) {
      return;
    }

    try {
      await Clipboard.setStringAsync(`https://slotlyme.app/calendar/${calendar.publicSlug}`);
      setCopiedCalendarId(calendar.id);
    } catch {}
  };

  const handleCreateCalendar = async () => {
    if (!user?.uid || !user.email) {
      return;
    }

    setIsCreatingCalendar(true);

    try {
      const result = await createOwnerCalendar({
        ownerUid: user.uid,
        ownerEmail: user.email,
        title: newCalendarTitle,
      });

      setNewCalendarTitle('');
      setAddFormVisible(false);
      setExpandedCalendarId(result.calendarId);
      reload();
    } finally {
      setIsCreatingCalendar(false);
    }
  };

  if (authLoading || loading || profileLoading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Meine Slot-Kalender" />

      {records.map(({ calendar, isFavorite }) => {
        const isExpanded = expandedCalendarId === calendar.id;

        return (
          <SlotCalendarCard
            key={calendar.id}
            mode="full"
            title={calendar.title}
            publicSlug={calendar.publicSlug}
            missingLinkLabel="Noch kein Kalender-Link vorhanden"
            copyFeedbackVisible={copiedCalendarId === calendar.id}
            onCopyPublicLink={() => {
              void handleCopyCalendarLink(calendar);
            }}
            slots={[]}
            slotsLoading={false}
            slotsError={null}
            expanded={isExpanded}
            onToggleExpand={() =>
              setExpandedCalendarId((currentValue) =>
                currentValue === calendar.id ? null : calendar.id
              )
            }
            panelStyle={
              isExpanded
                ? {
                    borderColor: theme.colors.accent,
                    backgroundColor: theme.colors.accentSoft,
                  }
                : undefined
            }
            headerAccessory={
              <Pressable
                onPress={() => void handleToggleFavorite(calendar.id, !isFavorite)}
                disabled={processingFavoriteCalendarId === calendar.id}
                accessibilityRole="button"
                accessibilityLabel="Favorit umschalten"
                style={{ opacity: processingFavoriteCalendarId === calendar.id ? 0.45 : 1 }}>
                <MaterialIcons
                  name={isFavorite ? 'star' : 'star-outline'}
                  size={18}
                  color={isFavorite ? theme.colors.accent : theme.colors.textSecondary}
                />
              </Pressable>
            }
            timelineContent={<OwnedSlotCalendarPreview calendarId={calendar.id} />}
            settingsHref={{
              pathname: '/calendar-settings',
              params: { calendarId: calendar.id },
            }}
            actions={
              <View style={{ flexDirection: 'row', gap: theme.spacing[8] }}>
                <CalendarActionLink
                  href={{
                    pathname: '/my-calendar/[date]',
                    params: { date: todayKey, calendarId: calendar.id },
                  }}
                  label="Tag"
                />
                <CalendarActionLink
                  href={{
                    pathname: '/my-calendar/week',
                    params: { date: todayKey, calendarId: calendar.id },
                  }}
                  label="Woche"
                />
                <CalendarActionLink
                  href={{
                    pathname: '/my-calendar',
                    params: { calendarId: calendar.id },
                  }}
                  label="Monat"
                />
              </View>
            }
          />
        );
      })}

      <View style={uiStyles.panel}>
        {!addFormVisible ? (
          <View style={{ gap: theme.spacing[12] }}>
            <Pressable
              onPress={() => setAddFormVisible(true)}
              disabled={!createCalendarPermission.allowed}
              style={[
                uiStyles.button,
                uiStyles.buttonActive,
                !createCalendarPermission.allowed ? { opacity: 0.6 } : null,
              ]}>
              <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
                Kalender hinzufügen
              </Text>
            </Pressable>
            {!createCalendarPermission.allowed ? (
              <Text style={uiStyles.secondaryText}>{createCalendarPermission.reason}</Text>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: theme.spacing[12] }}>
            <TextInput
              value={newCalendarTitle}
              onChangeText={setNewCalendarTitle}
              placeholder="Titel für deinen Kalender"
              placeholderTextColor={theme.colors.textSecondary}
              style={uiStyles.input}
            />

            <View style={{ flexDirection: 'row', gap: theme.spacing[8] }}>
              <Pressable
                onPress={() => void handleCreateCalendar()}
                disabled={isCreatingCalendar}
                style={[
                  uiStyles.button,
                  uiStyles.buttonActive,
                  isCreatingCalendar ? { opacity: 0.6 } : null,
                ]}>
                <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
                  {isCreatingCalendar ? 'Wird erstellt...' : 'Bestätigen'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setAddFormVisible(false);
                  setNewCalendarTitle('');
                }}
                style={uiStyles.button}>
                <Text style={uiStyles.buttonText}>Abbrechen</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {error ? <Text style={uiStyles.secondaryText}>{error}</Text> : null}
    </ScrollView>
  );
}
