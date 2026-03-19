import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';

import { useAuth } from '../src/firebase/useAuth';
import { useTranslation } from '../src/i18n/provider';

export default function IndexScreen() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
