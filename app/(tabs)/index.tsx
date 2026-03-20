import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { logout } from '../../src/firebase/auth';
import { DashboardAppointmentTimeline } from '../../src/features/dashboard/dashboard-appointment-timeline';
import { DashboardSlotTimeline } from '../../src/features/dashboard/dashboard-slot-timeline';
import {
  createRelativeTimelineWindow,
  getInitialTimelineOffset,
} from '../../src/features/dashboard/dashboard-timeline-utils';
import { useDashboardData } from '../../src/features/mvp/useDashboardData';
import { useOwnerSlots } from '../../src/features/mvp/useOwnerSlots';
import { useParticipantAppointments } from '../../src/features/mvp/useParticipantAppointments';
import { useAuth } from '../../src/firebase/useAuth';
import { useTranslation } from '../../src/i18n/provider';

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const { data, loading: dashboardLoading, error } = useDashboardData(
    user ? { uid: user.uid, email: user.email } : null
  );
  const { slots, loading: slotsLoading, error: slotsError } = useOwnerSlots(data.ownerCalendar?.id ?? null);
  const {
    appointments,
    loading: appointmentsLoading,
    error: appointmentsError,
  } = useParticipantAppointments(user?.email ?? null);
  const visibleJoinedCalendars = data.joinedCalendars.slice(0, 3);
  const hasMoreJoinedCalendars = data.joinedCalendars.length > 3;
  const timelineWindow = useMemo(() => createRelativeTimelineWindow(new Date()), []);
  const slotTimelineRef = useRef<ScrollView | null>(null);
  const appointmentTimelineRef = useRef<ScrollView | null>(null);
  const ignoreNextScrollRef = useRef<{ slots: boolean; appointments: boolean }>({
    slots: false,
    appointments: false,
  });

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    const initialOffset = getInitialTimelineOffset(timelineWindow, screenWidth);
    const timeout = setTimeout(() => {
      slotTimelineRef.current?.scrollTo({ x: initialOffset, animated: false });
      appointmentTimelineRef.current?.scrollTo({ x: initialOffset, animated: false });
    }, 0);

    return () => clearTimeout(timeout);
  }, [screenWidth, timelineWindow]);

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

  if (loading || dashboardLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'white',
          padding: 16,
        }}>
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (user) {
    return (
      <ScrollView
        style={{
          flex: 1,
          backgroundColor: 'white',
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}>
          <Text style={{ color: 'black', fontSize: 28 }}>{t('dashboard.title')}</Text>
          <Link href="/settings" asChild>
            <Pressable>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                {t('dashboard.openSettings')}
              </Text>
            </Pressable>
          </Link>
        </View>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 12 }}>
          <Link href="/my-calendar" asChild>
            <Pressable style={{ alignSelf: 'flex-start', marginBottom: 4 }}>
              <Text style={{ color: 'black', fontSize: 18, textDecorationLine: 'underline' }}>
                {t('dashboard.myCalendar')}
              </Text>
            </Pressable>
          </Link>
          <DashboardSlotTimeline
            slots={slots}
            loading={slotsLoading}
            error={slotsError}
            window={timelineWindow}
            scrollRef={slotTimelineRef}
            onScroll={(x) => syncTimelineScroll('slots', x)}
          />
          <Link href="/my-calendar/access" asChild>
            <Pressable style={{ alignSelf: 'flex-start', marginTop: 12 }}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                {t('dashboard.manageAccess')}
              </Text>
            </Pressable>
          </Link>
        </View>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 12 }}>
          <Link href="/my-appointments" asChild>
            <Pressable style={{ alignSelf: 'flex-start' }}>
              <Text style={{ color: 'black', fontSize: 18, textDecorationLine: 'underline' }}>
                {t('dashboard.myAppointments')}
              </Text>
            </Pressable>
          </Link>
          <View style={{ marginTop: 12 }}>
            <DashboardAppointmentTimeline
              appointments={appointments}
              loading={appointmentsLoading}
              error={appointmentsError}
              window={timelineWindow}
              scrollRef={appointmentTimelineRef}
              onScroll={(x) => syncTimelineScroll('appointments', x)}
            />
          </View>
        </View>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 24 }}>
          <Text style={{ color: 'black', fontSize: 18, marginBottom: 4 }}>{t('dashboard.sharedCalendars')}</Text>
          {data.joinedCalendars.length ? (
            visibleJoinedCalendars.map((calendar) => (
              <Link key={calendar.id} href={`/shared-calendar/${calendar.id}`} asChild>
                <Pressable style={{ marginTop: 12 }}>
                  <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                    {calendar.ownerEmail || t('dashboard.noOwnerEmail')}
                  </Text>
                </Pressable>
              </Link>
            ))
          ) : (
            <Text style={{ color: 'black' }}>{t('dashboard.noJoinedCalendars')}</Text>
          )}
          {hasMoreJoinedCalendars ? (
            <Pressable disabled style={{ alignSelf: 'flex-start', marginTop: 12, opacity: 0.7 }}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                Alle anzeigen
              </Text>
            </Pressable>
          ) : null}
          <Link href="/request-calendar-access" asChild>
            <Pressable style={{ alignSelf: 'flex-start', marginTop: 12 }}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                {t('dashboard.requestAccess')}
              </Text>
            </Pressable>
          </Link>
        </View>

        {user.email ? <Text style={{ color: 'black', marginBottom: 16 }}>{user.email}</Text> : null}
        {error ? <Text style={{ color: 'black', marginBottom: 16 }}>{error}</Text> : null}

        <Text style={{ color: 'black' }} onPress={handleLogout}>
          {t('dashboard.logout')}
        </Text>
      </ScrollView>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
      }}>
      <Text style={{ color: 'black', fontSize: 28, marginBottom: 8 }}>
        FreeSlotBooking
      </Text>
      <Text style={{ color: 'black', fontSize: 16 }}>{t('dashboard.chooseOption')}</Text>
      <Link href="/login" style={{ marginTop: 12 }}>
        <Text style={{ color: 'black' }}>{t('dashboard.login')}</Text>
      </Link>
      <Link href="/register" style={{ marginTop: 16 }}>
        <Text style={{ color: 'black' }}>{t('dashboard.createAccount')}</Text>
      </Link>
      <Link href="/forgot-password" style={{ marginTop: 12 }}>
        <Text style={{ color: 'black' }}>{t('dashboard.forgotPassword')}</Text>
      </Link>
    </View>
  );
}
