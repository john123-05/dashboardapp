
import { tr } from '../i18n';// Hilfe-Center und Rundgang: Texte aus dem Web-Dashboard (help.*, tour.* in locales/de.ts).
export type HelpArticle = { id: string; title: string; body: string; route: string | null };
export const HELP_ARTICLES: HelpArticle[] = [
 {
  "id": "overview",
  get "title"() { return tr('Was zeigt die Übersicht?'); },
  get "body"() { return tr('Oben stehen Umsatz und verkaufte Fotos von heute und vom Monat, darunter die Stoßzeiten nach Stunde. Rechts siehst du Hinweise und Aktivitäten, z. B. neue Antworten vom Support. Neben der Begrüßung steht, ob dein Park gerade geöffnet ist.'); },
  "route": "Overview"
 },
 {
  "id": "revenue",
  get "title"() { return tr('Wie wird der Umsatz berechnet?'); },
  get "body"() { return tr('Gezählt wird jeder Verkauf, den dein Automat meldet. Oben rechts wählst du den Zeitraum. Hast du mehrere Automaten, zeigt „Umsatz je Automat“ die Aufteilung.'); },
  "route": "Revenue"
 },
 {
  "id": "payments",
  get "title"() { return tr('Bar oder Karte – woher kommt die Zahlungsart?'); },
  get "body"() { return tr('Der Automat hält bei jedem Kauf fest, ob bar oder mit Karte bezahlt wurde. Kartenzahlungen werden zusätzlich mit dem Beleg des Kartenterminals abgeglichen. Unter „Käufe“ findest du jeden Kauf mit Zahlungsart und Beleg, auch Monate zurück.'); },
  "route": "Purchases"
 },
 {
  "id": "photos",
  get "title"() { return tr('Wo finde ich die Fotos?'); },
  get "body"() { return tr('Unter „Fotos“ siehst du die neuesten Bilder deiner Kamera. Gäste holen gekaufte Fotos mit dem Code auf ihrem Ausdruck online ab.'); },
  "route": "Photos"
 },
 {
  "id": "unlock",
  get "title"() { return tr('Wie schalten Gäste ihr Foto frei?'); },
  get "body"() { return tr('Im CRM legst du oben fest, was Gäste tun, um ihr digitales Foto zu bekommen: Kontaktdaten angeben, eine kurze Umfrage beantworten oder einen Social-Media-Beitrag melden. Die Änderung gilt sofort auf der Abholseite.'); },
  "route": "Marketing"
 },
 {
  "id": "export",
  get "title"() { return tr('Kontakte exportieren'); },
  get "body"() { return tr('Im CRM unter „Kontakte“ kannst du die Liste filtern und mit „CSV exportieren“ als Datei speichern, z. B. für deinen Newsletter. Nutze für Werbung nur Kontakte, die zugestimmt haben.'); },
  "route": "Marketing"
 },
 {
  "id": "overlay",
  get "title"() { return tr('Ein neues Overlay erstellen'); },
  get "body"() { return tr('Im Overlay-Studio startest du mit einer Vorlage oder einer leeren Fläche, fügst Texte, Formen und dein Logo hinzu und speicherst das Ergebnis als Overlay. Mit „Foto einblenden“ siehst du, wie es auf einem echten Foto wirkt.'); },
  "route": null
 },
 {
  "id": "overlay_live",
  get "title"() { return tr('Wann ist ein neues Overlay am Automaten zu sehen?'); },
  get "body"() { return tr('Unter „Overlays ändern“ wählst du das Bild und sendest es an den Automaten. Zu sehen ist es erst nach einem Neustart des Verkaufsprogramms – sofort oder heute Nacht in der Ruhezeit.'); },
  "route": null
 },
 {
  "id": "status",
  get "title"() { return tr('Was bedeuten die Farben im Systemzustand?'); },
  get "body"() { return tr('Grün heißt: läuft. Blau: läuft, hat aber eine Weile nichts gemeldet – meist ist nur niemand gefahren. Gelb: eingeschränkt, Rot: ausgefallen. Ein Klick auf eine Station zeigt die Details.'); },
  "route": "Health"
 },
 {
  "id": "restart",
  get "title"() { return tr('Ein Programm neu starten'); },
  get "body"() { return tr('Im Systemzustand die Zeile des Programms aufklappen und „Jetzt neu starten“ oder „Heute Nacht“ wählen. Der Automat holt den Auftrag beim nächsten Abgleich ab; die Schritte darunter zeigen, wann es wieder läuft. Während des Neustarts verkauft der Automat kurz nichts.'); },
  "route": "Health"
 },
 {
  "id": "paper",
  get "title"() { return tr('Fotopapier: wann nachfüllen?'); },
  get "body"() { return tr('Auf der Karte jedes Automaten steht, wie viele Ausdrucke noch auf der Rolle sind. Wird es knapp, färbt sich die Anzeige gelb und du bekommst eine Benachrichtigung oben rechts.'); },
  "route": "Health"
 },
 {
  "id": "price",
  get "title"() { return tr('Bildpreis am Automaten ändern'); },
  get "body"() { return tr('In den Einstellungen unter „Bildpreis am Automaten“ legst du den Preis pro Bild fest, auf den Cent genau.'); },
  "route": "Settings"
 },
 {
  "id": "hours",
  get "title"() { return tr('Öffnungszeiten einstellen'); },
  get "body"() { return tr('In den Einstellungen hinterlegst du die Öffnungszeiten je Wochentag, Saisonzeiten und Ausnahmen wie Feiertage. Danach richtet sich z. B. die Anzeige, ob dein Park geöffnet ist.'); },
  "route": "Settings"
 },
 {
  "id": "team",
  get "title"() { return tr('Mitarbeiter hinzufügen'); },
  get "body"() { return tr('Unter „Mitarbeiter“ legst du für dein Team eigene Zugänge mit Passwort an. Mitarbeiter sehen nur die Seiten für die tägliche Arbeit, z. B. Fotos und Systemzustand.'); },
  "route": "Team"
 },
 {
  "id": "upgrades",
  get "title"() { return tr('Upgrades und Ausstattung'); },
  get "body"() { return tr('Unter „Konfiguration“ siehst du, was dein Automat schon hat, und kannst weitere Produkte wie PrintBox, Cashbox, Online-Shop oder Speedmessung anfragen. Wir melden uns nach jeder Anfrage persönlich.'); },
  "route": "Configuration"
 },
 {
  "id": "support",
  get "title"() { return tr('So erreichst du den Support'); },
  get "body"() { return tr('Unter „Support“ schreibst du uns ein Ticket – die Antwort erscheint dort und als Benachrichtigung oben rechts. In dringenden Fällen erreichst du uns auch telefonisch.'); },
  "route": "Support"
 }
];

