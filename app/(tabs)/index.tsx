import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { logout } from '../../src/firebase/auth';
import { useDashboardData } from '../../src/features/mvp/useDashboardData';
import { useAuth } from '../../src/firebase/useAuth';

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const { data, loading: dashboardLoading, error } = useDashboardData(
    user ? { uid: user.uid, email: user.email } : null
  );

  console.log('Dashboard:state', {
    userEmail: user?.email ?? null,
    joinedCalendars: data.joinedCalendars,
    joinedCalendarsCount: data.joinedCalendars.length,
    error,
    loading,
    dashboardLoading,
  });

  const handleLogout = async () => {
    await logout();
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
        <Text style={{ color: 'black' }}>Loading...</Text>
      </View>
    );
  }

  const recentNotifications = data.recentNotifications.slice(0, 3);

  if (user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: 'white',
          padding: 16,
        }}>
        <Text style={{ color: 'black', fontSize: 28, marginBottom: 24 }}>Dashboard</Text>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 12 }}>
          <Text style={{ color: 'black', fontSize: 18, marginBottom: 4 }}>MEIN KALENDER</Text>
          {data.ownerCalendar ? (
            <>
              <Text style={{ color: 'black', marginBottom: 4 }}>
                Dein Kalender ist eingerichtet und deinem Account fest zugeordnet.
              </Text>
              <Text style={{ color: 'black', marginBottom: 12 }}>
                Sichtbarkeit: {data.ownerCalendar.visibility}
              </Text>
            </>
          ) : (
            <Text style={{ color: 'black', marginBottom: 12 }}>
              Dein persoenlicher Kalender wird gerade vorbereitet.
            </Text>
          )}
          <Link href="/my-calendar" asChild>
            <Pressable style={{ alignSelf: 'flex-start' }}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                Kalender oeffnen
              </Text>
            </Pressable>
          </Link>
          <Link href="/my-calendar/access" asChild>
            <Pressable style={{ alignSelf: 'flex-start', marginTop: 12 }}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                Freigaben verwalten
              </Text>
            </Pressable>
          </Link>
        </View>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 12 }}>
          <Text style={{ color: 'black', fontSize: 18, marginBottom: 4 }}>MEINE TERMINE</Text>
          {recentNotifications.length ? (
            recentNotifications.map((notification) => (
              <View key={notification.id} style={{ marginTop: 12 }}>
                <Text style={{ color: 'black', marginBottom: 4 }}>
                  {notification.title || 'Benachrichtigung'}
                </Text>
                <Text style={{ color: 'black' }}>
                  {notification.body || 'Keine weiteren Details verfuegbar.'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: 'black' }}>
              Du hast aktuell keine relevanten Termin-Benachrichtigungen.
            </Text>
          )}
        </View>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 24 }}>
          <Text style={{ color: 'black', fontSize: 18, marginBottom: 4 }}>KALENDER VON</Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: 'black',
              padding: 12,
              marginBottom: 12,
            }}>
            <Text style={{ color: 'black', marginBottom: 4 }}>
              Debug currentEmail: {data.debug?.currentEmail ?? '-'}
            </Text>
            <Text style={{ color: 'black', marginBottom: 4 }}>
              Debug normalizedEmail: {data.debug?.normalizedEmail ?? '-'}
            </Text>
            <Text style={{ color: 'black', marginBottom: 4 }}>
              Debug ownerSetupOk: {data.debug?.ownerSetupOk ? 'true' : 'false'}
            </Text>
            <Text style={{ color: 'black', marginBottom: 4 }}>
              Debug accessRecordsCount: {data.debug?.accessRecordsCount ?? 0}
            </Text>
            <Text style={{ color: 'black', marginBottom: 4 }}>
              Debug calendarIds: {data.debug?.calendarIds.join(', ') || '-'}
            </Text>
            <Text style={{ color: 'black', marginBottom: 4 }}>
              Debug joinedCalendarsCount: {data.debug?.joinedCalendarsCount ?? 0}
            </Text>
            <Text style={{ color: 'black', marginBottom: 4 }}>
              Debug joinedCalendarIds: {data.debug?.joinedCalendarIds.join(', ') || '-'}
            </Text>
            <Text style={{ color: 'black' }}>
              Debug error: {data.debug?.errorMessage ?? error ?? '-'}
            </Text>

            {data.debug?.accessRecords.length ? (
              <View style={{ marginTop: 8 }}>
                {data.debug.accessRecords.map((record, index) => (
                  <Text key={`${record.calendarId}-${record.granteeEmailKey}-${index}`} style={{ color: 'black' }}>
                    {`Access ${index + 1}: ${record.calendarId} | ${record.status} | ${record.granteeEmailKey}`}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
          {data.joinedCalendars.length ? (
            data.joinedCalendars.map((calendar) => (
              <Link key={calendar.id} href={`/shared-calendar/${calendar.id}`} asChild>
                <Pressable style={{ marginTop: 12 }}>
                  <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                    {calendar.ownerEmail || 'Kalender ohne hinterlegte Inhaber-E-Mail'}
                  </Text>
                </Pressable>
              </Link>
            ))
          ) : (
            <Text style={{ color: 'black' }}>
              Du bist aktuell keinem fremden Kalender beigetreten.
            </Text>
          )}
          <Link href="/request-calendar-access" asChild>
            <Pressable style={{ alignSelf: 'flex-start', marginTop: 12 }}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                Zugriff anfragen
              </Text>
            </Pressable>
          </Link>
        </View>

        {user.email ? <Text style={{ color: 'black', marginBottom: 16 }}>{user.email}</Text> : null}
        {error ? <Text style={{ color: 'black', marginBottom: 16 }}>{error}</Text> : null}

        <Text style={{ color: 'black' }} onPress={handleLogout}>
          Logout
        </Text>
      </View>
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
      <Text style={{ color: 'black', fontSize: 16 }}>Choose an option</Text>
      <Link href="/login" style={{ marginTop: 12 }}>
        <Text style={{ color: 'black' }}>Login</Text>
      </Link>
      <Link href="/register" style={{ marginTop: 16 }}>
        <Text style={{ color: 'black' }}>Create account</Text>
      </Link>
      <Link href="/forgot-password" style={{ marginTop: 12 }}>
        <Text style={{ color: 'black' }}>Forgot password</Text>
      </Link>
    </View>
  );
}
