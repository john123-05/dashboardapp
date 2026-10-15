import { EXTERNAL_SUPABASE_ANON_KEY, EXTERNAL_SUPABASE_URL } from './supabase';
import { getFunctionSession } from './functionAuth';
import { PREVIEW } from './preview';

export interface NotificationSettings {
  push_enabled: boolean;
  photo_inactivity_enabled: boolean;
  photo_inactivity_minutes: number;
  paper_low_enabled: boolean;
  paper_low_threshold: number;
  support_enabled: boolean;
  system_health_enabled: boolean;
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  push_enabled: false,
  photo_inactivity_enabled: true,
  photo_inactivity_minutes: 30,
  paper_low_enabled: true,
  paper_low_threshold: 20,
  support_enabled: true,
  system_health_enabled: true,
};

const URL_ = `${EXTERNAL_SUPABASE_URL}/functions/v1/operator-notification-settings`;

async function auth() {
  const { data: { session } } = await getFunctionSession();
  if (!session?.access_token) throw new Error('Sitzung abgelaufen. Bitte neu anmelden.');
  return { Authorization: `Bearer ${session.access_token}`, apikey: EXTERNAL_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
}

export async function loadNotificationSettings(parkId: string): Promise<NotificationSettings> {
  if (PREVIEW) return { ...DEFAULT_SETTINGS, push_enabled: true };
  const res = await fetch(`${URL_}?park_id=${encodeURIComponent(parkId)}`, { headers: await auth() });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return { ...DEFAULT_SETTINGS, ...(body?.settings ?? {}) };
}

export async function saveNotificationSettings(parkId: string, s: NotificationSettings): Promise<NotificationSettings> {
  if (PREVIEW) return s;
  const payload = {
    park_id: parkId,
    ...s,
    photo_inactivity_minutes: Math.min(240, Math.max(5, Math.round(s.photo_inactivity_minutes))),
    paper_low_threshold: Math.min(500, Math.max(1, Math.round(s.paper_low_threshold))),
  };
  const res = await fetch(URL_, { method: 'POST', headers: await auth(), body: JSON.stringify(payload) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return { ...DEFAULT_SETTINGS, ...(body?.settings ?? payload) };
}
