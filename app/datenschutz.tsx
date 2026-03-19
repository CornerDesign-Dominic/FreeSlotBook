import { ScrollView, Text, View } from 'react-native';

const sections = [
  {
    title: '1. Verantwortlicher',
    paragraphs: [
      'Verantwortlich fuer die Verarbeitung personenbezogener Daten im Zusammenhang mit dieser App ist:',
      '[Firmenname]\n[Anschrift]\n[E-Mail]\n[Telefon, falls vorhanden]',
      'Soweit in dieser Datenschutzerklaerung von "wir", "uns" oder "unser" die Rede ist, ist damit der oben genannte Verantwortliche gemeint.',
    ],
  },
  {
    title: '2. Allgemeine Hinweise zur Datenverarbeitung',
    paragraphs: [
      'Diese App ist ein Terminplaner mit persoenlichen Kalendern, oeffentlich oder eingeschraenkt freigebbaren Buchungsseiten, Slotverwaltung, Terminverwaltung und E-Mail-Kommunikation. Personenbezogene Daten werden nur verarbeitet, soweit dies fuer den Betrieb der App, die Terminbuchung, die Kommunikation mit Nutzern und Gaesten sowie die Sicherheit und Stabilitaet des Angebots erforderlich ist.',
      'Die vorliegende Fassung ist ein produktspezifischer Erstentwurf. Sie ersetzt keine individuelle rechtliche Pruefung, insbesondere nicht im Hinblick auf konkrete Unternehmensangaben, Aufbewahrungsfristen, die tatsaechliche Einbindung von Tracking- oder Analysefunktionen und die vertragliche Ausgestaltung mit Dienstleistern.',
    ],
  },
  {
    title: '3. Verarbeitete Datenkategorien',
    paragraphs: [
      'Je nach Nutzung der App verarbeiten wir insbesondere folgende Datenkategorien:',
      '- Bestandsdaten wie Name, E-Mail-Adresse und Nutzerkennung\n- Authentifizierungsdaten und Kontodaten im Zusammenhang mit Registrierung, Login und E-Mail-Verifizierung\n- Kalender- und Termindaten wie Kalender-ID, Sichtbarkeit, oeffentlicher Slug, Freigaben, Slots, Buchungen, Terminstatus und Historieneintraege\n- Kommunikationsdaten wie Inhalte und Metadaten von System-E-Mails, Benachrichtigungen und Verifizierungsnachrichten\n- Einwilligungs- bzw. Nachweisdaten, insbesondere Annahme von AGB und Kenntnisnahme der Datenschutzerklaerung bei Gastbuchungen\n- Protokoll-, Sicherheits- und technische Betriebsdaten, soweit sie im Rahmen der eingesetzten Infrastruktur anfallen',
    ],
  },
  {
    title: '4. Zwecke der Verarbeitung',
    paragraphs: [
      'Wir verarbeiten personenbezogene Daten insbesondere zu folgenden Zwecken:',
      '- Bereitstellung und Betrieb der App\n- Einrichtung und Verwaltung von Nutzerkonten\n- Erstellung und Betrieb genau eines Kalenders je registriertem Nutzer\n- Verwaltung von Slots, Terminen, Freigaben und Zugriffen\n- Bereitstellung oeffentlicher Kalender zur Buchung durch Gaeste ohne eigenes Konto\n- Vorbereitung einer optionalen spaeteren Kontoanlage nach Gastbuchung\n- Versand von Verifizierungs-, Buchungs-, Einladungs-, Erinnerungs- und Status-E-Mails\n- Missbrauchsverhinderung, IT-Sicherheit, Fehleranalyse und Nachweis der ordnungsgemaessen Nutzung',
    ],
  },
  {
    title: '5. Rechtsgrundlagen',
    paragraphs: [
      'Soweit die Datenschutz-Grundverordnung (DSGVO) anwendbar ist, verarbeiten wir personenbezogene Daten auf Grundlage der folgenden Rechtsgrundlagen:',
      '- Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung zur Erfuellung eines Vertrags oder zur Durchfuehrung vorvertraglicher Massnahmen erforderlich ist, etwa bei Registrierung, Login, Kalenderfuehrung, Slotverwaltung und Terminbuchung\n- Art. 6 Abs. 1 lit. c DSGVO, soweit gesetzliche Aufbewahrungs- oder Nachweispflichten bestehen\n- Art. 6 Abs. 1 lit. f DSGVO auf Grundlage unseres berechtigten Interesses an einem sicheren, funktionsfaehigen und nachvollziehbaren Betrieb der App, der Verhinderung von Missbrauch sowie der technischen Administration\n- Art. 6 Abs. 1 lit. a DSGVO, soweit im Einzelfall eine Einwilligung eingeholt wird',
    ],
  },
  {
    title: '6. Registrierung und Login',
    paragraphs: [
      'Bei der Registrierung verarbeiten wir die von dir angegebene E-Mail-Adresse und das von dir gesetzte Passwort bzw. die hierzu technisch erforderlichen Authentifizierungsdaten. Zusaetzlich verarbeiten wir Informationen ueber die E-Mail-Verifizierung, damit nur bestaetigte Konten freigeschaltet werden.',
      'Nach erfolgreicher Registrierung wird fuer den Nutzer ein zugehoeriger Kalender angelegt. Beim Login verarbeiten wir die eingegebenen Zugangsdaten sowie technische Informationen, die zur Authentifizierung und Sitzungskontrolle erforderlich sind.',
    ],
  },
  {
    title: '7. Kalender- und Terminverwaltung',
    paragraphs: [
      'Registrierte Nutzer koennen ihren eigenen Kalender verwalten, Slots erstellen, oeffentliche oder eingeschraenkte Sichtbarkeit festlegen, Freigaben fuer andere Personen verwalten sowie Termine und Slot-Historien einsehen. Dabei verarbeiten wir insbesondere Kalenderstammdaten, Slotdaten, Statusinformationen, E-Mail-Adressen freigegebener Personen und terminbezogene Historieneintraege.',
      'Soweit Termine oder Slot-Aktionen protokolliert werden, dient dies der Nachvollziehbarkeit, der korrekten Darstellung des Status und der Missbrauchsvermeidung.',
    ],
  },
  {
    title: '8. Oeffentliche Gastbuchung ohne Konto',
    paragraphs: [
      'Ist ein Kalender auf "public" gestellt, koennen Gaeste freie Slots ueber eine oeffentliche Buchungsseite ohne eigenes Nutzerkonto buchen. In diesem Zusammenhang verarbeiten wir mindestens den angegebenen Namen, die E-Mail-Adresse, den gewaelten Slot, den gebuchten Termin sowie den Status der Buchung.',
      'Zusaetzlich speichern wir, dass AGB akzeptiert und die Datenschutzerklaerung zur Kenntnis genommen wurden, einschliesslich Versionsstand und Zeitpunkt, soweit dies im Produkt vorgesehen ist. Diese Verarbeitung dient der Durchfuehrung der Buchung und der Nachweisbarkeit des Buchungsvorgangs.',
    ],
  },
  {
    title: '9. Optionale Kontoanlage nach Gastbuchung',
    paragraphs: [
      'Bei einer Gastbuchung kann optional angefragt werden, mit derselben E-Mail-Adresse spaeter ein Konto anzulegen. In diesem Fall verarbeiten wir die E-Mail-Adresse nicht nur fuer die Buchungsbestaetigung, sondern auch zur Vorbereitung bzw. Ausloesung einer spaeteren Kontoanlage oder Einladung.',
      'Ob und in welcher Form hierfuer gesonderte Einwilligungen, Double-Opt-in-Schritte oder weitere Informationen erforderlich sind, sollte vor dem produktiven Einsatz rechtlich geprueft werden.',
    ],
  },
  {
    title: '10. Versand von E-Mails und Benachrichtigungen',
    paragraphs: [
      'Wir versenden bzw. veranlassen E-Mails und Benachrichtigungen insbesondere fuer Registrierung, E-Mail-Verifizierung, Buchungsbestaetigungen, Benachrichtigungen an Kalenderinhaber, Hinweise zu neuen Slots, Kontoeinladungen sowie stornierungsbezogene Kommunikation.',
      'Hierbei verarbeiten wir je nach Nachricht insbesondere E-Mail-Adresse, Namen bzw. Bezeichnungen, Termin- und Slotdaten, Nachrichteninhalt, Versandstatus und technische Zustellinformationen, soweit diese bei unseren eingesetzten Diensten anfallen.',
    ],
  },
  {
    title: '11. Eingesetzte Dienstleister und Empfaenger',
    paragraphs: [
      'Zur technischen Bereitstellung der App setzen wir externe Dienstleister ein, die personenbezogene Daten in unserem Auftrag oder als eigenstaendige Verantwortliche verarbeiten koennen.',
      'Firebase / Google: Die App nutzt Firebase bzw. Dienste von Google, insbesondere Firebase Auth fuer Registrierung und Login, Firestore als Datenbasis sowie Cloud Functions fuer serverseitige Verarbeitungen und ausgeloeste Kommunikationsprozesse. Dabei koennen personenbezogene Daten wie E-Mail-Adressen, Konto- und Kalenderdaten, Slot- und Termindaten sowie technische Nutzungs- und Protokolldaten verarbeitet werden.',
      'Resend: Fuer den Versand von E-Mails kann Resend eingesetzt werden. Dabei werden insbesondere Empfaengeradresse, Betreff, Nachrichteninhalt sowie technische Versand- und Zustellinformationen verarbeitet, soweit dies fuer die Zustellung und Nachverfolgung erforderlich ist.',
      'Ob mit allen eingesetzten Dienstleistern Auftragsverarbeitungsvertraege bestehen und welche Einstellungen konkret aktiviert sind, sollte vor Produktivstart geprueft und dokumentiert werden.',
    ],
  },
  {
    title: '12. Speicherdauer und Kriterien der Speicherdauer',
    paragraphs: [
      'Wir speichern personenbezogene Daten nur so lange, wie dies fuer die jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen. Kontodaten speichern wir grundsaetzlich fuer die Dauer des bestehenden Nutzerverhaeltnisses. Kalender-, Slot-, Termin- und Freigabedaten speichern wir, solange sie fuer die Nutzung, Nachvollziehbarkeit, Kommunikation oder Abwehr von Anspruechen benoetigt werden.',
      'Buchungs- und Kommunikationsdaten koennen darueber hinaus fuer einen angemessenen Zeitraum gespeichert bleiben, soweit dies fuer Nachweise, Support, Missbrauchspraevention oder rechtliche Verpflichtungen erforderlich ist. Konkrete Loeschkonzepte und Fristen sollten vor dem produktiven Einsatz verbindlich festgelegt werden.',
    ],
  },
  {
    title: '13. Betroffenenrechte',
    paragraphs: [
      'Betroffene Personen haben nach Massgabe der gesetzlichen Voraussetzungen das Recht auf Auskunft, Berichtigung, Loeschung, Einschraenkung der Verarbeitung, Datenuebertragbarkeit sowie Widerspruch gegen bestimmte Verarbeitungen. Eine erteilte Einwilligung kann mit Wirkung fuer die Zukunft widerrufen werden.',
      'Zur Ausuebung dieser Rechte kann die unter "Verantwortlicher" genannte Kontaktadresse verwendet werden.',
    ],
  },
  {
    title: '14. Beschwerderecht',
    paragraphs: [
      'Betroffene Personen haben das Recht, sich bei einer Datenschutzaufsichtsbehoerde ueber die Verarbeitung ihrer personenbezogenen Daten zu beschweren, insbesondere in dem Mitgliedstaat ihres gewoehnlichen Aufenthalts, ihres Arbeitsplatzes oder des Orts des mutmasslichen Verstosses.',
    ],
  },
  {
    title: '15. Internationale Datenuebermittlungen',
    paragraphs: [
      'Bei der Nutzung von Firebase / Google und Resend kann nicht ausgeschlossen werden, dass personenbezogene Daten auch in Drittstaaten ausserhalb der EU bzw. des EWR verarbeitet oder dorthin uebermittelt werden. In diesen Faellen achten wir darauf, dass geeignete rechtliche Schutzmechanismen vorgesehen sind, etwa EU-Standardvertragsklauseln oder andere zulaessige Garantien.',
      'Welche konkreten Datenfluesse tatsaechlich stattfinden, haengt von der technischen Konfiguration und den genutzten Diensten ab und sollte vor dem produktiven Einsatz im Detail geprueft werden.',
    ],
  },
  {
    title: '16. Stand dieser Datenschutzerklaerung',
    paragraphs: [
      'Stand / Version: 2026-03-19',
      'Unternehmensdaten, konkrete Loeschfristen, zusaetzliche eingesetzte Dienste sowie der genaue rechtliche Zuschnitt dieser Datenschutzerklaerung sollten vor dem produktiven Einsatz ergaenzt und geprueft werden.',
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
  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Heading>Datenschutzerklaerung</Heading>

      <Paragraph>
        Diese Datenschutzerklaerung beschreibt, wie personenbezogene Daten bei der Nutzung dieser
        Terminplaner-App verarbeitet werden. Sie ist auf die derzeit erkennbaren Produktfunktionen
        zugeschnitten, insbesondere Nutzerkonten, persoenliche Kalender, eingeschraenkte oder
        oeffentliche Freigabe, Gastbuchungen ohne Konto, optionale spaetere Kontoanlage sowie
        E-Mail-Kommunikation ueber Firebase / Cloud Functions und Resend.
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