export const FAQ: { q: string; a: string }[] = [
 {
  get "q"() { return tr('Was passiert, wenn ich „Anfragen“ tippe?'); },
  get "a"() { return tr('Wir bekommen eine Benachrichtigung und melden uns bei dir. Es wird noch nichts automatisch bestellt oder berechnet.'); }
 },
 {
  get "q"() { return tr('Woher kommen die Umsatz-Schätzungen?'); },
  get "a"() { return tr('Die hinterlegt unser Team individuell für deinen Park, basierend auf deinen Analyse-Daten.'); }
 },
 {
  get "q"() { return tr('Warum sehe ich manche Seiten nicht?'); },
  get "a"() { return tr('Welche Seiten ein Mitarbeiter sieht, legt der Inhaber im Mitarbeiter-Zugang fest. Manche Funktionen gehören außerdem zu einem Paket, z. B. Marketing Starter oder die Speedmessung.'); }
 },
 {
  get "q"() { return tr('Wie bekomme ich Mitteilungen aufs Handy?'); },
  get "a"() { return tr('Unter Konto → Einstellungen den Schalter „Dieses Gerät“ einschalten und iOS-Mitteilungen erlauben. Mit „Test-Benachrichtigung senden“ prüfst du es sofort.'); }
 }
];

export const TOUR: { title: string; text: string; icon: string; route: string }[] = [
 {
  get "title"() { return tr('Übersicht'); },
  get "text"() { return tr('Hier bekommst du den schnellsten Gesamtüberblick über deinen Park, ohne dich erst durch einzelne Bereiche zu klicken. Du siehst die wichtigsten Tages- und Monatszahlen, die Umsatzkurve und aktuelle operative Hinweise auf einen Blick.'); },
  "icon": "home-outline",
  "route": "Overview"
 },
 {
  get "title"() { return tr('Umsatz'); },
  get "text"() { return tr('Diese Seite hilft dir, Einnahmen genauer zu verstehen und Trends schneller zu erkennen. Du kannst Tagesverläufe, Monatsentwicklung und Verkaufsleistung nach Zeitraum oder Datenbasis prüfen.'); },
  "icon": "stats-chart-outline",
  "route": "Revenue"
 },
 {
  get "title"() { return tr('Fotos'); },
  get "text"() { return tr('Diese Seite ist dein operativer Blick auf die erzeugten Bilder und zeigt dir sofort, ob der Fotozufluss passt. Du kannst nach Bildnummer, Datum oder Quelle suchen, Vorschauen öffnen und Volumen nach Tagen vergleichen.'); },
  "icon": "images-outline",
  "route": "Photos"
 },
 {
  get "title"() { return tr('Systemzustand'); },
  get "text"() { return tr('Diese Seite zeigt dir, ob Kameras, Uploads und Maschinen stabil laufen oder Aufmerksamkeit brauchen. Du kannst Maschinenstatus, letzte Signale, Fehlerbilder und Ausfälle prüfen und direkt Auffälligkeiten erkennen.'); },
  "icon": "pulse-outline",
  "route": "Health"
 },
 {
  get "title"() { return tr('Käufe'); },
  get "text"() { return tr('Hier siehst du jede einzelne Transaktion und kannst schnell nachvollziehen, was am Automaten verkauft wurde. Du kannst Käufe filtern, durchsuchen, exportieren und einzelne Vorgänge nach Datum, Betrag oder Quelle prüfen.'); },
  "icon": "receipt-outline",
  "route": "Purchases"
 },
 {
  get "title"() { return tr('CRM'); },
  get "text"() { return tr('Hier erkennst du, welche Gäste ihre Bilder digital freischalten oder nach dem Besuch noch mit dem Bild interagieren. Du kannst Kontakte filtern, nach Land segmentieren, einzelne Einträge löschen und die Weltkarte sowie Einlösezeiten auswerten.'); },
  "icon": "megaphone-outline",
  "route": "Marketing"
 },
 {
  get "title"() { return tr('Support'); },
  get "text"() { return tr('Hier laufen technische oder organisatorische Rückfragen zusammen, damit du Probleme schneller lösen kannst. Du kannst Tickets lesen, beantworten, archivieren und neue Fälle anlegen, wenn etwas im Betrieb auffällt.'); },
  "icon": "help-buoy-outline",
  "route": "Support"
 }
];

export const SUPPORT_EMAIL = 'info@liftpictures.com';
