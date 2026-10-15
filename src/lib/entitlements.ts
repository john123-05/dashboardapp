import { EXTERNAL_SUPABASE_ANON_KEY, EXTERNAL_SUPABASE_URL } from './supabase';
import { getFunctionSession } from './functionAuth';
import { PREVIEW } from './preview';
import { useData } from './useData';

// Freischaltungen wie im Web (src/lib/plans.ts): Plan (Basis, Marketing Starter, Marketing Pro)
// plus Add-ons (Online-Shop, Speedmessung). Fehler sperren nicht (Entscheidung 10.10.2026).
export type PlanKey = 'basis' | 'marketing_starter' | 'marketing_pro';
export type FeatureKey =
  | 'crm_contacts' | 'crm_survey' | 'crm_social' | 'crm_pixel' | 'email_marketing' | 'email_automations'
  | 'social_campaigns' | 'review_routing' | 'team_permissions' | 'reports_pro' | 'online_shop' | 'speed' | 'demo';

export const FEATURE_PLAN: Record<FeatureKey, PlanKey | 'addon'> = {
  crm_contacts: 'marketing_starter', crm_survey: 'marketing_starter', crm_social: 'marketing_starter', crm_pixel: 'marketing_starter',
  email_marketing: 'marketing_starter', email_automations: 'marketing_pro', social_campaigns: 'marketing_pro', review_routing: 'marketing_pro',
  team_permissions: 'marketing_pro', reports_pro: 'marketing_pro', online_shop: 'addon', speed: 'addon', demo: 'addon',
};
const PLAN_ORDER: PlanKey[] = ['basis', 'marketing_starter', 'marketing_pro'];
export const PLAN_LABEL: Record<PlanKey, string> = { basis: 'Basis', marketing_starter: 'Marketing Starter', marketing_pro: 'Marketing Pro' };

// Parks mit Gäste-Aktivität (Speedmessung inklusive), wie GUEST_ACTIVITY_PARK_IDS im Web.
const GUEST_ACTIVITY_PARK_IDS = new Set([
  'e2da6436-6a83-4c39-add3-5f99eb6bd897', '3b08e092-beb5-46ec-9811-5698e86dd83a', '25c1022b-4e2e-4fc4-b54d-72a4ced2522b',
  '91902231-5950-471b-8cc9-a03833f2a318', '56f864d0-1852-4baf-8167-a51fde746315', '3eed6a5a-eca7-4097-90c2-45c64919e222',
]);
export const hasGuestActivity = (parkId: string | null | undefined) => !!parkId && GUEST_ACTIVITY_PARK_IDS.has(parkId);

type Row = { park_id: string; plan: PlanKey; features: FeatureKey[]; status: 'active' | 'trial' | 'paused' | 'cancelled'; trial_until: string | null };

function resolve(row: Row | null, parkId: string) {
  if (!row) return { plan: 'marketing_starter' as PlanKey, features: (hasGuestActivity(parkId) ? ['speed'] : []) as FeatureKey[] };
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  const active = row.status === 'active' || (row.status === 'trial' && row.trial_until !== null && row.trial_until >= today);
  return { plan: active ? row.plan : ('basis' as PlanKey), features: active ? row.features : [] };
}

async function fetchRow(parkId: string): Promise<Row | null> {
  if (PREVIEW) return null;
  const { data: { session } } = await getFunctionSession();
  if (!session?.access_token) throw new Error('Missing session');
  // Die Function heißt im Editor "operator-entitlements", ihre Adresse ist "hyper-processor" (siehe Web).
  const res = await fetch(`${EXTERNAL_SUPABASE_URL}/functions/v1/hyper-processor?park_id=${encodeURIComponent(parkId)}`, {
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: EXTERNAL_SUPABASE_ANON_KEY },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  return (body?.data ?? null) as Row | null;
}

export function useEntitlements(parkId: string | null) {
  const q = useData(parkId ? `ent:${parkId}` : null, () => fetchRow(parkId!), [parkId], 300000);
  const r = resolve(q.error ? null : q.data ?? null, parkId ?? '');
  const isDemo = r.features.includes('demo');
  const has = (f: FeatureKey) => {
    if (isDemo) return true;
    const need = FEATURE_PLAN[f];
    if (need === 'addon') return r.features.includes(f);
    return PLAN_ORDER.indexOf(r.plan) >= PLAN_ORDER.indexOf(need) || r.features.includes(f);
  };
  return { plan: r.plan, has, loading: q.loading && q.data === undefined, requiredPlan: (f: FeatureKey) => FEATURE_PLAN[f] };
}

export function speedUnlocked(parkId: string | null, has: (f: FeatureKey) => boolean) {
  return hasGuestActivity(parkId) || has('speed');
}
