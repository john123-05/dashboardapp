// Systemzustand: dieselbe Auswertung wie im Web (src/components/AutomatHealth.tsx), nur ohne HTML.
// Ein Gerät kann gemessen (läuft das Programm?) und aus dem Protokoll (was hat es zuletzt gesagt?)
// beschrieben sein; beides wird zu EINEM Eintrag zusammengeführt.
import { EXTERNAL_SUPABASE_ANON_KEY, EXTERNAL_SUPABASE_URL } from './supabase';
import { getFunctionSession } from './functionAuth';
import { benenne } from './geraeteNamen';
import { PREVIEW } from './preview';

export type Status = 'ok' | 'warn' | 'down' | 'off' | 'unknown' | 'operational' | 'degraded' | 'idle';
export type Probe = { key?: string; name: string; kind: string; status: Status; detail: string; tech?: string; purpose?: string; since_minutes?: number | null };
export type Device = {
  name: string; kind: string; status: Status; detail: string; source_file?: string; severity?: string;
  idle_minutes: number | null; tech?: string; purpose?: string; plain?: string; merge_key?: string | null;
};
export type Neustartbar = { key: string; name: string; tech: string; folge: string; exe?: string };
export type HistoryEntry = { id: number; machine_id: string; occurred_at: string; severity: string; summary: string; detail: string | null };

export type Machine = {
  id: string; machine_id: string; machine_label: string | null;
  last_seen_at: string | null; offline_minutes: number | null; reachable: boolean;
  probes: Probe[]; devices: Device[]; ausgeblendet?: string[]; restartable?: Neustartbar[];
  can_test_photo?: boolean; customer_code?: string | null; park_customer_codes?: string[];
  customer_code_registered?: boolean | null; restart_poll_seconds?: number | null; night_window?: [string, string] | null;
  coin_warnings?: { cent: number; anzahl?: number; stufe: 'leer' | 'knapp'; text: string }[];
  agent_version: string | null; queue_count: number | null; disk_free_mb?: number | null;
  paper_remaining: number | null; paper_capacity?: number | null; paper_warn_remaining?: number | null;
  photos_taken_today: number | null; photos_sold_today: number | null;
  pending_restart: { mode?: string; target?: string } | null; last_restart_at: string | null;
};

export type Ton = 'ok' | 'warn' | 'bad' | 'ruhig' | 'aus' | 'unklar';
export const ZUSTAND: Record<Ton, { label: string; text: string; color: string; soft: string; rang: number }> = {
  bad: { label: 'Ausgefallen', text: 'Arbeitet nicht mehr.', color: '#E5392D', soft: '#FDEAE8', rang: 5 },
  warn: { label: 'Eingeschränkt', text: 'Läuft, meldet aber ein Problem.', color: '#E08A00', soft: '#FFF4DB', rang: 4 },
  ok: { label: 'Läuft', text: 'Arbeitet normal.', color: '#12A15F', soft: '#E6F6EE', rang: 3 },
  ruhig: { label: 'Ruhig', text: 'Läuft, meldet aber länger nichts. Nachts normal.', color: '#38A3D9', soft: '#E7F5FC', rang: 2 },
  aus: { label: 'Aus', text: 'Nicht gestartet oder nicht angeschlossen.', color: '#98A2B3', soft: '#F2F4F7', rang: 1 },
  unklar: { label: 'Unklar', text: 'Zustand nicht ermittelbar.', color: '#98A2B3', soft: '#F2F4F7', rang: 0 },
};

export function ton(s: Status): Ton {
  if (s === 'ok' || s === 'operational') return 'ok';
  if (s === 'warn' || s === 'degraded') return 'warn';
  if (s === 'down') return 'bad';
  if (s === 'idle') return 'ruhig';
  if (s === 'off') return 'aus';
  return 'unklar';
}

const ORDER = ['camera', 'process', 'viewer', 'cash', 'terminal', 'printer', 'uploader', 'network', 'config', 'mail', 'system'];

export function seit(min: number | null | undefined): string {
  if (min === null || min === undefined) return 'unbekannt';
  if (min < 1) return 'gerade eben';
  if (min < 90) return `${Math.round(min)} Min.`;
  const h = min / 60;
  return h < 48 ? `${h.toFixed(1).replace('.', ',')} Std.` : `${(h / 24).toFixed(1).replace('.', ',')} Tagen`;
}

export type Eintrag = {
  name: string; tech: string; purpose: string; kind: string; ton: Ton;
  gemessen: Probe | null; protokoll: Device | null; neustart: Neustartbar | null;
};

