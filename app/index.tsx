import { Text, View } from 'react-native';

import { useAppTheme } from '@/src/theme/ui';

export default function IndexScreen() {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: theme.colors.background,
      }}>
      <Text style={{ color: theme.colors.textPrimary }}>Laedt...</Text>
    </View>
  );
}
