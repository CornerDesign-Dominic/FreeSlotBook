import { ScrollView, Text, View } from 'react-native';

import { useBottomSafeContentStyle } from '../src/theme/ui';

const sections = [
  {
    title: '1. Verantwortlicher',
    paragraphs: [
      'Verantwortlich für die Verarbeitung personenbezogener Daten im Zusammenhang mit dieser App ist:',
      '[Firmenname]\n[Anschrift]\n[E-Mail]\n[Telefon, falls vorhanden]',
      'Soweit in dieser Datenschutzerklärung von "wir", "uns" oder "unser" die Rede ist, ist damit der oben genannte Verantwortliche gemeint.',
    ],
  },
  {
    title: '2. Allgemeine Hinweise zur Datenverarbeitung',
    paragraphs: [
      'Diese App ist ein Terminplaner mit persönlichen Kalendern, öffentlich oder eingeschränkt freigebbaren Buchungsseiten, Slotverwaltung, Terminverwaltung und E-Mail-Kommunikation. Personenbezogene Daten werden nur verarbeitet, soweit dies für den Betrieb der App, die Terminbuchung, die Kommunikation mit Nutzern und Gästen sowie die Sicherheit und Stabilität des Angebots erforderlich ist.',
      'Die vorliegende Fassung ist ein produktspezifischer Erstentwurf. Sie ersetzt keine individuelle rechtliche Prüfung, insbesondere nicht im Hinblick auf konkrete Unternehmensangaben, Aufbewahrungsfristen, die tatsächliche Einbindung von Tracking- oder Analysefunktionen und die vertragliche Ausgestaltung mit Dienstleistern.',
    ],
  },
  {
    title: '3. Verarbeitete Datenkategorien',
    paragraphs: [
      'Je nach Nutzung der App verarbeiten wir insbesondere folgende Datenkategorien:',
      '- Bestandsdaten wie Name, E-Mail-Adresse und Nutzerkennung\n- Authentifizierungsdaten und Kontodaten im Zusammenhang mit Registrierung, Login und E-Mail-Verifizierung\n- Kalender- und Termindaten wie Kalender-ID, Sichtbarkeit, öffentlicher Slug, Freigaben, Slots, Buchungen, Terminstatus und Historieneinträge\n- Kommunikationsdaten wie Inhalte und Metadaten von System-E-Mails, Benachrichtigungen und Verifizierungsnachrichten\n- Einwilligungs- bzw. Nachweisdaten, insbesondere Annahme von AGB und Kenntnisnahme der Datenschutzerklärung bei Gastbuchungen\n- Protokoll-, Sicherheits- und technische Betriebsdaten, soweit sie im Rahmen der eingesetzten Infrastruktur anfallen',
    ],
  },
  {
    title: '4. Zwecke der Verarbeitung',
    paragraphs: [
      'Wir verarbeiten personenbezogene Daten insbesondere zu folgenden Zwecken:',
      '- Bereitstellung und Betrieb der App\n- Einrichtung und Verwaltung von Nutzerkonten\n- Erstellung und Betrieb genau eines Kalenders je registriertem Nutzer\n- Verwaltung von Slots, Terminen, Freigaben und Zugriffen\n- Bereitstellung öffentlicher Kalender zur Buchung durch Gäste ohne eigenes Konto\n- Vorbereitung einer optionalen späteren Kontoanlage nach Gastbuchung\n- Versand von Verifizierungs-, Buchungs-, Einladungs-, Erinnerungs- und Status-E-Mails\n- Missbrauchsverhinderung, IT-Sicherheit, Fehleranalyse und Nachweis der ordnungsgemäßen Nutzung',
    ],
  },
  {
    title: '5. Rechtsgrundlagen',
    paragraphs: [
      'Soweit die Datenschutz-Grundverordnung (DSGVO) anwendbar ist, verarbeiten wir personenbezogene Daten auf Grundlage der folgenden Rechtsgrundlagen:',
      '- Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung zur Erfüllung eines Vertrags oder zur Durchführung vorvertraglicher Maßnahmen erforderlich ist, etwa bei Registrierung, Login, Kalenderführung, Slotverwaltung und Terminbuchung\n- Art. 6 Abs. 1 lit. c DSGVO, soweit gesetzliche Aufbewahrungs- oder Nachweispflichten bestehen\n- Art. 6 Abs. 1 lit. f DSGVO auf Grundlage unseres berechtigten Interesses an einem sicheren, funktionsfähigen und nachvollziehbaren Betrieb der App, der Verhinderung von Missbrauch sowie der technischen Administration\n- Art. 6 Abs. 1 lit. a DSGVO, soweit im Einzelfall eine Einwilligung eingeholt wird',
    ],
  },
  {
    title: '6. Registrierung und Login',
    paragraphs: [
      'Bei der Registrierung verarbeiten wir die von dir angegebene E-Mail-Adresse und das von dir gesetzte Passwort bzw. die hierzu technisch erforderlichen Authentifizierungsdaten. Zusätzlich verarbeiten wir Informationen über die E-Mail-Verifizierung, damit nur bestätigte Konten freigeschaltet werden.',
      'Nach erfolgreicher Registrierung wird für den Nutzer ein zugehöriger Kalender angelegt. Beim Login verarbeiten wir die eingegebenen Zugangsdaten sowie technische Informationen, die zur Authentifizierung und Sitzungskontrolle erforderlich sind.',
    ],
  },
  {
    title: '7. Kalender- und Terminverwaltung',
    paragraphs: [
      'Registrierte Nutzer können ihren eigenen Kalender verwalten, Slots erstellen, öffentliche oder eingeschränkte Sichtbarkeit festlegen, Freigaben für andere Personen verwalten sowie Termine und Slot-Historien einsehen. Dabei verarbeiten wir insbesondere Kalenderstammdaten, Slotdaten, Statusinformationen, E-Mail-Adressen freigegebener Personen und terminbezogene Historieneinträge.',
      'Soweit Termine oder Slot-Aktionen protokolliert werden, dient dies der Nachvollziehbarkeit, der korrekten Darstellung des Status und der Missbrauchsvermeidung.',
    ],
  },
  {
    title: '8. Öffentliche Gastbuchung ohne Konto',
    paragraphs: [
      'Ist ein Kalender auf "public" gestellt, können Gäste freie Slots über eine öffentliche Buchungsseite ohne eigenes Nutzerkonto buchen. In diesem Zusammenhang verarbeiten wir mindestens den angegebenen Namen, die E-Mail-Adresse, den gewählten Slot, den gebuchten Termin sowie den Status der Buchung.',
      'Zusätzlich speichern wir, dass AGB akzeptiert und die Datenschutzerklärung zur Kenntnis genommen wurden, einschließlich Versionsstand und Zeitpunkt, soweit dies im Produkt vorgesehen ist. Diese Verarbeitung dient der Durchführung der Buchung und der Nachweisbarkeit des Buchungsvorgangs.',
    ],
  },
  {
    title: '9. Optionale Kontoanlage nach Gastbuchung',
    paragraphs: [
      'Bei einer Gastbuchung kann optional angefragt werden, mit derselben E-Mail-Adresse später ein Konto anzulegen. In diesem Fall verarbeiten wir die E-Mail-Adresse nicht nur für die Buchungsbestätigung, sondern auch zur Vorbereitung bzw. Auslösung einer späteren Kontoanlage oder Einladung.',
      'Ob und in welcher Form hierfür gesonderte Einwilligungen, Double-Opt-in-Schritte oder weitere Informationen erforderlich sind, sollte vor dem produktiven Einsatz rechtlich geprüft werden.',
    ],
  },
  {
    title: '10. Versand von E-Mails und Benachrichtigungen',
    paragraphs: [
      'Wir versenden bzw. veranlassen E-Mails und Benachrichtigungen insbesondere für Registrierung, E-Mail-Verifizierung, Buchungsbestätigungen, Benachrichtigungen an Kalenderinhaber, Hinweise zu neuen Slots, Kontoeinladungen sowie stornierungsbezogene Kommunikation.',
      'Hierbei verarbeiten wir je nach Nachricht insbesondere E-Mail-Adresse, Namen bzw. Bezeichnungen, Termin- und Slotdaten, Nachrichteninhalt, Versandstatus und technische Zustellinformationen, soweit diese bei unseren eingesetzten Diensten anfallen.',
    ],
  },
  {
    title: '11. Eingesetzte Dienstleister und Empfänger',
    paragraphs: [
      'Zur technischen Bereitstellung der App setzen wir externe Dienstleister ein, die personenbezogene Daten in unserem Auftrag oder als eigenständige Verantwortliche verarbeiten können.',
      'Firebase / Google: Die App nutzt Firebase bzw. Dienste von Google, insbesondere Firebase Auth für Registrierung und Login, Firestore als Datenbasis sowie Cloud Functions für serverseitige Verarbeitungen und ausgelöste Kommunikationsprozesse. Dabei können personenbezogene Daten wie E-Mail-Adressen, Konto- und Kalenderdaten, Slot- und Termindaten sowie technische Nutzungs- und Protokolldaten verarbeitet werden.',
      'Resend: Für den Versand von E-Mails kann Resend eingesetzt werden. Dabei werden insbesondere Empfängeradresse, Betreff, Nachrichteninhalt sowie technische Versand- und Zustellinformationen verarbeitet, soweit dies für die Zustellung und Nachverfolgung erforderlich ist.',
      'Ob mit allen eingesetzten Dienstleistern Auftragsverarbeitungsverträge bestehen und welche Einstellungen konkret aktiviert sind, sollte vor Produktivstart geprüft und dokumentiert werden.',
    ],
  },
  {
    title: '12. Speicherdauer und Kriterien der Speicherdauer',
    paragraphs: [
      'Wir speichern personenbezogene Daten nur so lange, wie dies für die jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen. Kontodaten speichern wir grundsätzlich für die Dauer des bestehenden Nutzerverhältnisses. Kalender-, Slot-, Termin- und Freigabedaten speichern wir, solange sie für die Nutzung, Nachvollziehbarkeit, Kommunikation oder Abwehr von Ansprüchen benötigt werden.',
      'Buchungs- und Kommunikationsdaten können darüber hinaus für einen angemessenen Zeitraum gespeichert bleiben, soweit dies für Nachweise, Support, Missbrauchsprävention oder rechtliche Verpflichtungen erforderlich ist. Konkrete Löschkonzepte und Fristen sollten vor dem produktiven Einsatz verbindlich festgelegt werden.',
    ],
  },
  {
    title: '13. Betroffenenrechte',
    paragraphs: [
      'Betroffene Personen haben nach Maßgabe der gesetzlichen Voraussetzungen das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch gegen bestimmte Verarbeitungen. Eine erteilte Einwilligung kann mit Wirkung für die Zukunft widerrufen werden.',
      'Zur Ausübung dieser Rechte kann die unter "Verantwortlicher" genannte Kontaktadresse verwendet werden.',
    ],
  },
  {
    title: '14. Beschwerderecht',
    paragraphs: [
      'Betroffene Personen haben das Recht, sich bei einer Datenschutzaufsichtsbehörde über die Verarbeitung ihrer personenbezogenen Daten zu beschweren, insbesondere in dem Mitgliedstaat ihres gewöhnlichen Aufenthalts, ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.',
    ],
  },
  {
    title: '15. Internationale Datenübermittlungen',
    paragraphs: [
      'Bei der Nutzung von Firebase / Google und Resend kann nicht ausgeschlossen werden, dass personenbezogene Daten auch in Drittstaaten außerhalb der EU bzw. des EWR verarbeitet oder dorthin übermittelt werden. In diesen Fällen achten wir darauf, dass geeignete rechtliche Schutzmechanismen vorgesehen sind, etwa EU-Standardvertragsklauseln oder andere zulässige Garantien.',
      'Welche konkreten Datenflüsse tatsächlich stattfinden, hängt von der technischen Konfiguration und den genutzten Diensten ab und sollte vor dem produktiven Einsatz im Detail geprüft werden.',
    ],
  },
  {
    title: '16. Stand dieser Datenschutzerklärung',
    paragraphs: [
      'Stand / Version: 2026-03-19',
      'Unternehmensdaten, konkrete Löschfristen, zusätzliche eingesetzte Dienste sowie der genaue rechtliche Zuschnitt dieser Datenschutzerklärung sollten vor dem produktiven Einsatz ergänzt und geprüft werden.',
    ],
  },
];

