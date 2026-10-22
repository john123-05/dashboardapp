import { callShared, SharedError } from './shared';
import { meldeAusstattungsInteresse } from './equipment';
import { useData } from './useData';
import { PREVIEW } from './preview';

// Pakete und Preise aus dem Liftpictures-CRM („Pakete & Preise“), wie src/lib/catalog.ts im Web.
// Ist der Katalog leer oder nicht erreichbar, gelten die eingebauten Werte (FALLBACK_PLANS).

type Texts = Record<string, string>;
export type CatalogPackage = {
  key: string;
  grp: string;
  sort: number;
  highlight: boolean;
  price_cents: number | null;
  price_unit: 'month' | 'once' | 'share';
  term_months: number | null;
  free_months: number;
  setup_cents: number | null;
  texts: Record<string, { name?: string; tagline?: string; badge?: string; price_note?: string }>;
  bullets: { texts: Texts; included: boolean }[];
  meta: { share_percent?: number; year2_cents?: number; display_cents?: number };
  deal?: { source: 'override' | 'promotion'; name: string | null; promotion_id: string | null; percent: number | null; fixed: boolean; extra_free_months: number; valid_until: string | null; list_price_cents: number | null; list_free_months: number } | null;
};
export type CatalogPromotion = { id: string; name: string; texts: Record<string, { title?: string; banner?: string }>; ends_on: string | null };
export type CatalogPoint = { key: string; grp: string; sort: number; kind: string; soon: boolean; texts: Texts };
export type CatalogCell = { package_key: string; point_key: string; included: boolean; value: Texts | null };
export type CatalogGroup = { key: string; sort: number; built_in: boolean; texts: Record<string, { name?: string; sub?: string }> };
export type Catalog = { packages: CatalogPackage[]; points: CatalogPoint[]; cells: CatalogCell[]; promotions?: CatalogPromotion[]; groups?: CatalogGroup[] };

async function load(parkId: string): Promise<Catalog | null> {
  if (PREVIEW) return (await import('./mockMore')).previewCatalog();
  try {
    const data = await callShared<Catalog>('operator-catalog', { query: { park_id: parkId } });
    return data?.packages?.length ? data : null;
  } catch {
    return null;
  }
}

export function useCatalog(parkId: string | null) {
  return useData(parkId ? `catalog:${parkId}` : null, () => load(parkId!), [parkId], 300000);
}

const de = (t: Texts | undefined | null) => t?.de || t?.en || (t ? Object.values(t)[0] : '') || '';
export const pkgText = (p: CatalogPackage | undefined, f: 'name' | 'tagline' | 'badge' | 'price_note') => p?.texts?.de?.[f] || undefined;
export const groupName = (g: CatalogGroup | undefined) => g?.texts?.de?.name || undefined;
export const groupSub = (g: CatalogGroup | undefined) => g?.texts?.de?.sub || undefined;
export const bullets = (p: CatalogPackage | undefined, included: boolean) => (p?.bullets ?? []).filter((b) => b.included === included).map((b) => de(b.texts)).filter(Boolean);
export const catalogGroup = (c: Catalog | null | undefined, grp: string) => (c?.packages ?? []).filter((p) => p.grp === grp).sort((a, b) => a.sort - b.sort);
export const fillText = (text: string, params: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));

const eur = (cents: number) => (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: cents % 100 === 0 ? 0 : 2 });
export const money = eur;

