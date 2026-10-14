import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useAuth } from './AuthContext';
import { usePark } from './ParkContext';
import { loadHealth, loadSupportReplies } from '../lib/data';
import { benenne } from '../lib/geraeteNamen';
import { useData } from '../lib/useData';

// Meldungen wie in der Glocke des Web-Dashboards (src/lib/notificationFeed.ts): Automat offline,
// Abholcode fehlt, Papier knapp, Gerät ausgefallen, Münzröhre leer und Antworten vom Support.
export type FeedItem = {
  id: string;
  kind: 'support' | 'fault' | 'offline' | 'paper' | 'code' | 'coins';
  title: string;
  text: string;
  createdAt: string;
  severity: 'info' | 'warning' | 'error';
};

interface Value {
  items: FeedItem[];
  unread: number;
  isRead: (id: string) => boolean;
  markAllRead: () => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
}

const Ctx = createContext<Value | null>(null);

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { parkId } = usePark();
  const [read, setRead] = useState<string[]>([]);
  const key = user && parkId ? `lp-notif-read:${user.id}:${parkId}` : 'lp-notif-read:preview';

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => setRead(raw ? (JSON.parse(raw) as string[]) : []))
      .catch(() => setRead([]));
  }, [key]);

  const health = useData(parkId ? `health:${parkId}` : null, () => loadHealth(parkId!), [parkId], 120000);
  const support = useData(parkId ? `support:${parkId}` : null, () => loadSupportReplies(parkId!), [parkId], 120000);

  const items = useMemo<FeedItem[]>(() => {
    const out: FeedItem[] = [];
    const now = new Date().toISOString();
    for (const m of health.data ?? []) {
      const name = m.machine_label || m.machine_id;
      if (!m.reachable) {
        out.push({ id: `offline-${m.id}`, kind: 'offline', title: `${name} ist offline`, text: 'Der Automat meldet sich nicht mehr. Bitte Strom und Internet am Automaten prüfen.', createdAt: m.last_seen_at ?? now, severity: 'error' });
      }
      if (m.customer_code_registered === false) {
        out.push({ id: `code-${m.id}-${m.customer_code ?? ''}`, kind: 'code', title: `${name}: Abholcode ${m.customer_code ?? ''} unbekannt`, text: 'Die Nummer des Automaten ist im Park nicht eingetragen. Fotos können so nicht freigeschaltet werden.', createdAt: now, severity: 'error' });
      }
      const warnAt = m.paper_warn_remaining ?? 30;
      if (typeof m.paper_remaining === 'number' && m.paper_remaining <= warnAt) {
        out.push({ id: `paper-${m.id}`, kind: 'paper', title: `${name}: Papier wird knapp`, text: `Noch ${m.paper_remaining} Drucke übrig. Bitte bald eine neue Rolle einlegen.`, createdAt: now, severity: 'warning' });
      }
      const seen = new Set<string>();
      for (const d of [...(m.probes ?? []), ...(m.devices ?? [])]) {
        if (d.status !== 'down') continue;
        if ((m.ausgeblendet ?? []).includes(d.name)) continue;
        const device = benenne(d.name).klar;
        if (seen.has(device)) continue;
        seen.add(device);
        out.push({ id: `fault-${m.id}-${device}`, kind: 'fault', title: `${device}: Störung (${name})`, text: d.plain || d.detail || 'Das Gerät meldet eine Störung.', createdAt: now, severity: 'error' });
      }
      for (const c of m.coin_warnings ?? []) {
        if (c.stufe !== 'leer') continue;
        out.push({ id: `coins-${m.id}-${c.cent}`, kind: 'coins', title: `${name}: Münzen leer`, text: c.text, createdAt: now, severity: 'warning' });
      }
    }
    for (const s of support.data ?? []) {
      out.push({ id: `support-${s.id}`, kind: 'support', title: s.ticket_subject ? `Support-Antwort: ${s.ticket_subject}` : 'Support-Antwort', text: s.message, createdAt: s.created_at, severity: 'info' });
    }
    const rank = { error: 0, warning: 1, info: 2 } as const;
    return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.createdAt.localeCompare(a.createdAt));
  }, [health.data, support.data]);

  const isRead = useCallback((id: string) => read.includes(id), [read]);
  const markAllRead = useCallback(() => {
    const next = Array.from(new Set([...read, ...items.map((i) => i.id)])).slice(-300);
    setRead(next);
    void AsyncStorage.setItem(key, JSON.stringify(next));
  }, [read, items, key]);

  const value = useMemo<Value>(
    () => ({
      items,
      unread: items.filter((i) => !read.includes(i.id)).length,
      isRead,
      markAllRead,
      loading: health.loading && support.loading,
      refreshing: health.refreshing || support.refreshing,
      error: health.error,
      reload: () => {
        health.reload();
        support.reload();
      },
    }),
    [items, read, isRead, markAllRead, health, support],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications außerhalb von NotificationsProvider');
  return ctx;
}
