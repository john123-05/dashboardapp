import { localeTag, tr } from '../i18n';

// Formate je App-Sprache; nach einem Sprachwechsel neu angelegt.
let cache: { tag: string; eur: Intl.NumberFormat; eur0: Intl.NumberFormat; num: Intl.NumberFormat; pct: Intl.NumberFormat } | null = null;
function fmt() {
  const tag = localeTag();
  if (cache?.tag !== tag)
    cache = {
      tag,
      eur: new Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR' }),
      eur0: new Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
      num: new Intl.NumberFormat(tag),
      pct: new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 1 }),
    };
  return cache;
}

export const formatCents = (cents: number | null | undefined, round = false) =>
  cents === null || cents === undefined ? '–' : (round ? fmt().eur0 : fmt().eur).format(cents / 100);
export const formatNumber = (n: number | null | undefined) => (n === null || n === undefined ? '–' : fmt().num.format(n));
export const formatPercent = (ratio: number | null | undefined) => (ratio === null || ratio === undefined ? '–' : fmt().pct.format(ratio));

/** Kommazahl im Format der App-Sprache (8,4 / 8.4). */
export const formatDecimal = (n: number, min = 1, max = min) =>
  new Intl.NumberFormat(localeTag(), { minimumFractionDigits: min, maximumFractionDigits: max }).format(n);

export function formatTime(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  return new Intl.DateTimeFormat(localeTag(), { hour: '2-digit', minute: '2-digit', timeZone }).format(d);
}

export function formatDay(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return new Intl.DateTimeFormat(localeTag(), { weekday: 'short', day: '2-digit', month: '2-digit' }).format(d);
}

export function formatDayLong(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return new Intl.DateTimeFormat(localeTag(), { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return tr('nie');
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return tr('gerade eben');
  if (min < 60) return tr('vor {0} Min.', min);
  const h = Math.floor(min / 60);
  if (h < 24) return tr('vor {0} Std.', h);
  const d = Math.floor(h / 24);
  return d === 1 ? tr('gestern') : tr('vor {0} Tagen', d);
}
