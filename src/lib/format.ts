const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const eur0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('de-DE');
const pct = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 1 });

export const formatCents = (cents: number | null | undefined, round = false) =>
  cents === null || cents === undefined ? '–' : (round ? eur0 : eur).format(cents / 100);
export const formatNumber = (n: number | null | undefined) => (n === null || n === undefined ? '–' : num.format(n));
export const formatPercent = (ratio: number | null | undefined) => (ratio === null || ratio === undefined ? '–' : pct.format(ratio));

export function formatTime(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone }).format(d);
}

export function formatDay(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(d);
}

export function formatDayLong(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'nie';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'gestern' : `vor ${d} Tagen`;
}