export function zusammenfuehren(m: Machine): Eintrag[] {
  const nach = new Map<string, Eintrag>();
  const nachKlarname = new Map<string, Eintrag>();
  const anlegen = (rohname: string, kind: string, eigen?: string | null): Eintrag => {
    const b = benenne(rohname);
    const schluessel = (b.quelle === 'unbekannt' && eigen ? eigen : b.klar).toLowerCase();
    const vorhanden = nach.get(schluessel);
    if (vorhanden) return vorhanden;
    const neu: Eintrag = { name: b.klar, tech: b.tech, purpose: b.zweck, kind, ton: 'unklar', gemessen: null, protokoll: null, neustart: null };
    nach.set(schluessel, neu);
    if (!nachKlarname.has(b.klar.toLowerCase())) nachKlarname.set(b.klar.toLowerCase(), neu);
    return neu;
  };
  for (const p of m.probes || []) {
    const e = anlegen(p.name, p.kind);
    e.gemessen = p;
    if (p.tech) e.tech = p.tech;
    if (p.purpose) e.purpose = p.purpose;
    if (e.kind === 'process' && p.kind !== 'process') e.kind = p.kind;
  }
  for (const d of m.devices || []) {
    const e = anlegen(d.name, d.kind, d.merge_key);
    e.protokoll = d;
    if (d.tech) e.tech = d.tech;
    if (d.purpose) e.purpose = d.purpose;
    if (e.kind === 'process') e.kind = d.kind;
  }
  for (const r of m.restartable || []) {
    const eintrag = nachKlarname.get(benenne(r.name).klar.toLowerCase());
    if (eintrag) eintrag.neustart = r;
  }
  for (const e of nach.values()) {
    const toene: Ton[] = [];
    if (e.gemessen) toene.push(ton(e.gemessen.status));
    if (e.protokoll) toene.push(ton(e.protokoll.status));
    e.ton = toene.sort((a, b) => ZUSTAND[b].rang - ZUSTAND[a].rang)[0] ?? 'unklar';
  }
  const aus = new Set((m.ausgeblendet ?? []).map((n) => n.toLowerCase()));
  return [...nach.values()]
    .filter((e) => !aus.has(e.name.toLowerCase()))
    .sort((a, b) => {
      const ai = ORDER.indexOf(a.kind), bi = ORDER.indexOf(b.kind);
      return ((ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)) || a.name.localeCompare(b.name);
    });
}

export function kurzText(e: Eintrag): string {
  const g = e.gemessen;
  if (g) {
    if (g.status === 'off') return 'Nicht gestartet';
    if (g.since_minutes !== null && g.since_minutes !== undefined) return `Läuft seit ${seit(g.since_minutes)}`;
    return g.detail;
  }
  const p = e.protokoll;
  if (p) {
    if (p.idle_minutes !== null && p.idle_minutes > 240) return `Letzte Meldung vor ${seit(p.idle_minutes)}`;
    return p.plain || p.detail;
  }
  return 'Keine Angabe';
}

export function warnText(e: Eintrag): string | null {
  if (e.ton === 'bad' || e.ton === 'warn') {
    const p = e.protokoll;
    if (p) return p.plain || p.detail;
    return e.gemessen?.detail || null;
  }
  if (e.gemessen?.status === 'ok' && e.protokoll?.status === 'idle') return `Still seit ${seit(e.protokoll.idle_minutes)}`;
  return null;
}

export type Urteil = { ton: Ton; titel: string; text: string };

export function urteil(machines: Machine[]): Urteil | null {
  if (machines.length === 0) return null;
  const eintraege = machines.flatMap((m) => zusammenfuehren(m));
  const bad = eintraege.filter((e) => e.ton === 'bad');
  const warn = eintraege.filter((e) => e.ton === 'warn');
  const offline = machines.filter((m) => !m.reachable);
  if (offline.length === machines.length) {
    return { ton: 'bad', titel: 'Der Automat meldet sich nicht', text: 'Seit einigen Minuten kommen keine Daten mehr an. Prüfe Strom und Internetverbindung am Automaten.' };
  }
  if (machines.some((m) => m.customer_code_registered === false)) {
    return { ton: 'bad', titel: 'Abholcode nicht hinterlegt', text: 'Fotos werden einem fremden Park zugeordnet. Details unten beim Automaten.' };
  }
  if (bad.length) return { ton: 'bad', titel: bad.length === 1 ? '1 Störung' : `${bad.length} Störungen`, text: `Betroffen: ${bad.map((e) => e.name).join(', ')}.` };
  if (warn.length) return { ton: 'warn', titel: warn.length === 1 ? '1 Warnung' : `${warn.length} Warnungen`, text: `Betroffen: ${warn.map((e) => e.name).join(', ')}. Der Verkauf läuft weiter.` };
  if (eintraege.length === 0) return { ton: 'unklar', titel: 'Keine Gerätedaten', text: 'Dieser Automat meldet noch keinen Zustand seiner Programme. Fotos und Umsatz laufen davon unberührt.' };
  return { ton: 'ok', titel: 'Alles in Ordnung', text: 'Alle Programme und Geräte am Automaten arbeiten normal.' };
}

const HEALTH_URL = `${EXTERNAL_SUPABASE_URL}/functions/v1/operator-liftpic-health`;
const ASSETS_URL = `${EXTERNAL_SUPABASE_URL}/functions/v1/operator-liftpic-assets`;

async function headers() {
  const { data: { session } } = await getFunctionSession();
  if (!session?.access_token) throw new Error('Sitzung abgelaufen. Bitte neu anmelden.');
  return { Authorization: `Bearer ${session.access_token}`, apikey: EXTERNAL_SUPABASE_ANON_KEY };
}

export async function loadMachines(parkId: string): Promise<{ machines: Machine[]; history: HistoryEntry[] }> {
  if (PREVIEW) {
    const { previewMachines } = await import('./mock');
    return previewMachines();
  }
  const res = await fetch(`${HEALTH_URL}?park_id=${encodeURIComponent(parkId)}`, { headers: await headers() });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return { machines: (body?.data?.machines ?? []) as Machine[], history: (body?.data?.history ?? []) as HistoryEntry[] };
}

// Neustart, Beenden, Zurücknehmen oder Testfoto: derselbe Auftragsweg wie im Web.
export async function orderMachine(parkId: string, machineConfigId: string, mode: 'now' | 'tonight' | 'cancel' | 'stop', target?: string) {
  if (PREVIEW) return;
  const res = await fetch(ASSETS_URL, {
    method: 'PATCH',
    headers: { ...(await headers()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ park_id: parkId, machine_config_id: machineConfigId, mode, target }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
}
