import type { PageKey, Viewer } from '../../lib/permissions';
import { canSee } from '../../lib/permissions';
import type { CoachStep } from './Coach';

type Def = CoachStep & { page?: PageKey; only?: 'phone' | 'wide' };

// Reihenfolge wie die Seitenleiste. Seiten, die jemand nicht sehen darf (Rechte aus dem CRM), oder die
// es für den Park nicht gibt (Kamera), fallen heraus.
const ALL: Def[] = [
  { route: 'Overview', tab: true, page: 'overview', target: 'overview.kpis', icon: 'home-outline', title: 'Dein Tag auf einen Blick', text: 'Umsatz, verkaufte Fotos, Fahrten und Kaufquote von heute – direkt vom Automaten. Zum Aktualisieren die Seite nach unten ziehen.' },
  { route: 'Overview', tab: true, page: 'overview', target: 'overview.rush', icon: 'time-outline', title: 'Stoßzeiten', text: 'Wann am meisten gefahren und gekauft wird. Tippe auf eine Säule, um die Stunde genau zu sehen.' },
  { route: 'Revenue', tab: true, page: 'revenue', target: 'revenue.range', icon: 'stats-chart-outline', title: 'Umsatz', text: 'Zeitraum wählen – darunter der Verlauf, jeder Automat einzeln und jeder Tag mit Fotos und Betrag.' },
  { route: 'Health', tab: true, page: 'health', target: 'health.view', icon: 'pulse-outline', title: 'Systemzustand', text: 'Jeder Automat mit Papier, Kamera, Drucker und Verbindung. „Einfache Ansicht“ zeigt nur, was zählt.' },
  { route: 'Photos', tab: true, page: 'photos', target: 'photos.search', icon: 'images-outline', title: 'Fotos finden', text: 'Die neuesten Fotos, oder gezielt nach Bildnummer und Uhrzeit. Ein Foto antippen zeigt den QR-Code, mit dem der Gast es sich abholt.' },
  { route: 'Overview', tab: true, target: 'header.bell', icon: 'notifications-outline', title: 'Glocke', text: 'Störungen, Papiermangel, Antworten vom Support und Hinweise von Liftpictures. Ein roter Punkt heißt: es gibt etwas Neues.' },
  { route: 'Overview', tab: true, target: 'tabbar.more', only: 'phone', icon: 'grid-outline', title: 'Alles Weitere unter „Mehr“', text: 'Käufe, Kamera, Marketing, Shop, Einstellungen und mehr. Zwischen den Tabs kannst du auch seitlich wischen.' },
  { route: 'Overview', target: 'sidebar', only: 'wide', icon: 'grid-outline', title: 'Alle Seiten links', text: 'Betrieb, Marketing und Verwaltung – wie im Web-Dashboard. Unten dein Konto, Hell/Dunkel und die Glocke.' },
  { route: 'Camera', page: 'kamera', target: 'camera.photo', icon: 'camera-outline', title: 'Kamera', text: 'Das letzte echte Foto vom Automaten. Mit „Testfoto“ löst du eine Aufnahme aus und siehst sie nach etwa einer Minute.' },
  { route: 'Camera', page: 'kamera', target: 'camera.controls', icon: 'options-outline', title: 'Bild einstellen', text: 'Regler verschieben – die Vorschau zeigt die Wirkung sofort. Erst „An Kamera senden“ stellt die Kamera wirklich um.' },
  { route: 'Marketing', page: 'marketing', target: 'marketing.tabs', icon: 'megaphone-outline', title: 'Marketing-CRM', text: 'Kontakte, E-Mails, Social Media, Umfrage mit allen Antworten und Werbe-Pixel. Der grüne Punkt zeigt, wie Gäste gerade freischalten.' },
  { route: 'Personalization', page: 'personalization', target: 'perso.slots', icon: 'color-wand-outline', title: 'Personalisierung', text: 'Was gerade am Automaten zu sehen ist. „Ändern“ schickt ein neues Bild, im Overlay-Studio baust du eigene Overlays.' },
  { route: 'Shop', page: 'shop', target: 'shop.own', icon: 'bag-handle-outline', title: 'Online-Shop', text: 'Gäste kaufen ihr Foto auch nach dem Besuch – als Download oder auf Tasse und T-Shirt. Hier stellst du Produkte und Preise ein.' },
  { route: 'Plans', page: 'plans', target: 'plans.tabs', icon: 'card-outline', title: 'Preise & Pakete', text: 'Dein Plan, Aktionen und alles, was du dazubuchen kannst. Anfragen landen direkt bei uns.' },
  { route: 'Overview', tab: true, icon: 'sparkles-outline', title: 'Fertig!', text: 'Den Rundgang findest du jederzeit wieder unter Konto → „Rundgang starten“ und im Hilfe-Center.' },
];

export function coachSteps(viewer: Viewer, opts: { wide: boolean; cameraAvailable: boolean | null }): CoachStep[] {
  return ALL.filter((s) => (!s.only || (s.only === 'wide') === opts.wide) && (!s.page || canSee(s.page, viewer)) && (s.page !== 'kamera' || opts.cameraAvailable === true));
}
