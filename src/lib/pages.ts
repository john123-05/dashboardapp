import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { PageKey } from './permissions';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface PageEntry {
  key: PageKey;
  title: string;
  icon: IconName;
  group: 'Betrieb' | 'Marketing' | 'Verwaltung';
  // Native Bildschirme der App; alles andere öffnet die Seite des Web-Dashboards in der App-Hülle.
  native?: 'Purchases';
  path?: string;
}

// Reihenfolge und Namen wie in der Seitenleiste des Web-Dashboards. Welche Einträge ein Nutzer sieht,
// entscheidet canSee() aus permissions.ts (Seitenauswahl im CRM).
export const PAGES: PageEntry[] = [
  { key: 'purchases', title: 'Käufe', icon: 'receipt-outline', group: 'Betrieb', native: 'Purchases' },
  { key: 'photos', title: 'Fotos', icon: 'images-outline', group: 'Betrieb', path: '/photos' },
  { key: 'speed', title: 'Speedmessung', icon: 'speedometer-outline', group: 'Betrieb', path: '/users' },
  { key: 'kamera', title: 'Kamera', icon: 'camera-outline', group: 'Betrieb', path: '/kamera' },
  { key: 'marketing', title: 'Marketing und CRM', icon: 'megaphone-outline', group: 'Marketing', path: '/leads' },
  { key: 'personalization', title: 'Personalisierung', icon: 'color-wand-outline', group: 'Marketing', path: '/personalization' },
  { key: 'shop', title: 'Shop', icon: 'storefront-outline', group: 'Marketing', path: '/shop' },
  { key: 'configuration', title: 'Konfiguration', icon: 'construct-outline', group: 'Verwaltung', path: '/configuration' },
  { key: 'tickets', title: 'Support', icon: 'help-buoy-outline', group: 'Verwaltung', path: '/tickets' },
  { key: 'settings', title: 'Einstellungen', icon: 'settings-outline', group: 'Verwaltung', path: '/settings' },
  { key: 'team', title: 'Team', icon: 'people-outline', group: 'Verwaltung', path: '/team' },
  { key: 'plans', title: 'Pläne und Abrechnung', icon: 'card-outline', group: 'Verwaltung', path: '/plaene' },
];

// Wie im Web (src/lib/superAdmin.ts): diese Konten dürfen ohne Park-Passwort zwischen Parks wechseln.
const SUPER_ADMINS = ['tomnotes.tn@gmail.com', 'john.m.nolting@gmail.com'];
export const isSuperAdminEmail = (email: string | null | undefined) => !!email && SUPER_ADMINS.includes(email.trim().toLowerCase());
