import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreenHeader } from '@/src/components/app-screen-header';
import { useAppTheme, useBottomSafeContentStyle } from '@/src/theme/ui';

export default function MyAppointmentCalendarScreen() {
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Mein Termin-Kalender" />

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[8] }]}>
          Termin-Kalender
        </Text>
        <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[12] }]}>
          Verwalte hier die Einstellungen fuer deinen persoenlichen Termin-Kalender.
        </Text>
        <Link href="/appointment-calendar-settings" asChild>
          <Pressable style={{ alignSelf: 'flex-start' }}>
            <Text style={uiStyles.linkText}>Termin-Kalender-Einstellungen</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}