function Heading(props: { children: string }) {
  return <Text style={{ color: 'black', fontSize: 22, fontWeight: '600', marginBottom: 16 }}>{props.children}</Text>;
}

function SectionTitle(props: { children: string }) {
  return <Text style={{ color: 'black', fontSize: 18, fontWeight: '600', marginBottom: 10 }}>{props.children}</Text>;
}

function Paragraph(props: { children: string }) {
  return <Text style={{ color: 'black', lineHeight: 22, marginBottom: 10 }}>{props.children}</Text>;
}

export default function PrivacyScreen() {
  const contentContainerStyle = useBottomSafeContentStyle({ padding: 16 });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={contentContainerStyle}>
      <Heading>Datenschutzerklärung</Heading>

      <Paragraph>
        Diese Datenschutzerklärung beschreibt, wie personenbezogene Daten bei der Nutzung dieser
        Terminplaner-App verarbeitet werden. Sie ist auf die derzeit erkennbaren Produktfunktionen
        zugeschnitten, insbesondere Nutzerkonten, persönliche Kalender, eingeschränkte oder
        öffentliche Freigabe, Gastbuchungen ohne Konto, optionale spätere Kontoanlage sowie
        E-Mail-Kommunikation über Firebase / Cloud Functions und Resend.
      </Paragraph>

      {sections.map((section) => (
        <View key={section.title} style={{ marginBottom: 16 }}>
          <SectionTitle>{section.title}</SectionTitle>
          {section.paragraphs.map((paragraph) => (
            <Paragraph key={paragraph}>{paragraph}</Paragraph>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
