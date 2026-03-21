import { ScrollView, Text, View } from 'react-native';

import { useBottomSafeContentStyle } from '../src/theme/ui';

const sections = [
  {
    title: '1. Anbieter',
    paragraphs: [
      'Anbieter dieser App ist:',
      '[Firmenname]\n[Anschrift]\n[E-Mail]\n[Vertretungsberechtigte Person, falls einschlägig]',
      'Diese AGB sind ein belastbarer produktspezifischer Erstentwurf für die vorliegende Terminplaner-App. Sie ersetzen keine individuelle rechtliche Prüfung, insbesondere nicht hinsichtlich Unternehmensangaben, Haftung, Verbraucherschutz, Preisgestaltung oder branchenspezifischer Anforderungen.',
    ],
  },
  {
    title: '2. Geltungsbereich',
    paragraphs: [
      'Diese Allgemeinen Geschäftsbedingungen regeln die Nutzung der App durch registrierte Nutzer, Kalenderinhaber, freigegebene Nutzer sowie Gäste, die über öffentliche Kalender Termine buchen.',
      'Sie gelten für die Nutzung der App in ihrer jeweils aktuellen Fassung. Abweichende Bedingungen von Nutzern finden keine Anwendung, es sei denn, ihrer Geltung wurde ausdrücklich zugestimmt.',
    ],
  },
  {
    title: '3. Leistungen der App',
    paragraphs: [
      'Die App bietet eine technische Infrastruktur zur Verwaltung von Terminen und Kalendern. Registrierte Nutzer erhalten genau einen eigenen Kalender. Innerhalb dieses Kalenders können freie Slots angelegt, verwaltet, freigegeben und gebucht werden.',
      'Kalender können als eingeschränkt oder öffentlich geführt werden. Öffentliche Kalender können von Gästen ohne eigenes Konto über eine Buchungsseite genutzt werden. Zusätzlich unterstützt die App E-Mail-Kommunikation und Benachrichtigungen, etwa zur Verifizierung, Buchungsbestätigung, Kontoeinladung oder Information über neue freie Slots.',
      'Die App schuldet grundsätzlich die Bereitstellung der technischen Buchungs- und Verwaltungsfunktion, nicht jedoch einen bestimmten wirtschaftlichen Erfolg, eine bestimmte Auslastung oder eine ununterbrochene Verfügbarkeit.',
    ],
  },
  {
    title: '4. Registrierung und Nutzerkonto',
    paragraphs: [
      'Die Nutzung bestimmter Funktionen setzt eine Registrierung voraus. Nutzer müssen bei der Registrierung wahrheitsgemäße und vollständige Angaben machen und ihre Zugangsdaten vertraulich behandeln.',
      'Ein Nutzerkonto ist personengebunden und darf nicht ohne Zustimmung übertragen oder gemeinschaftlich in missbrauchsgeeigneter Weise verwendet werden. Der Anbieter kann die Nutzung von bestimmten Voraussetzungen abhängig machen, insbesondere von einer bestätigten E-Mail-Adresse.',
    ],
  },
  {
    title: '5. Öffentliche und eingeschränkte Kalender',
    paragraphs: [
      'Kalenderinhaber entscheiden im Rahmen der bereitgestellten Funktionen selbst, ob ihr Kalender eingeschränkt oder öffentlich sichtbar ist. Bei einem öffentlichen Kalender können Dritte freie Slots ohne eigenes Konto sehen und buchen.',
      'Der Kalenderinhaber ist dafür verantwortlich, die gewählte Sichtbarkeit und einen etwaigen öffentlichen Slug sorgfältig zu verwalten. Der Anbieter stellt nur die technische Möglichkeit zur Verfügung, übernimmt aber keine Verantwortung für vom Kalenderinhaber verursachte öffentliche Sichtbarkeit oder deren Folgen.',
    ],
  },
  {
    title: '6. Buchung von Terminen',
    paragraphs: [
      'Termine kommen innerhalb der App dadurch zustande, dass ein freier Slot ausgewählt und verbindlich gebucht wird. Die Buchung führt dazu, dass der betreffende Slot nicht mehr als frei angezeigt wird und als gebucht markiert werden kann.',
      'Der Anbieter stellt die technische Buchungsstrecke bereit. Ob und welche weiteren Leistungen außerhalb der App zwischen Kalenderinhaber und buchender Person vereinbart werden, ist nicht Gegenstand dieser AGB, sofern nicht ausdrücklich etwas anderes vereinbart ist.',
    ],
  },
  {
    title: '7. Gastbuchungen ohne Konto',
    paragraphs: [
      'Bei öffentlichen Kalendern können Termine auch ohne eigenes Konto gebucht werden. Hierfür müssen mindestens Name, E-Mail-Adresse und der gewählte Slot angegeben werden. Vor Abschluss der Buchung müssen die im Produkt vorgesehenen Erklärungen, insbesondere AGB und Datenschutzhinweise, bestätigt werden.',
      'Der Gast ist dafür verantwortlich, dass die bei der Buchung angegebenen Daten richtig sind und die verwendete E-Mail-Adresse erreichbar ist. Die Kommunikation zur Buchung erfolgt in der Regel über diese E-Mail-Adresse.',
    ],
  },
  {
    title: '8. Optionale Kontoanlage nach Gastbuchung',
    paragraphs: [
      'Die App kann vorsehen, dass ein Gast im Rahmen der Buchung zugleich angibt, mit derselben E-Mail-Adresse später ein Konto anlegen zu wollen. In diesem Fall kann der Anbieter technische Schritte vorbereiten oder veranlassen, um eine spätere Registrierung oder Einladung zu ermöglichen.',
      'Ein Anspruch auf sofortige Kontoanlage oder auf bestimmte Freischaltungsabläufe besteht hierdurch nicht. Der Anbieter kann zur Sicherheit oder zur rechtlichen Absicherung weitere Bestätigungsschritte vorsehen.',
    ],
  },
  {
    title: '9. Pflichten der Nutzer',
    paragraphs: [
      'Nutzer dürfen die App nur im Rahmen der geltenden Gesetze und dieser AGB verwenden. Unzulässig sind insbesondere falsche Identitätsangaben, unberechtigte Zugriffe, Störungen des technischen Betriebs, missbräuchliche Massenbuchungen, das Umgehen von Sicherheitsmechanismen sowie die Nutzung zu rechtswidrigen oder belästigenden Zwecken.',
      'Nutzer sind verpflichtet, Zugangsdaten zu schützen, Unregelmäßigkeiten unverzüglich zu melden und ihre Angaben aktuell zu halten, soweit sie für die Nutzung der App erheblich sind.',
    ],
  },
  {
    title: '10. Pflichten von Kalenderinhabern',
    paragraphs: [
      'Kalenderinhaber sind für die von ihnen eingestellten Slots, Freigaben, Sichtbarkeiten, öffentlichen Buchungsseiten und die inhaltliche Organisation ihrer Termine verantwortlich. Sie haben insbesondere darauf zu achten, dass angebotene Slots zutreffend, aktuell und nicht irreführend sind.',
      'Soweit Kalenderinhaber personenbezogene Daten Dritter über die App verarbeiten oder Buchungen von Gästen entgegennehmen, liegt es in ihrer Verantwortung zu prüfen, ob sie hierfür weitere rechtliche Informationen, Einwilligungen oder Vereinbarungen benötigen.',
    ],
  },
  {
    title: '11. Absagen und Stornierungen',
    paragraphs: [
      'Ob und unter welchen Bedingungen Termine abgesagt oder Slots storniert werden können, richtet sich zunächst nach den in der App bereitgestellten Funktionen und im Übrigen nach den Vereinbarungen zwischen Kalenderinhaber und buchender Person.',
      'Soweit die App eine technische Stornierung ermöglicht, führt dies in der Regel zu einer Statusänderung des betroffenen Slots oder Termins sowie gegebenenfalls zu einer Benachrichtigung per E-Mail. Ein Anspruch auf kostenfreie oder fristlose Stornierung ergibt sich allein aus der technischen Funktion nicht.',
    ],
  },
  {
    title: '12. Verfügbarkeit und technische Einschränkungen',
    paragraphs: [
      'Der Anbieter bemüht sich um eine möglichst störungsfreie Nutzbarkeit der App. Eine jederzeitige, ununterbrochene und fehlerfreie Verfügbarkeit kann jedoch nicht zugesichert werden. Wartungen, Weiterentwicklungen, Sicherheitsmaßnahmen, Störungen externer Dienste oder Netzwerkausfälle können die Nutzbarkeit zeitweise einschränken.',
      'Die App basiert technisch insbesondere auf Firebase, Firestore, Firebase Auth, Cloud Functions sowie E-Mail-Versand über Resend. Einschränkungen oder Ausfälle dieser Dienste können sich unmittelbar auf Registrierung, Login, Terminbuchung, Benachrichtigungen und E-Mail-Kommunikation auswirken.',
    ],
  },
  {
    title: '13. Haftung',
    paragraphs: [
      'Der Anbieter haftet nach den gesetzlichen Vorschriften für Vorsatz und grobe Fahrlässigkeit. Bei einfacher Fahrlässigkeit haftet der Anbieter nur bei Verletzung einer wesentlichen Vertragspflicht und der Höhe nach begrenzt auf den typischerweise vorhersehbaren Schaden.',
      'Keine Haftung wird übernommen für Inhalte, Angaben oder Terminabsprachen, die Nutzer oder Gäste selbst einstellen oder außerhalb der App treffen, sowie für Störungen, die außerhalb des Einflussbereichs des Anbieters liegen, insbesondere bei Ausfällen externer Infrastrukturdienste.',
      'Vor dem produktiven Einsatz sollte diese Haftungsklausel insbesondere im Hinblick auf Verbraucherschutz, zwingendes Recht und das konkrete Geschäftsmodell rechtlich geprüft werden.',
    ],
  },
  {
    title: '14. Sperrung bei Missbrauch',
    paragraphs: [
      'Der Anbieter kann Nutzerkonten oder einzelne Nutzungen vorübergehend beschränken oder sperren, wenn konkrete Anhaltspunkte für Missbrauch, Sicherheitsrisiken, falsche Angaben, Rechtsverstöße oder erhebliche Störungen des Betriebs vorliegen.',
      'Soweit zumutbar, werden Betroffene über eine Sperrung informiert. Ein Anspruch auf Wiederfreischaltung besteht erst, wenn die Gründe für die Sperrung entfallen und keine berechtigten Interessen des Anbieters entgegenstehen.',
    ],
  },
  {
    title: '15. Änderungen der Leistungen oder Bedingungen',
    paragraphs: [
      'Der Anbieter kann die App, einzelne Funktionen sowie diese AGB anpassen, wenn hierfür sachliche Gründe bestehen, insbesondere technische Weiterentwicklungen, Sicherheitsanforderungen, rechtliche Änderungen oder Änderungen des Leistungsumfangs.',
      'Wesentliche Änderungen, die das Vertragsverhältnis erheblich betreffen, sollen in geeigneter Weise mitgeteilt werden. Soweit gesetzlich erforderlich, werden zusätzliche Zustimmungs- oder Informationspflichten beachtet.',
    ],
  },
  {
    title: '16. Schlussbestimmungen',
    paragraphs: [
      'Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts, soweit dem keine zwingenden gesetzlichen Verbraucherschutzvorschriften entgegenstehen.',
      'Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. An die Stelle der unwirksamen Bestimmung tritt die gesetzliche Regelung.',
    ],
  },
  {
    title: '17. Stand dieser AGB',
    paragraphs: [
      'Stand / Version: 2026-03-19',
      'Vor dem produktiven Einsatz sollten insbesondere Anbieterangaben, Haftung, Verbraucherschutz, etwaige Vergütungsregelungen, branchenspezifische Besonderheiten und das Verhältnis zwischen Anbieter, Kalenderinhaber und Gast rechtlich geprüft und finalisiert werden.',
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
  const contentContainerStyle = useBottomSafeContentStyle({ padding: 16 });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={contentContainerStyle}>
      <Heading>Allgemeine Geschäftsbedingungen</Heading>

      <Paragraph>
        Diese AGB sind auf die derzeitige Produktlogik der App zugeschnitten: persönliche
        Kalender je Nutzer, eingeschränkte oder öffentliche Sichtbarkeit, Terminbuchung durch
        registrierte Nutzer oder Gäste, optionale spätere Kontoanlage nach Gastbuchung sowie
        E-Mail-Kommunikation über die eingesetzte technische Infrastruktur.
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
