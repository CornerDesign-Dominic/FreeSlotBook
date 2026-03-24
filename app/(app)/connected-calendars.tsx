import { useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { acceptCalendarInvite, rejectCalendarInvite } from '@/src/domain/repository';
import { useConnectedCalendars } from '@/src/domain/useConnectedCalendars';
import { usePendingCalendarInvites } from '@/src/domain/usePendingCalendarInvites';
import { useAuth } from '@/src/firebase/useAuth';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

export default function ConnectedCalendarsScreen() {
  const { user, loading: authLoading } = useAuth();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const { records, loading, error, toggleFavorite, disconnectCalendar } = useConnectedCalendars(
    user ? { uid: user.uid, email: user.email } : null
  );
  const {
    records: inviteRecords,
    loading: invitesLoading,
    error: invitesError,
  } = usePendingCalendarInvites(user?.uid ?? null);
  const [expandedCalendarIds, setExpandedCalendarIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [processingFavoriteCalendarId, setProcessingFavoriteCalendarId] = useState<string | null>(null);
  const [removingCalendarId, setRemovingCalendarId] = useState<string | null>(null);
  const [processingInviteCalendarId, setProcessingInviteCalendarId] = useState<string | null>(null);

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
      setMessage(nextError instanceof Error ? nextError.message : 'Favorit konnte nicht gespeichert werden.');
    } finally {
      setProcessingFavoriteCalendarId(null);
    }
  };

  const confirmDisconnectCalendar = (calendarId: string) => {
    Alert.alert(
      'Verbindung entfernen?',
      'Der Zugriff auf diesen Kalender wird entfernt. FÃ¼r einen erneuten Zugriff muss eine neue Anfrage gesendet werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen',
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
      setMessage(nextError instanceof Error ? nextError.message : 'Verbindung konnte nicht entfernt werden.');
    } finally {
      setRemovingCalendarId(null);
    }
  };

  const handleAcceptInvite = async (calendarId: string) => {
    if (!user?.uid) {
      return;
    }

    setProcessingInviteCalendarId(calendarId);
    setMessage(null);

    try {
      await acceptCalendarInvite({ calendarId, invitedUid: user.uid });
      setMessage('Einladung angenommen');
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : 'Einladung konnte nicht angenommen werden.');
    } finally {
      setProcessingInviteCalendarId(null);
    }
  };

  const handleRejectInvite = async (calendarId: string) => {
    if (!user?.uid) {
      return;
    }

    setProcessingInviteCalendarId(calendarId);
    setMessage(null);

    try {
      await rejectCalendarInvite({ calendarId, invitedUid: user.uid });
      setMessage('Einladung abgelehnt');
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : 'Einladung konnte nicht abgelehnt werden.');
    } finally {
      setProcessingInviteCalendarId(null);
    }
  };

  if (authLoading || loading || invitesLoading) {
    return (
      <View style={uiStyles.centeredLoading}>
        <Text style={uiStyles.secondaryText}>Wird geladen</Text>
      </View>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Verbundene Kalender" />

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>
          Kalendereinladungen
        </Text>
        {inviteRecords.length ? (
          inviteRecords.map(({ invite, calendar }) => {
            const inviteLabel = calendar?.ownerUsername || calendar?.ownerEmail || invite.calendarId;
            const slugLabel = calendar?.publicSlug || null;
            const isProcessing = processingInviteCalendarId === invite.calendarId;

            return (
              <View key={`${invite.calendarId}:${invite.invitedUid}`} style={uiStyles.listItem}>
                <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>{inviteLabel}</Text>
                {slugLabel ? (
                  <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[4] }]}>
                    /calendar/{slugLabel}
                  </Text>
                ) : null}
                {calendar?.ownerEmail && calendar.ownerEmail !== inviteLabel ? (
                  <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
                    {calendar.ownerEmail}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: theme.spacing[12] }}>
                  <Pressable
                    onPress={() => void handleAcceptInvite(invite.calendarId)}
                    disabled={isProcessing}
                    style={[uiStyles.button, uiStyles.buttonActive, { flex: 1, opacity: isProcessing ? 0.6 : 1 }]}>
                    <Text style={[uiStyles.buttonText, { color: theme.colors.textPrimary, fontWeight: '600' }]}>
                      Einladung annehmen
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleRejectInvite(invite.calendarId)}
                    disabled={isProcessing}
                    style={[uiStyles.button, { flex: 1, opacity: isProcessing ? 0.6 : 1 }]}>
                    <Text style={uiStyles.buttonText}>Einladung ablehnen</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={uiStyles.secondaryText}>Aktuell liegen keine offenen Kalendereinladungen vor.</Text>
        )}
      </View>

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
                  accessibilityLabel="Kalenderdetails ein- oder ausklappen">
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
                    accessibilityLabel="Favorit umschalten"
                    style={{ opacity: processingFavoriteCalendarId === calendar.id ? 0.45 : 1 }}>
                    <Feather
                      name={isFavorite ? 'star' : 'star'}
                      size={18}
                      color={isFavorite ? theme.colors.accent : theme.colors.textSecondary}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => toggleExpanded(calendar.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Kalenderdetails Ã¶ffnen"
                  >
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
                    <Text style={uiStyles.buttonText}>Entfernen</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })
      ) : (
        <View style={uiStyles.panel}>
          <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[4] }]}>
            Keine verbundenen Kalender
          </Text>
          <Text style={uiStyles.secondaryText}>
            Du hast aktuell keinen Zugriff auf fremde Kalender.
          </Text>
        </View>
      )}

      {favoriteCount > 5 ? <Text style={uiStyles.secondaryText}>Maximal 5 Favoriten</Text> : null}
      {message ? <Text style={uiStyles.bodyText}>{message}</Text> : null}
      {error ? <Text style={uiStyles.secondaryText}>{error}</Text> : null}
      {invitesError ? <Text style={uiStyles.secondaryText}>{invitesError}</Text> : null}
    </ScrollView>
  );
}
