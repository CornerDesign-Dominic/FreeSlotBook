import { ScrollView, Text, View } from 'react-native';

import { AppScreenHeader } from '../../src/components/app-screen-header';
import { useBottomSafeContentStyle, useAppTheme } from '../../src/theme/ui';

export default function LegalImprintScreen() {
  const { theme, uiStyles } = useAppTheme();
  const contentContainerStyle = useBottomSafeContentStyle(uiStyles.content);

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={contentContainerStyle}>
      <AppScreenHeader title="Impressum" />

      <View style={uiStyles.panel}>
        <Text style={[uiStyles.sectionTitle, { marginBottom: theme.spacing[12] }]}>
          Impressum
        </Text>
        <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[12] }]}>
          Dieses Impressum ist aktuell ein Platzhalter fuer die spaetere finale Anbieterkennzeichnung.
        </Text>
        <Text style={uiStyles.secondaryText}>
          Firmenname, Anschrift, Kontaktangaben und weitere rechtlich erforderliche Informationen
          koennen hier spaeter eingepflegt werden.
        </Text>
      </View>
    </ScrollView>
  );
}
