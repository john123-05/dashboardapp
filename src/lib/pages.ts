import type { ComponentProps } from 'react';
import { NO_IN_APP_COMMERCE } from './storePolicy';
import type { Ionicons } from '@expo/vector-icons';
import type { PageKey } from './permissions';
import { tr } from '../i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface PageEntry {
  key: PageKey;
  title: string;
  short?: string;
  icon: IconName;
  group: 'Betrieb' | 'Marketing' | 'Verwaltung';
  // Native Seite der App (Name im Navigator). Ohne `route` öffnet sich die Web-Seite (`path`) in der App.
  route?: string;
  path?: string;
  tab?: boolean;
  modal?: boolean;
}

// Reihenfolge und Namen wie in der Seitenleiste des Web-Dashboards. Welche Einträge ein Nutzer sieht,
// entscheidet canSee() aus permissions.ts (Seitenauswahl im CRM).
/** Anzeigename der Seitengruppen (Schlüssel bleiben deutsch). */
export const GROUP_LABEL = {
  get Betrieb() { return tr('Betrieb'); },
  get Marketing() { return tr('Marketing'); },
  get Verwaltung() { return tr('Verwaltung'); },
};

export const PAGES: PageEntry[] = [
  { key: 'overview', get title() { return tr('Übersicht'); }, icon: 'home-outline', group: 'Betrieb', route: 'Overview', tab: true },
  { key: 'revenue', get title() { return tr('Umsatz'); }, icon: 'stats-chart-outline', group: 'Betrieb', route: 'Revenue', tab: true },
  { key: 'health', get title() { return tr('Systemzustand'); }, short: 'System', icon: 'pulse-outline', group: 'Betrieb', route: 'Health', tab: true },
  { key: 'photos', get title() { return tr('Fotos'); }, icon: 'images-outline', group: 'Betrieb', route: 'Photos', tab: true },
  { key: 'purchases', get title() { return tr('Käufe'); }, icon: 'receipt-outline', group: 'Betrieb', route: 'Purchases' },
  { key: 'speed', get title() { return tr('Speedmessung'); }, icon: 'speedometer-outline', group: 'Betrieb', route: 'Speed' },
  { key: 'kamera', get title() { return tr('Kamera'); }, icon: 'camera-outline', group: 'Betrieb', route: 'Camera' },
  { key: 'marketing', get title() { return tr('Marketing-CRM'); }, icon: 'megaphone-outline', group: 'Marketing', route: 'Marketing' },
  { key: 'personalization', get title() { return tr('Personalisierung'); }, icon: 'color-wand-outline', group: 'Marketing', route: 'Personalization' },
  { key: 'shop', get title() { return tr('Online-Shop'); }, icon: 'bag-handle-outline', group: 'Marketing', route: 'Shop' },
  { key: 'configuration', get title() { return tr('Konfiguration'); }, icon: 'storefront-outline', group: 'Verwaltung', route: 'Configuration', modal: true },
  { key: 'tickets', get title() { return tr('Support'); }, icon: 'help-buoy-outline', group: 'Verwaltung', route: 'Support' },
  { key: 'settings', get title() { return tr('Einstellungen'); }, icon: 'settings-outline', group: 'Verwaltung', route: 'Settings' },
  { key: 'team', get title() { return tr('Mitarbeiter-Zugang'); }, icon: 'people-outline', group: 'Verwaltung', route: 'Team' },
  { key: 'plans', get title() { return tr('Pläne und Abrechnung'); }, icon: 'card-outline', group: 'Verwaltung', route: 'Plans' },
];

// Wie im Web (src/lib/superAdmin.ts): diese Konten dürfen ohne Park-Passwort zwischen Parks wechseln.
const SUPER_ADMINS = ['tomnotes.tn@gmail.com', 'john.m.nolting@gmail.com'];
export const isSuperAdminEmail = (email: string | null | undefined) => !!email && SUPER_ADMINS.includes(email.trim().toLowerCase());

// Seiten, die es nur unter einer Bedingung gibt: die Kamera nur, solange ein Automat sie erreichbar meldet.
export function pageAvailable(p: PageEntry, ctx: { cameraAvailable: boolean | null }) {
  if (p.key === 'kamera') return ctx.cameraAvailable === true;
  if (p.key === 'plans') return !NO_IN_APP_COMMERCE;
  return true;
}

// Eine Seite öffnen: native Seite oder Web-Seite in der App-Hülle.
export function openPage(nav: { navigate: (name: string, params?: object) => void }, p: PageEntry) {
  if (p.route) nav.navigate(p.route);
  else nav.navigate('Web', { path: p.path, title: p.title });
}
