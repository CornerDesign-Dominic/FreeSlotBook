import { ScrollView, Text, View } from 'react-native';

const sections = [
  {
    title: '1. Anbieter',
    paragraphs: [
      'Anbieter dieser App ist:',
      '[Firmenname]\n[Anschrift]\n[E-Mail]\n[Vertretungsberechtigte Person, falls einschlaegig]',
      'Diese AGB sind ein belastbarer produktspezifischer Erstentwurf fuer die vorliegende Terminplaner-App. Sie ersetzen keine individuelle rechtliche Pruefung, insbesondere nicht hinsichtlich Unternehmensangaben, Haftung, Verbraucherschutz, Preisgestaltung oder branchenspezifischer Anforderungen.',
    ],
  },
  {
    title: '2. Geltungsbereich',
    paragraphs: [
      'Diese Allgemeinen Geschaeftsbedingungen regeln die Nutzung der App durch registrierte Nutzer, Kalenderinhaber, freigegebene Nutzer sowie Gaeste, die ueber oeffentliche Kalender Termine buchen.',
      'Sie gelten fuer die Nutzung der App in ihrer jeweils aktuellen Fassung. Abweichende Bedingungen von Nutzern finden keine Anwendung, es sei denn, ihrer Geltung wurde ausdruecklich zugestimmt.',
    ],
  },
  {
    title: '3. Leistungen der App',
    paragraphs: [
      'Die App bietet eine technische Infrastruktur zur Verwaltung von Terminen und Kalendern. Registrierte Nutzer erhalten genau einen eigenen Kalender. Innerhalb dieses Kalenders koennen freie Slots angelegt, verwaltet, freigegeben und gebucht werden.',
      'Kalender koennen als eingeschraenkt oder oeffentlich gefuehrt werden. Oeffentliche Kalender koennen von Gaesten ohne eigenes Konto ueber eine Buchungsseite genutzt werden. Zusaetzlich unterstuetzt die App E-Mail-Kommunikation und Benachrichtigungen, etwa zur Verifizierung, Buchungsbestaetigung, Kontoeinladung oder Information ueber neue freie Slots.',
      'Die App schuldet grundsaetzlich die Bereitstellung der technischen Buchungs- und Verwaltungsfunktion, nicht jedoch einen bestimmten wirtschaftlichen Erfolg, eine bestimmte Auslastung oder eine ununterbrochene Verfuegbarkeit.',
    ],
  },
  {
    title: '4. Registrierung und Nutzerkonto',
    paragraphs: [
      'Die Nutzung bestimmter Funktionen setzt eine Registrierung voraus. Nutzer muessen bei der Registrierung wahrheitsgemaesse und vollstaendige Angaben machen und ihre Zugangsdaten vertraulich behandeln.',
      'Ein Nutzerkonto ist personengebunden und darf nicht ohne Zustimmung uebertragen oder gemeinschaftlich in missbrauchsgeeigneter Weise verwendet werden. Der Anbieter kann die Nutzung von bestimmten Voraussetzungen abhaengig machen, insbesondere von einer bestaetigten E-Mail-Adresse.',
    ],
  },
  {
    title: '5. Oeffentliche und eingeschraenkte Kalender',
    paragraphs: [
      'Kalenderinhaber entscheiden im Rahmen der bereitgestellten Funktionen selbst, ob ihr Kalender eingeschraenkt oder oeffentlich sichtbar ist. Bei einem oeffentlichen Kalender koennen Dritte freie Slots ohne eigenes Konto sehen und buchen.',
      'Der Kalenderinhaber ist dafuer verantwortlich, die gewaehlte Sichtbarkeit und einen etwaigen oeffentlichen Slug sorgfaeltig zu verwalten. Der Anbieter stellt nur die technische Moeglichkeit zur Verfuegung, uebernimmt aber keine Verantwortung fuer vom Kalenderinhaber verursachte oeffentliche Sichtbarkeit oder deren Folgen.',
    ],
  },
  {
    title: '6. Buchung von Terminen',
    paragraphs: [
      'Termine kommen innerhalb der App dadurch zustande, dass ein freier Slot ausgewaehlt und verbindlich gebucht wird. Die Buchung fuehrt dazu, dass der betreffende Slot nicht mehr als frei angezeigt wird und als gebucht markiert werden kann.',
      'Der Anbieter stellt die technische Buchungsstrecke bereit. Ob und welche weiteren Leistungen ausserhalb der App zwischen Kalenderinhaber und buchender Person vereinbart werden, ist nicht Gegenstand dieser AGB, sofern nicht ausdruecklich etwas anderes vereinbart ist.',
    ],
  },
  {
    title: '7. Gastbuchungen ohne Konto',
    paragraphs: [
      'Bei oeffentlichen Kalendern koennen Termine auch ohne eigenes Konto gebucht werden. Hierfuer muessen mindestens Name, E-Mail-Adresse und der gewaehlte Slot angegeben werden. Vor Abschluss der Buchung muessen die im Produkt vorgesehenen Erklaerungen, insbesondere AGB und Datenschutzhinweise, bestaetigt werden.',
      'Der Gast ist dafuer verantwortlich, dass die bei der Buchung angegebenen Daten richtig sind und die verwendete E-Mail-Adresse erreichbar ist. Die Kommunikation zur Buchung erfolgt in der Regel ueber diese E-Mail-Adresse.',
    ],
  },
  {
    title: '8. Optionale Kontoanlage nach Gastbuchung',
    paragraphs: [
      'Die App kann vorsehen, dass ein Gast im Rahmen der Buchung zugleich angibt, mit derselben E-Mail-Adresse spaeter ein Konto anlegen zu wollen. In diesem Fall kann der Anbieter technische Schritte vorbereiten oder veranlassen, um eine spaetere Registrierung oder Einladung zu ermoeglichen.',
      'Ein Anspruch auf sofortige Kontoanlage oder auf bestimmte Freischaltungsablaeufe besteht hierdurch nicht. Der Anbieter kann zur Sicherheit oder zur rechtlichen Absicherung weitere Bestaetigungsschritte vorsehen.',
    ],
  },
  {
    title: '9. Pflichten der Nutzer',
    paragraphs: [
      'Nutzer duerfen die App nur im Rahmen der geltenden Gesetze und dieser AGB verwenden. Unzulaessig sind insbesondere falsche Identitaetsangaben, unberechtigte Zugriffe, Stoerungen des technischen Betriebs, missbraeuchliche Massenbuchungen, das Umgehen von Sicherheitsmechanismen sowie die Nutzung zu rechtswidrigen oder belaestigenden Zwecken.',
      'Nutzer sind verpflichtet, Zugangsdaten zu schuetzen, Unregelmaessigkeiten unverzueglich zu melden und ihre Angaben aktuell zu halten, soweit sie fuer die Nutzung der App erheblich sind.',
    ],
  },
  {
    title: '10. Pflichten von Kalenderinhabern',
    paragraphs: [
      'Kalenderinhaber sind fuer die von ihnen eingestellten Slots, Freigaben, Sichtbarkeiten, oeffentlichen Buchungsseiten und die inhaltliche Organisation ihrer Termine verantwortlich. Sie haben insbesondere darauf zu achten, dass angebotene Slots zutreffend, aktuell und nicht irrefuehrend sind.',
      'Soweit Kalenderinhaber personenbezogene Daten Dritter ueber die App verarbeiten oder Buchungen von Gaesten entgegennehmen, liegt es in ihrer Verantwortung zu pruefen, ob sie hierfuer weitere rechtliche Informationen, Einwilligungen oder Vereinbarungen benoetigen.',
    ],
  },
  {
    title: '11. Absagen und Stornierungen',
    paragraphs: [
      'Ob und unter welchen Bedingungen Termine abgesagt oder Slots storniert werden koennen, richtet sich zunaechst nach den in der App bereitgestellten Funktionen und im Uebrigen nach den Vereinbarungen zwischen Kalenderinhaber und buchender Person.',
      'Soweit die App eine technische Stornierung ermoeglicht, fuehrt dies in der Regel zu einer Statusaenderung des betroffenen Slots oder Termins sowie gegebenenfalls zu einer Benachrichtigung per E-Mail. Ein Anspruch auf kostenfreie oder fristlose Stornierung ergibt sich allein aus der technischen Funktion nicht.',
    ],
  },
  {
    title: '12. Verfuegbarkeit und technische Einschraenkungen',
    paragraphs: [
      'Der Anbieter bemueht sich um eine moeglichst stoerungsfreie Nutzbarkeit der App. Eine jederzeitige, ununterbrochene und fehlerfreie Verfuegbarkeit kann jedoch nicht zugesichert werden. Wartungen, Weiterentwicklungen, Sicherheitsmassnahmen, Stoerungen externer Dienste oder Netzwerkausfaelle koennen die Nutzbarkeit zeitweise einschraenken.',
      'Die App basiert technisch insbesondere auf Firebase, Firestore, Firebase Auth, Cloud Functions sowie E-Mail-Versand ueber Resend. Einschraenkungen oder Ausfaelle dieser Dienste koennen sich unmittelbar auf Registrierung, Login, Terminbuchung, Benachrichtigungen und E-Mail-Kommunikation auswirken.',
    ],
  },
  {
    title: '13. Haftung',
    paragraphs: [
      'Der Anbieter haftet nach den gesetzlichen Vorschriften fuer Vorsatz und grobe Fahrlaessigkeit. Bei einfacher Fahrlaessigkeit haftet der Anbieter nur bei Verletzung einer wesentlichen Vertragspflicht und der Hoehe nach begrenzt auf den typischerweise vorhersehbaren Schaden.',
      'Keine Haftung wird uebernommen fuer Inhalte, Angaben oder Terminabsprachen, die Nutzer oder Gaeste selbst einstellen oder ausserhalb der App treffen, sowie fuer Stoerungen, die ausserhalb des Einflussbereichs des Anbieters liegen, insbesondere bei Ausfaellen externer Infrastrukturdienste.',
      'Vor dem produktiven Einsatz sollte diese Haftungsklausel insbesondere im Hinblick auf Verbraucherschutz, zwingendes Recht und das konkrete Geschaeftsmodell rechtlich geprueft werden.',
    ],
  },
  {
    title: '14. Sperrung bei Missbrauch',
    paragraphs: [
      'Der Anbieter kann Nutzerkonten oder einzelne Nutzungen voruebergehend beschraenken oder sperren, wenn konkrete Anhaltspunkte fuer Missbrauch, Sicherheitsrisiken, falsche Angaben, Rechtsverstoesse oder erhebliche Stoerungen des Betriebs vorliegen.',
      'Soweit zumutbar, werden Betroffene ueber eine Sperrung informiert. Ein Anspruch auf Wiederfreischaltung besteht erst, wenn die Gruende fuer die Sperrung entfallen und keine berechtigten Interessen des Anbieters entgegenstehen.',
    ],
  },
  {
    title: '15. Aenderungen der Leistungen oder Bedingungen',
    paragraphs: [
      'Der Anbieter kann die App, einzelne Funktionen sowie diese AGB anpassen, wenn hierfuer sachliche Gruende bestehen, insbesondere technische Weiterentwicklungen, Sicherheitsanforderungen, rechtliche Aenderungen oder Aenderungen des Leistungsumfangs.',
      'Wesentliche Aenderungen, die das Vertragsverhaeltnis erheblich betreffen, sollen in geeigneter Weise mitgeteilt werden. Soweit gesetzlich erforderlich, werden zusaetzliche Zustimmungs- oder Informationspflichten beachtet.',
    ],
  },
  {
    title: '16. Schlussbestimmungen',
    paragraphs: [
      'Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts, soweit dem keine zwingenden gesetzlichen Verbraucherschutzvorschriften entgegenstehen.',
      'Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam sein oder werden, bleibt die Wirksamkeit der uebrigen Bestimmungen unberuehrt. An die Stelle der unwirksamen Bestimmung tritt die gesetzliche Regelung.',
    ],
  },
  {
    title: '17. Stand dieser AGB',
    paragraphs: [
      'Stand / Version: 2026-03-19',
      'Vor dem produktiven Einsatz sollten insbesondere Anbieterangaben, Haftung, Verbraucherschutz, etwaige Verguetungsregelungen, branchenspezifische Besonderheiten und das Verhaeltnis zwischen Anbieter, Kalenderinhaber und Gast rechtlich geprueft und finalisiert werden.',
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

export default function TermsScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Heading>Allgemeine Geschaeftsbedingungen</Heading>

      <Paragraph>
        Diese AGB sind auf die derzeitige Produktlogik der App zugeschnitten: persoenliche
        Kalender je Nutzer, eingeschraenkte oder oeffentliche Sichtbarkeit, Terminbuchung durch
        registrierte Nutzer oder Gaeste, optionale spaetere Kontoanlage nach Gastbuchung sowie
        E-Mail-Kommunikation ueber die eingesetzte technische Infrastruktur.
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
