import { Text, View } from 'react-native';

import { uiStyles } from '@/src/theme/ui';

export function AppScreenHeader(props: { title: string }) {
  return (
    <View style={uiStyles.screenHeader}>
      <Text style={uiStyles.screenHeaderTitle}>{props.title}</Text>
    </View>
  );
}
