import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useAuth } from './AuthContext';
import { usePark } from './ParkContext';
import { loadHealth, loadKioskSales, loadSupportReplies } from '../lib/data';
import { changesBetween, contactsInsight, revenueInsight, snapshotOf, type HealthSnapshot, type Insight } from '../lib/feedInsights';
import { loadLeads } from '../lib/marketing';
import { canSee } from '../lib/permissions';
import { benenne } from '../lib/geraeteNamen';
import { useData } from '../lib/useData';
import { fetchAnnouncements, reportAnnouncement } from '../lib/announcements';
import { tr } from '../i18n';

// Meldungen wie in der Glocke des Web-Dashboards (src/lib/notificationFeed.ts): Automat offline,
// Abholcode fehlt, Papier knapp, Gerät ausgefallen, Münzröhre leer und Antworten vom Support,
// dazu die Hinweise aus dem Liftpictures-CRM und gute Nachrichten (lib/feedInsights.ts): Umsatz im
// Wochenvergleich, neue Kontakte, wieder laufende Geräte und Software-Updates. Alles wird live berechnet: ist eine Störung behoben
// oder ein Hinweis im CRM gelöscht bzw. abgelaufen, verschwindet die Meldung beim nächsten Abgleich.
export type FeedItem = {
  id: string;
  kind: 'support' | 'fault' | 'offline' | 'paper' | 'code' | 'coins' | 'crm' | Insight['kind'];
  /** Eigenes Symbol (gute Nachrichten); sonst das Symbol der Art. */
  icon?: string;
  /** Ziel beim Antippen (Pfad wie im Web oder https-Link). */
  link?: string | null;
  title: string;
  text: string;
  createdAt: string;
  severity: 'ok' | 'info' | 'warning' | 'error';
};

interface Value {
  items: FeedItem[];
  unread: number;
  isRead: (id: string) => boolean;
  markAllRead: () => void;
  /** Meldung entfernen; CRM-Hinweise gelten dann für diesen Nutzer überall als geschlossen. */
  hide: (id: string) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
}

