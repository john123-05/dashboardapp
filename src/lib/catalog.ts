import { callShared, SharedError } from './shared';
import { meldeAusstattungsInteresse } from './equipment';
import { useData } from './useData';
import { PREVIEW } from './preview';
import { getLanguage, localeTag, tr } from '../i18n';

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

// Server-Texte in der App-Sprache, sonst Deutsch, sonst Englisch.
const de = (t: Texts | undefined | null) => t?.[getLanguage()] || t?.de || t?.en || (t ? Object.values(t)[0] : '') || '';
const inLang = <T,>(t: Record<string, T> | undefined) => t?.[getLanguage()] ?? t?.de;
export const pkgText = (p: CatalogPackage | undefined, f: 'name' | 'tagline' | 'badge' | 'price_note') => inLang(p?.texts)?.[f] || p?.texts?.de?.[f] || undefined;
export const groupName = (g: CatalogGroup | undefined) => inLang(g?.texts)?.name || g?.texts?.de?.name || undefined;
export const groupSub = (g: CatalogGroup | undefined) => inLang(g?.texts)?.sub || g?.texts?.de?.sub || undefined;
export const bullets = (p: CatalogPackage | undefined, included: boolean) => (p?.bullets ?? []).filter((b) => b.included === included).map((b) => de(b.texts)).filter(Boolean);
export const catalogGroup = (c: Catalog | null | undefined, grp: string) => (c?.packages ?? []).filter((p) => p.grp === grp).sort((a, b) => a.sort - b.sort);
export const fillText = (text: string, params: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));

const eur = (cents: number) => (cents / 100).toLocaleString(localeTag(), { style: 'currency', currency: 'EUR', maximumFractionDigits: cents % 100 === 0 ? 0 : 2 });
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
  if (p.price_unit === 'share') return { value: `${p.meta.share_percent ?? 0} %`, suffix: tr('Umsatzanteil') };
  if (p.price_cents === 0 && p.grp === 'plan') return { value: tr('Kostenlos') };
  if (p.price_cents != null) return { value: eur(p.price_cents), suffix: p.price_unit === 'month' ? tr('/ Monat') : tr('einmalig') };
  return { value: pkgText(p, 'price_note') ?? tr('auf Anfrage') };
}

/** Anfrage aus der App: landet wie im Web als Staff-Benachrichtigung im CRM, Aktionen zählen mit. */
export async function requestPackage(parkId: string, p: CatalogPackage | { key: string; name: string; price: string; deal?: boolean; promotionId?: string | null }) {
  const isPkg = 'grp' in p;
  const name = isPkg ? pkgText(p, 'name') ?? p.key : p.name;
  const price = isPkg
    ? p.price_unit === 'share' ? tr('{0} % Umsatzanteil', p.meta.share_percent ?? 0) : p.price_cents != null ? `${p.price_cents / 100} €${p.price_unit === 'month' ? tr('/Monat') : tr(' einmalig')}` : tr('Preis auf Anfrage')
    : p.price;
  const deal = isPkg ? Boolean(p.deal) : Boolean(p.deal);
  const label = isPkg && p.grp === 'plan' ? `Plan anfragen: ${name} (${price}${deal ? ', Aktion/Kundenpreis' : ''})` : `Paket anfragen: ${name} (${price}${deal ? ', Aktion/Kundenpreis' : ''})`;
  await meldeAusstattungsInteresse(parkId, { label: tr('{0} · aus der App', label) });
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
    if (!data?.url) throw new Error(tr('Keine Adresse erhalten'));
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
  { plan: 'basis', get name() { return tr('Basis'); }, cents: 0, get note() { return tr('Im Service deines Automaten enthalten.'); }, get points() { return [tr('Übersicht, Umsatz, Käufe und Fotos'), tr('Systemzustand, Kamera und Personalisierung'), tr('Support und Benachrichtigungen'), tr('3 Mitarbeiter-Zugänge')]; } },
  { plan: 'marketing_starter', get name() { return tr('Marketing Starter'); }, cents: 4900, get note() { return tr('Für Parks, die Gäste und Bewertungen sammeln.'); }, get points() { return [tr('Alles aus Basis'), tr('Fotos gegen Kontakt freischalten, Kontaktliste und Export'), tr('Umfrage mit NPS-Auswertung'), tr('Werbe-Pixel für Meta und Google'), tr('E-Mail-Marketing mit 2.000 E-Mails im Monat'), tr('10 Mitarbeiter-Zugänge')]; } },
  { plan: 'marketing_pro', get name() { return tr('Marketing Pro'); }, cents: 14900, get note() { return tr('Für Parks, die aktiv Marketing machen.'); }, highlight: true, get points() { return [tr('Alles aus Marketing Starter'), tr('Social-Media-Kampagnen, Gewinnspiele und Teilen-Link mit Zähler'), tr('Weiterleitung zu Google-Bewertungen'), tr('10.000 E-Mails im Monat, mehrsprachig, mit Automationen'), tr('Vergleich mit Vorjahr und PDF-Bericht'), tr('Unbegrenzt Mitarbeiter mit Rechten je Seite')]; } },
];

export const FALLBACK_ADDONS: { key: string; group: string; icon: string; title: string; text: string; price: string; feature?: 'online_shop' | 'speed' }[] = [
  { key: 'shop', group: 'shop', icon: 'bag-handle-outline', get title() { return tr('Online-Shop'); }, get text() { return tr('Gäste kaufen ihr Foto auch nach dem Besuch: Download, Abzug, Tasse, T-Shirt, Wandbild.'); }, get price() { return tr('99 € / Monat + 749 € Einrichtung, oder 15 % Umsatzanteil ohne Fixkosten'); }, feature: 'online_shop' },
  { key: 'speed', group: 'speed', icon: 'speedometer-outline', get title() { return tr('Speedmessung'); }, get text() { return tr('Geschwindigkeit auf jedem Foto, Tagesbestenliste für den Bildschirm, Gäste-Profile, Gewinnspiel für die Tagesbesten.'); }, get price() { return tr('ab 49 € / Monat nur Software (Hardware vorhanden), mit kostenloser Hardware ab 99 € / Monat'); }, feature: 'speed' },
  { key: 'mail', group: 'marketing', icon: 'mail-outline', get title() { return tr('Zusatz-E-Mails'); }, get text() { return tr('Mehr E-Mails im Monat, wenn dein Kontingent nicht reicht.'); }, get price() { return tr('auf Anfrage'); } },
  { key: 'hardware', group: 'system', icon: 'cube-outline', get title() { return tr('Hardware & Zubehör'); }, get text() { return tr('Kamera-Upgrade, zweiter Automat, Bildschirm, Fotopapier und mehr – passend zu deiner Anlage.'); }, get price() { return tr('Preis je Produkt'); } },
];

export const BUILT_IN_GROUPS: { key: string; name: string }[] = [
  { key: 'plan', get name() { return tr('Marketing'); } },
  { key: 'shop', get name() { return tr('Online-Shop'); } },
  { key: 'speed', get name() { return tr('Speedmessung'); } },
  { key: 'software', get name() { return tr('Software'); } },
  { key: 'system', get name() { return tr('Fotosystem'); } },
  { key: 'addon', get name() { return tr('Zusätzlich'); } },
];
