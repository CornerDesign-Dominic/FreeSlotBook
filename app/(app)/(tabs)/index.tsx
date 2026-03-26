import { useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { getDayKey } from '@/src/domain/calendar-utils';
import { DashboardAppointmentTimeline } from '../../../src/features/dashboard/dashboard-appointment-timeline';
import { useDashboardData } from '../../../src/domain/useDashboardData';
import { useOwnedCalendars } from '../../../src/domain/useOwnedCalendars';
import { useOwnedSlotSummary } from '../../../src/domain/useOwnedSlotSummary';
import { useAppointmentCalendar } from '../../../src/domain/useAppointmentCalendar';
import { useAuth } from '../../../src/firebase/useAuth';
import { useLogout } from '../../../src/firebase/useLogout';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '../../../src/theme/ui';

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const userUid = user?.uid ?? null;
  const userEmail = user?.email ?? null;
  const { t } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const authUser = useMemo(
    () => (userUid ? { uid: userUid, email: userEmail } : null),
    [userEmail, userUid]
  );
  const { data, loading: dashboardLoading, error } = useDashboardData(authUser);
  const { records: ownedCalendarRecords, loading: ownedCalendarsLoading } = useOwnedCalendars(authUser);
  const { summary: ownedSlotSummary, loading: ownedSlotSummaryLoading } = useOwnedSlotSummary(
    ownedCalendarRecords.map((record) => record.calendar.id)
  );
  const {
    activeAppointments,
    loading: appointmentsLoading,
    error: appointmentsError,
  } = useAppointmentCalendar(authUser);
  const username =
    typeof data.ownerProfile?.username === 'string' && data.ownerProfile.username.trim()
      ? data.ownerProfile.username.trim()
      : typeof data.ownerProfile?.slotlymeId === 'string' && data.ownerProfile.slotlymeId.trim()
        ? data.ownerProfile.slotlymeId.trim()
        : null;
  const publicUserLink = username ? `slotlyme.app/user/${username}` : null;
  const publicUserLinkCopyValue = username ? `https://slotlyme.app/user/${username}` : null;
  const [expandedDashboardCard, setExpandedDashboardCard] = useState<'appointments' | 'slots' | null>(null);
  const { logout: handleLogout, isLoggingOut } = useLogout();
  const todayDateLabel = useMemo(
    () =>
      new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    []
  );

  const handleCopyPublicUserLink = async () => {
    if (!publicUserLinkCopyValue) {
      return;
    }

    await Clipboard.setStringAsync(publicUserLinkCopyValue);
  };

  if (loading || dashboardLoading || ownedCalendarsLoading || ownedSlotSummaryLoading) {
    return (
      <View style={[uiStyles.centeredLoading, { alignItems: 'center' }]}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ScrollView
      style={uiStyles.screen}
      contentContainerStyle={contentContainerStyle}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: theme.spacing[12],
          marginBottom: theme.spacing[16],
        }}>
        <Text
          style={{
            flex: 1,
            color: theme.colors.textPrimary,
            fontSize: theme.typography.sectionTitle,
            fontWeight: '700',
            letterSpacing: -0.2,
          }}>
          {t('dashboard.homeTitle')}
        </Text>
        <Link href="/settings" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.openSettings')}
            style={[
              uiStyles.calendarNavigationButton,
              {
                width: 40,
                height: 40,
                borderRadius: theme.radius.small,
              },
            ]}>
            <Feather name="settings" size={18} color={theme.colors.accent} />
          </Pressable>
        </Link>
      </View>

      <View style={uiStyles.panel}>
        <Pressable
          onPress={() =>
            setExpandedDashboardCard((currentValue) =>
              currentValue === 'appointments' ? null : 'appointments'
            )
          }>
          <Text style={[uiStyles.sectionTitle, { marginBottom: 0 }]}>Meine Termine heute</Text>
          <View style={{ marginTop: theme.spacing[12] }}>
            <DashboardAppointmentTimeline
              appointments={activeAppointments}
              loading={appointmentsLoading}
              error={appointmentsError}
            />
          </View>
        </Pressable>
        {expandedDashboardCard === 'appointments' ? (
          <View style={{ marginTop: theme.spacing[12], flexDirection: 'row', gap: theme.spacing[8] }}>
            <View style={{ flex: 1 }}>
              <Link href={`/my-appointments/${getDayKey(new Date())}`} asChild>
                <Pressable style={uiStyles.button}>
                  <Text style={[uiStyles.buttonText, { textAlign: 'center' }]}>Tag</Text>
                </Pressable>
              </Link>
            </View>
            <View style={{ flex: 1 }}>
              <Link href={`/my-appointments/week?date=${getDayKey(new Date())}`} asChild>
                <Pressable style={uiStyles.button}>
                  <Text style={[uiStyles.buttonText, { textAlign: 'center' }]}>Woche</Text>
                </Pressable>
              </Link>
            </View>
            <View style={{ flex: 1 }}>
              <Link href="/my-appointments" asChild>
                <Pressable style={uiStyles.button}>
                  <Text style={[uiStyles.buttonText, { textAlign: 'center' }]}>Monat</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        ) : null}
      </View>

      <View style={uiStyles.panel}>
        <Pressable
          onPress={() =>
            setExpandedDashboardCard((currentValue) =>
              currentValue === 'slots' ? null : 'slots'
            )
          }>
          <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>
            Slots von heute
          </Text>
          <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
            {todayDateLabel}
          </Text>
          <View style={{ gap: theme.spacing[4] }}>
            <Text style={uiStyles.secondaryText}>{ownedSlotSummary.total} Gesamt</Text>
            <Text style={uiStyles.secondaryText}>{ownedSlotSummary.available} Offen</Text>
            <Text style={uiStyles.secondaryText}>{ownedSlotSummary.booked} Gebucht</Text>
            <Text style={uiStyles.secondaryText}>{ownedSlotSummary.inactive} Deaktiviert</Text>
          </View>
        </Pressable>
        {expandedDashboardCard === 'slots' ? (
          <View
            style={{
              marginTop: theme.spacing[12],
              paddingTop: theme.spacing[12],
              borderTopWidth: 1,
              borderColor: theme.colors.border,
            }}>
            <Link href="/my-slot-calendars" asChild>
              <Pressable style={uiStyles.button}>
                <Text style={uiStyles.buttonText}>Zum Slotkalender</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}
      </View>

      <View style={[uiStyles.panel, { marginBottom: theme.spacing[24] }]}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[4] }]}>
          Slots buchen
        </Text>
        <Pressable
          onPress={() => router.push('/connected-calendars')}
          style={[
            uiStyles.button,
            { marginTop: theme.spacing[12], alignSelf: 'stretch' },
          ]}>
          <Text style={uiStyles.buttonText}>
            {t('dashboard.openConnectedCalendars')}
          </Text>
        </Pressable>
      </View>

      {publicUserLink ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing[12],
            marginBottom: theme.spacing[12],
          }}>
          <Text
            style={[
              uiStyles.secondaryText,
              {
                flex: 1,
                fontSize: 14,
              },
            ]}>
            {publicUserLink}
          </Text>
          <Pressable
            onPress={() => void handleCopyPublicUserLink()}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.copyUserLink')}>
            <Feather
              name="copy"
              size={16}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>
      ) : null}
      {user.email ? (
        <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>{user.email}</Text>
      ) : null}
      {error ? (
        <View style={[uiStyles.subtlePanel, { marginBottom: theme.spacing[12] }]}>
          <Text style={uiStyles.secondaryText}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => {
          void handleLogout();
        }}
        disabled={isLoggingOut}
        style={{ alignSelf: 'flex-start', opacity: isLoggingOut ? 0.6 : 1 }}>
        <Text style={uiStyles.secondaryText}>
          {isLoggingOut ? `${t('dashboard.logout')}...` : t('dashboard.logout')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
