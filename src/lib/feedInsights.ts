import { tr } from '../i18n';
import { benenne } from './geraeteNamen';
import { formatCents } from './format';
import type { HealthMachine } from './data';
import { daysAgoInTimezone, type KioskSalesResponse } from './kioskSales';
import type { Lead } from './marketing';

// Gute Nachrichten für die Glocke: Umsatz im Wochenvergleich, neue Kontakte, Automaten und Geräte,
// die nach einer Störung wieder laufen, und Software-Updates. Wochenwerte werden live berechnet;
// „wieder online“ und Updates entstehen beim Vergleich mit dem zuletzt gesehenen Stand.

export type Insight = {
  id: string;
  kind: 'revenue' | 'contacts' | 'recovered' | 'update';
  icon: string;
  title: string;
  text: string;
  createdAt: string;
  severity: 'ok' | 'info';
};

const DAY = 86400000;
const MIN_REVENUE_CENTS = 5000; // erst ab 50 € in der Vorwoche, sonst schwanken die Prozente zu stark
const MIN_CHANGE = 0.1;

/** Montag der laufenden Woche (YYYY-MM-DD); hält die Meldung eine Woche lang unter derselben ID. */
function weekKey(now: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Umsatz der letzten 7 Tage gegen die 7 Tage davor; nur bei spürbarer Änderung. */
export function revenueInsight(sales: KioskSalesResponse | null | undefined, now = Date.now()): Insight | null {
  if (!sales?.isKioskPark || !sales.priceCents) return null;
  const byDate = new Map<string, number>();
  for (const d of sales.days) byDate.set(d.business_date, (byDate.get(d.business_date) ?? 0) + d.photos_sold_count);
  let current = 0;
  let previous = 0;
  for (let i = 0; i < 14; i++) {
    const key = daysAgoInTimezone(sales.timezone ?? 'Europe/Berlin', i);
    const cents = (byDate.get(key) ?? 0) * sales.priceCents;
    if (i < 7) current += cents;
    else previous += cents;
  }
  if (previous < MIN_REVENUE_CENTS) return null;
  const change = (current - previous) / previous;
  if (Math.abs(change) < MIN_CHANGE) return null;
  const percent = Math.round(Math.abs(change) * 100);
  const up = change > 0;
  return {
    id: `revenue-${weekKey(now)}-${up ? 'up' : 'down'}`,
    kind: 'revenue',
    icon: up ? 'trending-up-outline' : 'trending-down-outline',
    title: up ? tr('Fotoumsatz +{0} % diese Woche', percent) : tr('Fotoumsatz −{0} % diese Woche', percent),
    text: tr('{0} in den letzten 7 Tagen, {1} in den 7 Tagen davor.', formatCents(current, true), formatCents(previous, true)),
    createdAt: new Date(now).toISOString(),
    severity: up ? 'ok' : 'info',
  };
}

/** Neue Kontakte der letzten 7 Tage. */
export function contactsInsight(leads: Lead[] | null | undefined, now = Date.now()): Insight | null {
  const recent = (leads ?? []).filter((l) => now - new Date(l.created_at).getTime() < 7 * DAY);
  if (recent.length === 0) return null;
  const latest = recent.reduce((a, b) => (a.created_at > b.created_at ? a : b));
  return {
    id: `contacts-${weekKey(now)}`,
    kind: 'contacts',
    icon: 'mail-outline',
    title: recent.length === 1 ? tr('1 neuer Kontakt') : tr('{0} neue Kontakte', recent.length),
    text: tr('Besucher haben beim Freischalten ihrer Fotos ihre E-Mail-Adresse hinterlassen.'),
    createdAt: latest.created_at,
    severity: 'ok',
  };
}

/** Zuletzt gesehener Stand je Automat, um Wiederherstellungen und Updates zu erkennen. */
export type HealthSnapshot = Record<string, { reachable: boolean; version: string | null; down: string[] }>;

export function snapshotOf(machines: HealthMachine[]): HealthSnapshot {
  const out: HealthSnapshot = {};
  for (const m of machines) {
    const down = [...(m.probes ?? []), ...(m.devices ?? [])].filter((d) => d.status === 'down').map((d) => d.name);
    out[m.id] = { reachable: m.reachable, version: m.agent_version ?? null, down };
  }
  return out;
}

const ONLINE_KINDS = /terminal|uploader|network|zvt/i;

/** Neue gute Nachrichten zwischen zwei Ständen (nur Übergänge, nicht der Dauerzustand). */
export function changesBetween(prev: HealthSnapshot, machines: HealthMachine[], now = Date.now()): Insight[] {
  const out: Insight[] = [];
  const at = new Date(now).toISOString();
  for (const m of machines) {
    const before = prev[m.id];
    if (!before) continue;
    const name = m.machine_label || m.machine_id;
    if (!before.reachable && m.reachable) {
      out.push({ id: `back-${m.id}-${now}`, kind: 'recovered', icon: 'checkmark-circle-outline', title: tr('{0} wieder online', name), text: tr('Der Automat meldet sich wieder, Verkauf und Upload laufen.'), createdAt: at, severity: 'ok' });
    }
    const all = [...(m.probes ?? []), ...(m.devices ?? [])];
    for (const d of all) {
      if (!before.down.includes(d.name) || d.status === 'down') continue;
      const device = benenne(d.name).klar;
      const online = ONLINE_KINDS.test(`${d.kind ?? ''} ${d.name}`);
      out.push({
        id: `fixed-${m.id}-${d.name}-${now}`,
        kind: 'recovered',
        icon: /terminal|zvt/i.test(`${d.kind ?? ''} ${d.name}`) ? 'card-outline' : 'checkmark-circle-outline',
        title: online ? tr('{0} wieder online', device) : tr('{0} läuft wieder', device),
        text: tr('{0}: die Störung ist behoben.', name),
        createdAt: at,
        severity: 'ok',
      });
    }
    if (before.version && m.agent_version && before.version !== m.agent_version) {
      out.push({ id: `update-${m.id}-${m.agent_version}`, kind: 'update', icon: 'cloud-download-outline', title: tr('Software aktualisiert'), text: tr('{0} läuft jetzt mit Version {1}.', name, m.agent_version), createdAt: at, severity: 'info' });
    }
  }
  return out;
}
