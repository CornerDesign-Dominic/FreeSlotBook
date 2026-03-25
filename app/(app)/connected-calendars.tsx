import { useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { useConnectedCalendars } from '@/src/domain/useConnectedCalendars';
import { useAuth } from '@/src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

export default function ConnectedCalendarsScreen() {
  const { user, loading: authLoading } = useAuth();
  const { theme, uiStyles } = useAppTheme();
  const { t } = useTranslation();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const { records, loading, error, toggleFavorite, disconnectCalendar } = useConnectedCalendars(
    user ? { uid: user.uid, email: user.email } : null
  );
  const [expandedCalendarIds, setExpandedCalendarIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [processingFavoriteCalendarId, setProcessingFavoriteCalendarId] = useState<string | null>(null);
  const [removingCalendarId, setRemovingCalendarId] = useState<string | null>(null);

  const favoriteCount = useMemo(
    () => records.filter((record) => record.isFavorite).length,
    [records]
  );

  const toggleExpanded = (calendarId: string) => {
    setExpandedCalendarIds((currentIds) =>
      currentIds.includes(calendarId)
        ? currentIds.filter((currentId) => currentId !== calendarId)
        : [...currentIds, calendarId]
    );
  };

  const handleToggleFavorite = async (calendarId: string, nextIsFavorite: boolean) => {
    setProcessingFavoriteCalendarId(calendarId);
    setMessage(null);

    try {
      await toggleFavorite(calendarId, nextIsFavorite);
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('nav.favoriteSaveError'));
    } finally {
      setProcessingFavoriteCalendarId(null);
    }
  };

  const confirmDisconnectCalendar = (calendarId: string) => {
    Alert.alert(
      t('nav.disconnectCalendarTitle'),
      t('nav.disconnectCalendarBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('nav.disconnectCalendar'),
          style: 'destructive',
          onPress: () => {
            void handleDisconnectCalendar(calendarId);
          },
        },
      ]
    );
  };

  const handleDisconnectCalendar = async (calendarId: string) => {
    setRemovingCalendarId(calendarId);
    setMessage(null);

    try {
      await disconnectCalendar(calendarId);
      setExpandedCalendarIds((currentIds) => currentIds.filter((currentId) => currentId !== calendarId));
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : t('nav.disconnectCalendarError'));
    } finally {
      setRemovingCalendarId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title={t('nav.connectedCalendars')} />

      {records.length ? (
        records.map(({ calendar, isFavorite }) => {
          const isExpanded = expandedCalendarIds.includes(calendar.id);
          const ownerLabel = calendar.ownerEmail || null;
          const slugLabel = calendar.publicSlug || null;

          return (
            <View key={calendar.id} style={uiStyles.panel}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: theme.spacing[12],
                }}>
                <Pressable
                  onPress={() => toggleExpanded(calendar.id)}
                  style={{ flex: 1 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('nav.toggleCalendarDetails')}>
                  <Text style={[uiStyles.sectionTitle, { marginBottom: ownerLabel || slugLabel ? theme.spacing[4] : 0 }]}>
                    {ownerLabel || slugLabel || calendar.id}
                  </Text>
                  {slugLabel ? (
                    <Text style={[uiStyles.secondaryText, { marginBottom: ownerLabel ? theme.spacing[4] : 0 }]}>
                      {slugLabel}
                    </Text>
                  ) : null}
                  {ownerLabel && slugLabel !== ownerLabel ? (
                    <Text style={uiStyles.secondaryText}>{ownerLabel}</Text>
                  ) : null}
                </Pressable>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12] }}>
                  <Pressable
                    onPress={() => void handleToggleFavorite(calendar.id, !isFavorite)}
                    disabled={processingFavoriteCalendarId === calendar.id}
                    accessibilityRole="button"
                    accessibilityLabel={t('nav.toggleFavorite')}
                    style={{ opacity: processingFavoriteCalendarId === calendar.id ? 0.45 : 1 }}>
                    <Feather
                      name="star"
                      size={18}
                      color={isFavorite ? theme.colors.accent : theme.colors.textSecondary}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => toggleExpanded(calendar.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('nav.openCalendarDetails')}>
                    <Feather
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.colors.textPrimary}
                    />
                  </Pressable>
                </View>
              </View>

              {isExpanded ? (
                <View style={[uiStyles.listItem, { marginTop: theme.spacing[12] }]}>
                  <View
                    style={[
                      uiStyles.subtlePanel,
                      {
                        minHeight: 56,
                        marginBottom: theme.spacing[12],
                        backgroundColor: theme.colors.surfaceSoft,
                      },
                    ]}
                  />

                  <Pressable
                    onPress={() => confirmDisconnectCalendar(calendar.id)}
                    disabled={removingCalendarId === calendar.id}
                    style={[
                      uiStyles.button,
                      { opacity: removingCalendarId === calendar.id ? 0.6 : 1 },
                    ]}>
                    <Text style={uiStyles.buttonText}>{t('nav.disconnectCalendar')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })
      ) : (
        <View style={uiStyles.panel}>
          <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[4] }]}>
            {t('nav.connectedCalendarsEmptyTitle')}
          </Text>
          <Text style={uiStyles.secondaryText}>{t('nav.connectedCalendarsEmptyDescription')}</Text>
        </View>
      )}

      {favoriteCount > 5 ? <Text style={uiStyles.secondaryText}>{t('nav.maxFavorites')}</Text> : null}
      {message ? <Text style={uiStyles.bodyText}>{message}</Text> : null}
      {error ? <Text style={uiStyles.secondaryText}>{error}</Text> : null}
    </ScrollView>
  );
}
