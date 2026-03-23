import { useEffect, useMemo, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Link, Redirect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { logout } from '../../src/firebase/auth';
import { DashboardAppointmentTimeline } from '../../src/features/dashboard/dashboard-appointment-timeline';
import { DashboardSlotTimeline } from '../../src/features/dashboard/dashboard-slot-timeline';
import {
  createRelativeTimelineWindow,
  getInitialTimelineOffset,
} from '../../src/features/dashboard/dashboard-timeline-utils';
import { useDashboardData } from '../../src/domain/useDashboardData';
import { useOwnerCalendar } from '../../src/domain/useOwnerCalendar';
import { useOwnerSlots } from '../../src/domain/useOwnerSlots';
import { useAppointmentCalendar } from '../../src/domain/useAppointmentCalendar';
import { useAuth } from '../../src/firebase/useAuth';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme, useBottomSafeContentStyle } from '../../src/theme/ui';

export default function HomeScreen() {
  const isFocused = useIsFocused();
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);
  const authUser = useMemo(
    () => (user ? { uid: user.uid, email: user.email } : null),
    [user?.email, user?.uid]
  );
  const { data, loading: dashboardLoading, error } = useDashboardData(authUser);
  const {
    calendar: ownerCalendar,
    loading: ownerCalendarLoading,
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
  const visibleJoinedCalendars = data.joinedCalendars.slice(0, 3);
  const publicSlug = activeOwnerCalendar?.publicSlug ?? null;
  const publicCalendarUrl = publicSlug ? `https://slotlyme.app/calendar/${publicSlug}` : null;
  const slotlymeUserId =
    typeof data.ownerProfile?.slotlymeId === 'string' && data.ownerProfile.slotlymeId.trim()
      ? data.ownerProfile.slotlymeId.trim()
      : null;
  const slotlymeProfileLabel = slotlymeUserId ? `slotlyme.app/user/${slotlymeUserId}` : null;
  const slotlymeProfileUrl = slotlymeUserId ? `https://slotlyme.app/user/${slotlymeUserId}` : null;
  const [timelineNow, setTimelineNow] = useState(() => new Date());
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);
  const [copyFeedbackVisible, setCopyFeedbackVisible] = useState(false);
  const [profileCopyFeedbackVisible, setProfileCopyFeedbackVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const timelineWindow = useMemo(() => createRelativeTimelineWindow(timelineNow), [timelineNow]);
  const slotTimelineRef = useRef<ScrollView | null>(null);
  const appointmentTimelineRef = useRef<ScrollView | null>(null);
  const ignoreNextScrollRef = useRef<{ slots: boolean; appointments: boolean }>({
    slots: false,
    appointments: false,
  });

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

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
    if (!profileCopyFeedbackVisible) {
      return;
    }

    const timeout = setTimeout(() => {
      setProfileCopyFeedbackVisible(false);
    }, 1800);

    return () => clearTimeout(timeout);
  }, [profileCopyFeedbackVisible]);

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

      if (!slotTimelineRef.current || !appointmentTimelineRef.current) {
        frameHandle = requestAnimationFrame(scrollToNow);
        return;
      }

      const initialOffset = getInitialTimelineOffset(timelineWindow, timelineViewportWidth);
      slotTimelineRef.current.scrollTo({ x: initialOffset, animated: false });
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

  const syncTimelineScroll = (source: 'slots' | 'appointments', x: number) => {
    if (ignoreNextScrollRef.current[source]) {
      ignoreNextScrollRef.current[source] = false;
      return;
    }

    const target = source === 'slots' ? 'appointments' : 'slots';
    const targetRef =
      target === 'slots' ? slotTimelineRef.current : appointmentTimelineRef.current;

    if (!targetRef) {
      return;
    }

    ignoreNextScrollRef.current[target] = true;
    targetRef.scrollTo({ x, animated: false });
  };

  const handleCopyPublicLink = async () => {
    if (!publicCalendarUrl) {
      return;
    }

    await Clipboard.setStringAsync(publicCalendarUrl);
    setCopyFeedbackVisible(true);
  };

  const handleCopyProfileLink = async () => {
    if (!slotlymeProfileUrl) {
      return;
    }

    await Clipboard.setStringAsync(slotlymeProfileUrl);
    setProfileCopyFeedbackVisible(true);
  };

  if (loading || dashboardLoading) {
    return (
      <View style={[uiStyles.centeredLoading, { alignItems: 'center' }]}>
        <Text style={uiStyles.secondaryText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/" />;
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
          {t('dashboard.title')}
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
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>
          Slot-Kalender
        </Text>
        {publicSlug ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing[12],
              marginBottom: theme.spacing[8],
            }}>
            <Text
              style={[
                uiStyles.secondaryText,
                {
                  flex: 1,
                  fontSize: 14,
                },
              ]}>
              {`Kalender-Link: /calendar/${publicSlug}`}
            </Text>
            <Pressable
              onPress={() => void handleCopyPublicLink()}
              accessibilityRole="button"
              accessibilityLabel="Link kopieren">
              <Feather
                name={copyFeedbackVisible ? 'check' : 'copy'}
                size={16}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          </View>
        ) : null}
        <View onLayout={(event) => handleTimelineViewportLayout(event.nativeEvent.layout.width)}>
          <DashboardSlotTimeline
            slots={slots}
            loading={slotsLoading}
            error={slotsError}
            window={timelineWindow}
            scrollRef={slotTimelineRef}
            onScroll={(x) => syncTimelineScroll('slots', x)}
          />
        </View>
        <Link href="/calendar-settings" asChild>
          <Pressable style={{ alignSelf: 'flex-start', marginTop: theme.spacing[12] }}>
            <Text style={uiStyles.linkText}>
              Kalender-Einstellungen
            </Text>
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
            onScroll={(x) => syncTimelineScroll('appointments', x)}
          />
        </View>
        <Link href="/appointment-calendar-settings" asChild>
          <Pressable style={{ alignSelf: 'flex-start', marginTop: theme.spacing[12] }}>
            <Text style={uiStyles.linkText}>Termin-Kalender-Einstellungen</Text>
          </Pressable>
        </Link>
      </View>

      <View style={[uiStyles.panel, { marginBottom: theme.spacing[24] }]}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[4] }]}>
          {t('dashboard.sharedCalendars')}
        </Text>
        {data.joinedCalendars.length ? (
          visibleJoinedCalendars.map((calendar) => (
            <Link key={calendar.id} href={`/shared-calendar/${calendar.id}`} asChild>
              <Pressable style={{ marginTop: theme.spacing[12] }}>
                <Text style={uiStyles.linkText}>
                  {calendar.ownerEmail || t('dashboard.noOwnerEmail')}
                </Text>
              </Pressable>
            </Link>
          ))
        ) : (
          <Text style={uiStyles.secondaryText}>{t('dashboard.noJoinedCalendars')}</Text>
        )}
        <Link href="/connected-calendars" asChild>
          <Pressable style={{ alignSelf: 'flex-start', marginTop: theme.spacing[12] }}>
            <Text style={uiStyles.linkText}>
              Alle anzeigen
            </Text>
          </Pressable>
        </Link>
        <Link href="/request-calendar-access" asChild>
          <Pressable style={{ alignSelf: 'flex-start', marginTop: theme.spacing[12] }}>
            <Text style={uiStyles.linkText}>
              {t('dashboard.requestAccess')}
            </Text>
          </Pressable>
        </Link>
      </View>

      {user.email ? (
        <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>{user.email}</Text>
      ) : null}
      {!ownerCalendarLoading && slotlymeProfileLabel ? (
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
            {slotlymeProfileLabel}
          </Text>
          <Pressable
            onPress={() => void handleCopyProfileLink()}
            accessibilityRole="button"
            accessibilityLabel="Profil-Link kopieren">
            <Feather
              name={profileCopyFeedbackVisible ? 'check' : 'copy'}
              size={16}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>
      ) : null}
      {error ? <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>{error}</Text> : null}

      <Text style={uiStyles.linkText} onPress={handleLogout}>
        {t('dashboard.logout')}
      </Text>
    </ScrollView>
  );
}