/** Vergleich je Punkt: Zeilen mit einem Wert je Paket (true/false oder Text). */
export function compareRows(c: Catalog | null | undefined, grp: string): { label: string; soon: boolean; cells: (string | boolean)[] }[] {
  const packages = catalogGroup(c, grp);
  const points = (c?.points ?? []).filter((p) => p.grp === grp).sort((a, b) => a.sort - b.sort);
  if (!c || !packages.length || !points.length) return [];
  const cell = (pkg: CatalogPackage, point: CatalogPoint): string | boolean => {
    const price = pkg.price_cents;
    switch (point.kind) {
      case 'setup': return pkg.setup_cents != null ? eur(pkg.setup_cents) : '—';
      case 'monthly': return price != null ? eur(price) : '—';
      case 'prepay': return pkg.free_months > 0 && pkg.term_months && price != null ? eur((pkg.term_months - pkg.free_months) * price) : '—';
      case 'share': return `${pkg.meta.share_percent ?? 0} %`;
      case 'year2': return pkg.meta.year2_cents != null ? eur(pkg.meta.year2_cents) : price != null ? eur(price) : '—';
      case 'term': return pkg.term_months ? `${pkg.term_months} Monate` : '—';
      case 'free_months': return String(pkg.free_months ?? 0);
      case 'display_monthly': return pkg.meta.display_cents != null ? eur(pkg.meta.display_cents) : '—';
      default: {
        const found = c.cells.find((x) => x.package_key === pkg.key && x.point_key === point.key);
        if (!found || !found.included) return false;
        return de(found.value) || true;
      }
    }
  };
  return points.map((point) => ({ label: de(point.texts), soon: point.soon, cells: packages.map((pkg) => cell(pkg, point)) }));
}

/** Preiszeile einer Karte, z. B. "49 € / Monat", "15 % Umsatzanteil" oder der Text aus dem CRM. */
export function priceLine(p: CatalogPackage): { value: string; suffix?: string } {
  if (p.price_unit === 'share') return { value: `${p.meta.share_percent ?? 0} %`, suffix: 'Umsatzanteil' };
  if (p.price_cents === 0 && p.grp === 'plan') return { value: 'Kostenlos' };
  if (p.price_cents != null) return { value: eur(p.price_cents), suffix: p.price_unit === 'month' ? '/ Monat' : 'einmalig' };
  return { value: pkgText(p, 'price_note') ?? 'auf Anfrage' };
}

/** Anfrage aus der App: landet wie im Web als Staff-Benachrichtigung im CRM, Aktionen zählen mit. */
export async function requestPackage(parkId: string, p: CatalogPackage | { key: string; name: string; price: string; deal?: boolean; promotionId?: string | null }) {
  const isPkg = 'grp' in p;
  const name = isPkg ? pkgText(p, 'name') ?? p.key : p.name;
  const price = isPkg
    ? p.price_unit === 'share' ? `${p.meta.share_percent ?? 0} % Umsatzanteil` : p.price_cents != null ? `${p.price_cents / 100} €${p.price_unit === 'month' ? '/Monat' : ' einmalig'}` : 'Preis auf Anfrage'
    : p.price;
  const deal = isPkg ? Boolean(p.deal) : Boolean(p.deal);
  const label = isPkg && p.grp === 'plan' ? `Plan anfragen: ${name} (${price}${deal ? ', Aktion/Kundenpreis' : ''})` : `Paket anfragen: ${name} (${price}${deal ? ', Aktion/Kundenpreis' : ''})`;
  await meldeAusstattungsInteresse(parkId, { label: `${label} · aus der App` });
  const promotionId = isPkg ? p.deal?.promotion_id : p.promotionId;
  if (promotionId && !PREVIEW) {
    void callShared('operator-catalog', { method: 'POST', body: { park_id: parkId, promotion_id: promotionId, event: 'requested' }, raw: true }).catch(() => undefined);
  }
}

// ---------------------------------------------------------------- Abrechnung (Stripe)

export class BillingDisabledError extends Error {}
// Rücksprung nach der Buchung auf das Web-Dashboard; die App lädt die Freischaltung beim Zurückkehren neu.
const RETURN_ORIGIN = 'https://dashboard-liftpictures.com';