const Ctx = createContext<Value | null>(null);

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { user, isOwner, isStaff, allowedPages } = useAuth();
  const viewer = { isOwner, isStaff, allowedPages };
  const seesRevenue = canSee('revenue', viewer);
  const seesMarketing = canSee('marketing', viewer);
  const { parkId } = usePark();
  const [read, setRead] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const key = user && parkId ? `lp-notif-read:${user.id}:${parkId}` : 'lp-notif-read:preview';
  const hiddenKey = `${key}:hidden`;

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => setRead(raw ? (JSON.parse(raw) as string[]) : []))
      .catch(() => setRead([]));
    AsyncStorage.getItem(hiddenKey)
      .then((raw) => setHidden(raw ? (JSON.parse(raw) as string[]) : []))
      .catch(() => setHidden([]));
  }, [key, hiddenKey]);

  const health = useData(parkId ? `health:${parkId}` : null, () => loadHealth(parkId!), [parkId], 120000);
  const support = useData(parkId ? `support:${parkId}` : null, () => loadSupportReplies(parkId!), [parkId], 120000);
  // Gleicher Schlüssel wie die Hinweis-Karten auf den Seiten: ein Abruf für beide.
  const crm = useData(parkId ? `ann:${parkId}` : null, () => fetchAnnouncements(parkId!), [parkId], 120000);
  // Gleiche Schlüssel wie Übersicht/Umsatz und Marketing: keine zusätzlichen Abrufe.
  const sales = useData(parkId && seesRevenue ? `sales:${parkId}` : null, () => loadKioskSales(parkId!), [parkId], 300000);
  const leads = useData(parkId && seesMarketing ? `leads:${parkId}` : null, () => loadLeads(parkId!), [parkId], 300000);

  // Wiederhergestellte Geräte und Updates: Vergleich mit dem zuletzt gesehenen Stand, Meldungen 2 Tage lang.
  const stateKey = parkId ? `lp-feed-state:${parkId}` : null;
  const [events, setEvents] = useState<Insight[]>([]);
  useEffect(() => {
    if (!stateKey) return;
    AsyncStorage.getItem(`${stateKey}:events`)
      .then((raw) => setEvents(raw ? (JSON.parse(raw) as Insight[]) : []))
      .catch(() => setEvents([]));
  }, [stateKey]);
  useEffect(() => {
    if (!stateKey || !health.data) return;
    const machines = health.data;
    void (async () => {
      const raw = await AsyncStorage.getItem(stateKey).catch(() => null);
      const prev = raw ? (JSON.parse(raw) as HealthSnapshot) : null;
      await AsyncStorage.setItem(stateKey, JSON.stringify(snapshotOf(machines))).catch(() => undefined);
      if (!prev) return;
      const fresh = changesBetween(prev, machines);
      setEvents((cur) => {
        const cutoff = Date.now() - 2 * 86400000;
        const next = [...fresh, ...cur.filter((e) => new Date(e.createdAt).getTime() > cutoff && !fresh.some((f) => f.id === e.id))].slice(0, 30);
        if (fresh.length || next.length !== cur.length) void AsyncStorage.setItem(`${stateKey}:events`, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
    })();
  }, [health.data, stateKey]);

  const all = useMemo<FeedItem[]>(() => {
    const out: FeedItem[] = [];
    const now = new Date().toISOString();
    for (const m of health.data ?? []) {
      const name = m.machine_label || m.machine_id;
      if (!m.reachable) {
        out.push({ id: `offline-${m.id}`, kind: 'offline', title: tr('{0} ist offline', name), text: tr('Der Automat meldet sich nicht mehr. Bitte Strom und Internet am Automaten prüfen.'), createdAt: m.last_seen_at ?? now, severity: 'error' });
      }
      if (m.customer_code_registered === false) {
        out.push({ id: `code-${m.id}-${m.customer_code ?? ''}`, kind: 'code', title: tr('{0}: Abholcode {1} unbekannt', name, m.customer_code ?? ''), text: tr('Die Nummer des Automaten ist im Park nicht eingetragen. Fotos können so nicht freigeschaltet werden.'), createdAt: now, severity: 'error' });
      }
      const warnAt = m.paper_warn_remaining ?? 30;
      if (typeof m.paper_remaining === 'number' && m.paper_remaining <= warnAt) {
        out.push({ id: `paper-${m.id}`, kind: 'paper', title: tr('{0}: Papier wird knapp', name), text: tr('Noch {0} Drucke übrig. Bitte bald eine neue Rolle einlegen.', m.paper_remaining), createdAt: now, severity: 'warning' });
      }
      const seen = new Set<string>();
      for (const d of [...(m.probes ?? []), ...(m.devices ?? [])]) {
        if (d.status !== 'down') continue;
        if ((m.ausgeblendet ?? []).includes(d.name)) continue;
        const device = benenne(d.name).klar;
        if (seen.has(device)) continue;
        seen.add(device);
        out.push({ id: `fault-${m.id}-${device}`, kind: 'fault', title: tr('{0}: Störung ({1})', device, name), text: d.plain || d.detail || tr('Das Gerät meldet eine Störung.'), createdAt: now, severity: 'error' });
      }
      for (const c of m.coin_warnings ?? []) {
        if (c.stufe !== 'leer') continue;
        out.push({ id: `coins-${m.id}-${c.cent}`, kind: 'coins', title: tr('{0}: Münzen leer', name), text: c.text, createdAt: now, severity: 'warning' });
      }
    }
    for (const a of crm.data ?? []) {
      if (a.audience !== 'all' && !(a.audience === 'owner' ? isOwner : isStaff)) continue;
      out.push({ id: `crm-${a.id}`, kind: 'crm', title: a.title, text: a.body, createdAt: now, severity: a.tone === 'warning' ? 'warning' : 'info', link: a.cta_url });
    }
    for (const s of support.data ?? []) {
      out.push({ id: `support-${s.id}`, kind: 'support', title: s.ticket_subject ? tr('Support-Antwort: {0}', s.ticket_subject) : tr('Support-Antwort'), text: s.message, createdAt: s.created_at, severity: 'info' });
    }
    const revenue = seesRevenue ? revenueInsight(sales.data) : null;
    if (revenue) out.push(revenue);
    const contacts = seesMarketing ? contactsInsight(leads.data) : null;
    if (contacts) out.push(contacts);
    out.push(...events);
    const rank = { error: 0, warning: 1, info: 2, ok: 2 } as const;
    return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.createdAt.localeCompare(a.createdAt));
  }, [health.data, support.data, crm.data, sales.data, leads.data, events, seesRevenue, seesMarketing, isOwner, isStaff]);
  const items = useMemo(() => all.filter((i) => !hidden.includes(i.id)), [all, hidden]);

  // Behobene Störungen vergessen: tritt dieselbe Störung später wieder auf, erscheint sie neu.
  useEffect(() => {
    if (!health.data || !support.data || !crm.data || hidden.length === 0) return;
    const live = new Set(all.map((i) => i.id));
    const keep = hidden.filter((id) => live.has(id));
    if (keep.length === hidden.length) return;
    setHidden(keep);
    void AsyncStorage.setItem(hiddenKey, JSON.stringify(keep));
  }, [all, hidden, health.data, support.data, crm.data, hiddenKey]);

  const isRead = useCallback((id: string) => read.includes(id), [read]);
  const markAllRead = useCallback(() => {
    const next = Array.from(new Set([...read, ...items.map((i) => i.id)])).slice(-300);
    setRead(next);
    void AsyncStorage.setItem(key, JSON.stringify(next));
  }, [read, items, key]);
  const hide = useCallback(
    (id: string) => {
      const next = Array.from(new Set([...hidden, id])).slice(-300);
      setHidden(next);
      void AsyncStorage.setItem(hiddenKey, JSON.stringify(next));
      if (id.startsWith('crm-') && parkId) reportAnnouncement(parkId, id.slice(4), 'dismissed');
    },
    [hidden, hiddenKey, parkId],
  );

  const value = useMemo<Value>(
    () => ({
      items,
      unread: items.filter((i) => !read.includes(i.id)).length,
      isRead,
      markAllRead,
      hide,
      loading: health.loading && support.loading,
      refreshing: health.refreshing || support.refreshing,
      error: health.error,
      reload: () => {
        health.reload();
        support.reload();
        crm.reload();
        sales.reload();
        leads.reload();
      },
    }),
    [items, read, isRead, markAllRead, hide, health, support, crm, sales, leads],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error(tr('useNotifications außerhalb von NotificationsProvider'));
  return ctx;
}
