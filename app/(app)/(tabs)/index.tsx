import { useEffect, useMemo, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { SlotCalendarCard } from '@/src/components/slot/slot-calendar-card';
import { DashboardAppointmentTimeline } from '../../../src/features/dashboard/dashboard-appointment-timeline';
import {
  createRelativeTimelineWindow,
  getInitialTimelineOffset,
} from '../../../src/features/dashboard/dashboard-timeline-utils';
import { useDashboardData } from '../../../src/domain/useDashboardData';
import { useOwnerCalendar } from '../../../src/domain/useOwnerCalendar';
import { useOwnerSlots } from '../../../src/domain/useOwnerSlots';
import { useAppointmentCalendar } from '../../../src/domain/useAppointmentCalendar';
import { useAuth } from '../../../src/firebase/useAuth';
import { useLogout } from '../../../src/firebase/useLogout';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '../../../src/theme/ui';

export default function HomeScreen() {
  const isFocused = useIsFocused();
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
  const {
    calendar: ownerCalendar,
  } = useOwnerCalendar(authUser);
  const activeOwnerCalendar = ownerCalendar ?? data.ownerCalendar;
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(
    activeOwnerCalendar?.id ?? null
  );
  const {
    activeAppointments,
    loading: appointmentsLoading,
    error: appointmentsError,
  } = useAppointmentCalendar(authUser);
  const publicSlug = activeOwnerCalendar?.publicSlug ?? null;
  const publicCalendarUrl = publicSlug ? `https://slotlyme.app/calendar/${publicSlug}` : null;
  const username =
    typeof data.ownerProfile?.username === 'string' && data.ownerProfile.username.trim()
      ? data.ownerProfile.username.trim()
      : typeof data.ownerProfile?.slotlymeId === 'string' && data.ownerProfile.slotlymeId.trim()
        ? data.ownerProfile.slotlymeId.trim()
        : null;
  const publicUserLink = username ? `slotlyme.app/user/${username}` : null;
  const publicUserLinkCopyValue = username ? `https://slotlyme.app/user/${username}` : null;
  const [timelineNow, setTimelineNow] = useState(() => new Date());
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);
  const [copyFeedbackVisible, setCopyFeedbackVisible] = useState(false);
  const { logout: handleLogout, isLoggingOut } = useLogout();
  const timelineWindow = useMemo(() => createRelativeTimelineWindow(timelineNow), [timelineNow]);
  const appointmentTimelineRef = useRef<ScrollView | null>(null);
  const todaySlotCount = useMemo(() => {
    const now = new Date();

    return slots.filter((slot) => {
      if (!slot.startsAt) {
        return false;
      }

      return (
        slot.startsAt.getFullYear() === now.getFullYear() &&
        slot.startsAt.getMonth() === now.getMonth() &&
        slot.startsAt.getDate() === now.getDate()
      );
    }).length;
  }, [slots]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    setTimelineNow(new Date());
  }, [isFocused]);

  useEffect(() => {
    if (!copyFeedbackVisible) {
      return;
    }

    const timeout = setTimeout(() => {
      setCopyFeedbackVisible(false);
    }, 1800);

    return () => clearTimeout(timeout);
  }, [copyFeedbackVisible]);

  useEffect(() => {
    if (
      !isFocused ||
      loading ||
      dashboardLoading ||
      slotsLoading ||
      appointmentsLoading ||
      !timelineViewportWidth
    ) {
      return;
    }

    let cancelled = false;
    let frameHandle = 0;

    const scrollToNow = () => {
      if (cancelled) {
        return;
      }

      if (!appointmentTimelineRef.current) {
        frameHandle = requestAnimationFrame(scrollToNow);
        return;
      }

      const initialOffset = getInitialTimelineOffset(timelineWindow, timelineViewportWidth);
      appointmentTimelineRef.current.scrollTo({ x: initialOffset, animated: false });
    };

    frameHandle = requestAnimationFrame(scrollToNow);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameHandle);
    };
  }, [
    appointmentsLoading,
    dashboardLoading,
    isFocused,
    loading,
    slotsLoading,
    timelineViewportWidth,
    timelineWindow,
  ]);

  const handleTimelineViewportLayout = (width: number) => {
    setTimelineViewportWidth((currentWidth) => {
      if (Math.abs(currentWidth - width) < 1) {
        return currentWidth;
      }

      return width;
    });
  };

  const handleCopyPublicLink = async () => {
    if (!publicCalendarUrl) {
      return;
    }

    await Clipboard.setStringAsync(publicCalendarUrl);
    setCopyFeedbackVisible(true);
  };

  const handleCopyPublicUserLink = async () => {
    if (!publicUserLinkCopyValue) {
      return;
    }

    await Clipboard.setStringAsync(publicUserLinkCopyValue);
  };

  if (loading || dashboardLoading) {
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
          Slotlyme
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
        <Text style={[uiStyles.sectionTitle, { marginBottom: 0 }]}>Termin-Kalender</Text>
        <View
          style={{ marginTop: theme.spacing[12] }}
          onLayout={(event) => handleTimelineViewportLayout(event.nativeEvent.layout.width)}>
          <DashboardAppointmentTimeline
            appointments={activeAppointments}
            loading={appointmentsLoading}
            error={appointmentsError}
            window={timelineWindow}
            scrollRef={appointmentTimelineRef}
            onScroll={() => {}}
          />
        </View>
        <Link href="/appointment-calendar-settings" asChild>
          <Pressable style={{ alignSelf: 'flex-start', marginTop: theme.spacing[12] }}>
            <Text style={uiStyles.linkText}>Termin-Kalender-Einstellungen</Text>
          </Pressable>
        </Link>
      </View>

      <SlotCalendarCard
        mode="compact"
        publicSlug={publicSlug}
        copyFeedbackVisible={copyFeedbackVisible}
        onCopyPublicLink={() => {
          void handleCopyPublicLink();
        }}
        slots={slots}
        slotsLoading={slotsLoading}
        slotsError={slotsError}
        todaySlotCount={todaySlotCount}
        timelineWindow={timelineWindow}
        slotTimelineRef={{ current: null }}
        onSlotTimelineScroll={() => {}}
        overviewHref="/my-slot-calendars"
      />

      <View style={[uiStyles.panel, { marginBottom: theme.spacing[24] }]}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[4] }]}>
          {t('dashboard.sharedCalendars')}
        </Text>
        <Link href="/connected-calendars" asChild>
          <Pressable style={{ alignSelf: 'flex-start', marginTop: theme.spacing[12] }}>
            <Text style={uiStyles.linkText}>
              Zu den Kalendern
            </Text>
          </Pressable>
        </Link>
      </View>

      {user.email ? (
        <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>{user.email}</Text>
      ) : null}
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
            accessibilityLabel="User-Link kopieren">
            <Feather
              name="copy"
              size={16}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>
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
        <Text style={uiStyles.linkText}>
          {isLoggingOut ? `${t('dashboard.logout')}...` : t('dashboard.logout')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