async function billing(fn: 'billing-checkout' | 'billing-portal', payload: Record<string, unknown>): Promise<string> {
  try {
    const data = await callShared<{ url: string }>(fn, { method: 'POST', body: { ...payload, origin: RETURN_ORIGIN } });
    if (!data?.url) throw new Error('Keine Adresse erhalten');
    return String(data.url);
  } catch (e) {
    if (e instanceof SharedError && e.status === 503 && e.body?.error === 'billing_disabled') throw new BillingDisabledError('billing_disabled');
    throw e;
  }
}
export const startCheckout = (parkId: string, plan: 'marketing_starter' | 'marketing_pro') => billing('billing-checkout', { park_id: parkId, plan });
export const openBillingPortal = (parkId: string) => billing('billing-portal', { park_id: parkId });

// ---------------------------------------------------------------- eingebaute Werte ohne Katalog

export const FALLBACK_PLANS: { plan: 'basis' | 'marketing_starter' | 'marketing_pro'; name: string; cents: number; note: string; points: string[]; highlight?: boolean }[] = [
  { plan: 'basis', name: 'Basis', cents: 0, note: 'Im Service deines Automaten enthalten.', points: ['Übersicht, Umsatz, Käufe und Fotos', 'Systemzustand, Kamera und Personalisierung', 'Support und Benachrichtigungen', '3 Mitarbeiter-Zugänge'] },
  { plan: 'marketing_starter', name: 'Marketing Starter', cents: 4900, note: 'Für Parks, die Gäste und Bewertungen sammeln.', points: ['Alles aus Basis', 'Fotos gegen Kontakt freischalten, Kontaktliste und Export', 'Umfrage mit NPS-Auswertung', 'Werbe-Pixel für Meta und Google', 'E-Mail-Marketing mit 2.000 E-Mails im Monat', '10 Mitarbeiter-Zugänge'] },
  { plan: 'marketing_pro', name: 'Marketing Pro', cents: 14900, note: 'Für Parks, die aktiv Marketing machen.', highlight: true, points: ['Alles aus Marketing Starter', 'Social-Media-Kampagnen, Gewinnspiele und Teilen-Link mit Zähler', 'Weiterleitung zu Google-Bewertungen', '10.000 E-Mails im Monat, mehrsprachig, mit Automationen', 'Vergleich mit Vorjahr und PDF-Bericht', 'Unbegrenzt Mitarbeiter mit Rechten je Seite'] },
];

export const FALLBACK_ADDONS: { key: string; group: string; icon: string; title: string; text: string; price: string; feature?: 'online_shop' | 'speed' }[] = [
  { key: 'shop', group: 'shop', icon: 'bag-handle-outline', title: 'Online-Shop', text: 'Gäste kaufen ihr Foto auch nach dem Besuch: Download, Abzug, Tasse, T-Shirt, Wandbild.', price: '99 € / Monat + 749 € Einrichtung, oder 15 % Umsatzanteil ohne Fixkosten', feature: 'online_shop' },
  { key: 'speed', group: 'speed', icon: 'speedometer-outline', title: 'Speedmessung', text: 'Geschwindigkeit auf jedem Foto, Tagesbestenliste für den Bildschirm, Gäste-Profile, Gewinnspiel für die Tagesbesten.', price: 'ab 49 € / Monat nur Software (Hardware vorhanden), mit kostenloser Hardware ab 99 € / Monat', feature: 'speed' },
  { key: 'mail', group: 'marketing', icon: 'mail-outline', title: 'Zusatz-E-Mails', text: 'Mehr E-Mails im Monat, wenn dein Kontingent nicht reicht.', price: 'auf Anfrage' },
  { key: 'hardware', group: 'system', icon: 'cube-outline', title: 'Hardware & Zubehör', text: 'Kamera-Upgrade, zweiter Automat, Bildschirm, Fotopapier und mehr – passend zu deiner Anlage.', price: 'Preis je Produkt' },
];

export const BUILT_IN_GROUPS: { key: string; name: string }[] = [
  { key: 'plan', name: 'Marketing' },
  { key: 'shop', name: 'Online-Shop' },
  { key: 'speed', name: 'Speedmessung' },
  { key: 'software', name: 'Software' },
  { key: 'system', name: 'Fotosystem' },
  { key: 'addon', name: 'Zusätzlich' },
];
