import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { PageKey } from './permissions';

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
export const PAGES: PageEntry[] = [
  { key: 'overview', title: 'Übersicht', icon: 'home-outline', group: 'Betrieb', route: 'Overview', tab: true },
  { key: 'revenue', title: 'Umsatz', icon: 'stats-chart-outline', group: 'Betrieb', route: 'Revenue', tab: true },
  { key: 'health', title: 'Systemzustand', short: 'System', icon: 'pulse-outline', group: 'Betrieb', route: 'Health', tab: true },
  { key: 'photos', title: 'Fotos', icon: 'images-outline', group: 'Betrieb', route: 'Photos', tab: true },
  { key: 'purchases', title: 'Käufe', icon: 'receipt-outline', group: 'Betrieb', route: 'Purchases' },
  { key: 'speed', title: 'Speedmessung', icon: 'speedometer-outline', group: 'Betrieb', route: 'Speed' },
  { key: 'kamera', title: 'Kamera', icon: 'camera-outline', group: 'Betrieb', route: 'Camera' },
  { key: 'marketing', title: 'Marketing-CRM', icon: 'megaphone-outline', group: 'Marketing', route: 'Marketing' },
  { key: 'personalization', title: 'Personalisierung', icon: 'color-wand-outline', group: 'Marketing', route: 'Personalization' },
  { key: 'shop', title: 'Online-Shop', icon: 'bag-handle-outline', group: 'Marketing', route: 'Shop' },
  { key: 'configuration', title: 'Konfiguration', icon: 'storefront-outline', group: 'Verwaltung', route: 'Configuration', modal: true },
  { key: 'tickets', title: 'Support', icon: 'help-buoy-outline', group: 'Verwaltung', route: 'Support' },
  { key: 'settings', title: 'Einstellungen', icon: 'settings-outline', group: 'Verwaltung', route: 'Settings' },
  { key: 'team', title: 'Mitarbeiter-Zugang', icon: 'people-outline', group: 'Verwaltung', route: 'Team' },
  { key: 'plans', title: 'Pläne und Abrechnung', icon: 'card-outline', group: 'Verwaltung', route: 'Plans' },
];

// Wie im Web (src/lib/superAdmin.ts): diese Konten dürfen ohne Park-Passwort zwischen Parks wechseln.
const SUPER_ADMINS = ['tomnotes.tn@gmail.com', 'john.m.nolting@gmail.com'];
export const isSuperAdminEmail = (email: string | null | undefined) => !!email && SUPER_ADMINS.includes(email.trim().toLowerCase());

// Seiten, die es nur unter einer Bedingung gibt: die Kamera nur, solange ein Automat sie erreichbar meldet.
export function pageAvailable(p: PageEntry, ctx: { cameraAvailable: boolean | null }) {
  if (p.key === 'kamera') return ctx.cameraAvailable === true;
  return true;
}

// Eine Seite öffnen: native Seite oder Web-Seite in der App-Hülle.
export function openPage(nav: { navigate: (name: string, params?: object) => void }, p: PageEntry) {
  if (p.route) nav.navigate(p.route);
  else nav.navigate('Web', { path: p.path, title: p.title });
}
