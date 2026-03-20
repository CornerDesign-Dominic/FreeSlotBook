import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { theme, uiStyles } from '../theme/ui';

export function CalendarNavigationHeader(props: {
  title: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <View style={uiStyles.calendarNavigation}>
      <Pressable
        accessibilityRole="button"
        onPress={props.onPrevious}
        style={uiStyles.calendarNavigationButton}>
        <Feather
          name="chevron-left"
          size={18}
          color={theme.colors.textPrimary}
        />
      </Pressable>

      <Text numberOfLines={1} style={uiStyles.calendarNavigationTitle}>
        {props.title}
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={props.onNext}
        style={uiStyles.calendarNavigationButton}>
        <Feather
          name="chevron-right"
          size={18}
          color={theme.colors.textPrimary}
        />
      </Pressable>
    </View>
  );
}
