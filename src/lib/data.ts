import { EXTERNAL_SUPABASE_ANON_KEY, EXTERNAL_SUPABASE_URL } from './supabase';
import { getFunctionSession } from './functionAuth';
import { invokeEdgeFunction } from './edgeFunctions';
import {
  fetchKioskPurchasesLedger,
  fetchKioskSales,
  fetchMachineRevenue,
  type KioskLedgerResponse,
  type KioskSalesResponse,
  type MachineRevenue,
} from './kioskSales';
import { PREVIEW } from './preview';
import { previewHealth, previewKioskSales, previewLedger, previewMachineRevenue } from './mock';

export type HealthItem = { name: string; status: string; detail?: string | null; plain?: string | null };

// Antwort von operator-liftpic-health (siehe supabase/functions/operator-liftpic-health im Web-Repo).
export type HealthMachine = {
  id: string;
  machine_id: string;
  machine_label: string | null;
  reachable: boolean;
  offline_minutes?: number | null;
  last_seen_at?: string | null;
  paper_remaining?: number | null;
  paper_capacity?: number | null;
  paper_warn_remaining?: number | null;
  queue_count?: number | null;
  disk_free_mb?: number | null;
  agent_version?: string | null;
  card_only?: boolean;
  customer_code?: string | null;
  customer_code_registered?: boolean | null;
  photos_taken_today?: number | null;
  photos_sold_today?: number | null;
  photo_conversion_today?: number | null;
  probes?: HealthItem[];
  devices?: HealthItem[];
  ausgeblendet?: string[];
  coin_warnings?: { cent: number; stufe: 'knapp' | 'leer'; text: string }[];
};

export const loadKioskSales = (parkId: string): Promise<KioskSalesResponse> =>
  PREVIEW ? Promise.resolve(previewKioskSales()) : fetchKioskSales(parkId);

export const loadMachineRevenue = (parkId: string): Promise<MachineRevenue[]> =>
  PREVIEW ? Promise.resolve(previewMachineRevenue()) : fetchMachineRevenue(parkId);

export const loadLedger = (parkId: string, opts: { from?: string; to?: string } = {}): Promise<KioskLedgerResponse> =>
  PREVIEW ? Promise.resolve(previewLedger()) : fetchKioskPurchasesLedger(parkId, opts);

export async function loadHealth(parkId: string): Promise<HealthMachine[]> {
  if (PREVIEW) return previewHealth();
  const {
    data: { session },
  } = await getFunctionSession();
  if (!session?.access_token) throw new Error('Nicht angemeldet');
  const res = await fetch(`${EXTERNAL_SUPABASE_URL}/functions/v1/operator-liftpic-health?park_id=${encodeURIComponent(parkId)}`, {
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: EXTERNAL_SUPABASE_ANON_KEY },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return (body?.data?.machines ?? []) as HealthMachine[];
}

export type SupportMessage = {
  id: string;
  author_role: string;
  message: string;
  created_at: string;
  ticket_subject?: string | null;
};

export async function loadSupportReplies(parkId: string): Promise<SupportMessage[]> {
  if (PREVIEW) {
    return [
      { id: 's1', author_role: 'support', message: 'Das Kartenterminal ist jetzt eingerichtet. Bitte einmal mit einer echten Karte testen.', created_at: new Date(Date.now() - 3 * 3600000).toISOString(), ticket_subject: 'Kartenzahlung Wingst' },
    ];
  }
  const { data, error } = await invokeEdgeFunction<{ messages: SupportMessage[] }>('support-tickets', {
    useSessionAuth: true,
    query: { park_id: parkId, recent_messages: '1' },
  });
  if (error) return [];
  return (data?.messages ?? []).filter((m) => m.author_role === 'support');
}
