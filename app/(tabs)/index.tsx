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

  const nextAppointments = data.upcomingAppointments.slice(0, 3);

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
        </View>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 12 }}>
          <Text style={{ color: 'black', fontSize: 18, marginBottom: 4 }}>MEINE TERMINE</Text>
          {nextAppointments.length ? (
            nextAppointments.map((appointment) => (
              <View key={appointment.id} style={{ marginTop: 12 }}>
                <Text style={{ color: 'black' }}>
                  {appointment.startsAt
                    ? appointment.startsAt.toLocaleString('de-DE')
                    : 'Zeitpunkt noch nicht verfuegbar'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: 'black' }}>
              Du hast aktuell keine bevorstehenden Termine.
            </Text>
          )}
        </View>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 24 }}>
          <Text style={{ color: 'black', fontSize: 18, marginBottom: 4 }}>KALENDER VON</Text>
          {data.joinedCalendars.length ? (
            data.joinedCalendars.map((calendar) => (
              <Text key={calendar.id} style={{ color: 'black', marginTop: 12 }}>
                {calendar.ownerEmail || 'Kalender ohne hinterlegte Inhaber-E-Mail'}
              </Text>
            ))
          ) : (
            <Text style={{ color: 'black' }}>
              Du bist aktuell keinem fremden Kalender beigetreten.
            </Text>
          )}
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
