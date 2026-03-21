import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/src/i18n/provider';
import { theme, uiStyles } from '@/src/theme/ui';

export function AppScreenHeader(props: { title: string }) {
  const { t } = useTranslation();

  return (
    <View style={uiStyles.screenHeader}>
      <Text style={uiStyles.screenHeaderTitle}>{props.title}</Text>
      <Link href="/(tabs)" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.title')}
          style={uiStyles.screenHeaderHomeButton}>
          <Feather name="home" size={18} color={theme.colors.accent} />
        </Pressable>
      </Link>
    </View>
  );
}
