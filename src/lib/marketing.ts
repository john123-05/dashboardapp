import { EXTERNAL_SUPABASE_ANON_KEY, EXTERNAL_SUPABASE_URL } from './supabase';
import { getFunctionSession } from './functionAuth';
import { invokeEdgeFunction } from './edgeFunctions';
import { PREVIEW } from './preview';

export interface Lead {
  id: string;
  email: string | null;
  phone?: string | null;
  full_name: string | null;
  opted_in: boolean;
  created_at: string;
  country_code?: string | null;
  locale?: string | null;
  source?: string | null;
}

export async function loadLeads(parkId: string): Promise<Lead[]> {
  if (PREVIEW) {
    const n = ['Anna Becker', 'Jonas Weber', 'Mia Schulz', 'Leon Fischer', 'Emma Wagner', 'Paul Hoffmann', 'Lina Koch'];
    return n.map((name, i) => ({ id: `l${i}`, email: `${name.split(' ')[0].toLowerCase()}@example.de`, phone: i % 3 === 0 ? '+49 170 1234567' : null, full_name: name, opted_in: i % 2 === 0, created_at: new Date(Date.now() - i * 86400000 * 1.7).toISOString(), country_code: ['DE', 'AT', 'NL'][i % 3], locale: 'de' }));
  }
  const r = await invokeEdgeFunction<{ leads: Lead[] }>('external-leads', { useSessionAuth: true, query: { park_id: parkId } });
  if (r.error) throw new Error(r.error);
  return r.data?.leads ?? [];
}

export interface SurveyResults {
  days: number; total: number; scored: number; average_score: number | null; nps: number | null;
  promoters: number; detractors: number; passives: number; review_link_shown: number;
  distribution: { score: number; count: number }[];
  questions: { id: string; type: string; prompt: Record<string, string>; answered: number; average?: number | null; yes?: number; no?: number; counts?: { index: number; count: number }[]; options: Record<string, string>[] }[];
}

export async function loadSurveyResults(parkId: string, days = 30): Promise<SurveyResults | null> {
  if (PREVIEW) {
    return { days, total: 42, scored: 40, average_score: 8.6, nps: 52, promoters: 26, detractors: 5, passives: 9, review_link_shown: 21, distribution: [6, 7, 8, 9, 10].map((s, i) => ({ score: s, count: [3, 4, 7, 11, 15][i] })), questions: [{ id: 'q1', type: 'yesno', prompt: { de: 'Würdest du wiederkommen?' }, answered: 38, yes: 33, no: 5, options: [] }] };
  }
  const { data: { session } } = await getFunctionSession();
  if (!session?.access_token) throw new Error('Sitzung abgelaufen');
  const res = await fetch(`${EXTERNAL_SUPABASE_URL}/functions/v1/operator-survey?${new URLSearchParams({ park_id: parkId, view: 'results', days: String(days) })}`, {
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: EXTERNAL_SUPABASE_ANON_KEY },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return (body?.data ?? null) as SurveyResults | null;
}

export const pick = (v: Record<string, string> | null | undefined) => (v ? v.de || v.en || Object.values(v)[0] || '' : '');
