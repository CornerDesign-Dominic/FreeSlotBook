import { ScrollView, Text } from 'react-native';

export default function PrivacyScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'black', fontSize: 24, marginBottom: 16 }}>Datenschutz</Text>
      <Text style={{ color: 'black', lineHeight: 22, marginBottom: 12 }}>
        Diese Seite ist ein Platzhalter fuer die spaetere Datenschutzerklaerung.
      </Text>
      <Text style={{ color: 'black', lineHeight: 22 }}>
        Bitte ersetze diesen Text vor dem produktiven Einsatz durch die verbindlichen Inhalte deiner
        Datenschutzhinweise.
      </Text>
    </ScrollView>
  );
}
