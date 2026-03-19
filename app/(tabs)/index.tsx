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
        <Text style={{ color: 'black' }}>Wird geladen...</Text>
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
              Dein Kalender ist eingerichtet und mit deinem Konto verknüpft.
              </Text>
              <Text style={{ color: 'black', marginBottom: 12 }}>
                Sichtbarkeit: {data.ownerCalendar.visibility}
              </Text>
            </>
          ) : (
            <Text style={{ color: 'black', marginBottom: 12 }}>
              Dein persönlicher Kalender wird gerade eingerichtet.
            </Text>
          )}
          <Link href="/my-calendar" asChild>
            <Pressable style={{ alignSelf: 'flex-start' }}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                Kalender öffnen
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
                  {notification.body || 'Keine weiteren Details verfügbar.'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: 'black' }}>
              Du hast aktuell keine neuen Termin-Infos.
            </Text>
          )}
        </View>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 24 }}>
          <Text style={{ color: 'black', fontSize: 18, marginBottom: 4 }}>KALENDER VON</Text>
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
              Du hast aktuell keinen freigegebenen Kalender.
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
          Abmelden
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
      <Text style={{ color: 'black', fontSize: 16 }}>Wähle eine Option</Text>
      <Link href="/login" style={{ marginTop: 12 }}>
        <Text style={{ color: 'black' }}>Anmelden</Text>
      </Link>
      <Link href="/register" style={{ marginTop: 16 }}>
        <Text style={{ color: 'black' }}>Konto erstellen</Text>
      </Link>
      <Link href="/forgot-password" style={{ marginTop: 12 }}>
        <Text style={{ color: 'black' }}>Passwort vergessen</Text>
      </Link>
    </View>
  );
}
