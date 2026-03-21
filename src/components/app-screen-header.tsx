import { Text, View } from 'react-native';

import { useAppTheme } from '@/src/theme/ui';

export function AppScreenHeader(props: { title: string }) {
  const { uiStyles } = useAppTheme();

  return (
    <View style={uiStyles.screenHeader}>
      <Text style={uiStyles.screenHeaderTitle}>{props.title}</Text>
    </View>
  );
}
