import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { logout } from '../../src/firebase/auth';
import { useDashboardData } from '../../src/features/mvp/useDashboardData';
import { useAuth } from '../../src/firebase/useAuth';
import { LanguageSwitcher } from '../../src/i18n/language-switcher';
import { useTranslation } from '../../src/i18n/provider';

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
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
        <Text style={{ color: 'black' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: 'white',
          padding: 16,
        }}>
        <LanguageSwitcher />
        <Text style={{ color: 'black', fontSize: 28, marginBottom: 24 }}>{t('dashboard.title')}</Text>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 12 }}>
          <Text style={{ color: 'black', fontSize: 18, marginBottom: 4 }}>{t('dashboard.myCalendar')}</Text>
          {data.ownerCalendar ? (
            <>
              <Text style={{ color: 'black', marginBottom: 4 }}>
                {t('dashboard.calendarReady')}
              </Text>
              <Text style={{ color: 'black', marginBottom: 12 }}>
                {t('dashboard.visibilityValue', { visibility: data.ownerCalendar.visibility })}
              </Text>
            </>
          ) : (
            <Text style={{ color: 'black', marginBottom: 12 }}>
              {t('dashboard.calendarPreparing')}
            </Text>
          )}
          <Link href="/my-calendar" asChild>
            <Pressable style={{ alignSelf: 'flex-start' }}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                {t('dashboard.openCalendar')}
              </Text>
            </Pressable>
          </Link>
          <Link href="/my-calendar/access" asChild>
            <Pressable style={{ alignSelf: 'flex-start', marginTop: 12 }}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                {t('dashboard.manageAccess')}
              </Text>
            </Pressable>
          </Link>
          <Link href="/settings" asChild>
            <Pressable style={{ alignSelf: 'flex-start', marginTop: 12 }}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                {t('dashboard.openSettings')}
              </Text>
            </Pressable>
          </Link>
        </View>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 12 }}>
          <Text style={{ color: 'black', fontSize: 18, marginBottom: 4 }}>
            {t('dashboard.myAppointments')}
          </Text>
          <Text style={{ color: 'black', marginBottom: 12 }}>
            {t('dashboard.myAppointmentsDescription')}
          </Text>
          <Link href="/my-appointments" asChild>
            <Pressable style={{ alignSelf: 'flex-start' }}>
              <Text style={{ color: 'black', textDecorationLine: 'underline' }}>
                {t('dashboard.openAppointments')}
              </Text>
            </Pressable>
          </Link>
        </View>

        <View style={{ borderWidth: 1, borderColor: 'black', padding: 16, marginBottom: 24 }}>
          <Text style={{ color: 'black', fontSize: 18, marginBottom: 4 }}>{t('dashboard.sharedCalendars')}</Text>
          {data.joinedCalendars.length ? (
            data.joinedCalendars.map((calendar) => (
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
      <LanguageSwitcher />
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
