import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from './supabase';

export interface EdgeFunctionResponse<T = any> {
  data: T | null;
  error: string | null;
}

type Query = Record<string, string | number | boolean | null | undefined>;

function toQuery(query?: Query): string {
  if (!query) return '';
  const entries = Object.entries(query)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return entries.length > 0 ? `?${entries.join('&')}` : '';
}

async function parseError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    return parsed.error || parsed.message || `HTTP ${response.status}`;
  } catch {
    return text || `HTTP ${response.status}`;
  }
}

// Wie im Web-Dashboard (src/lib/edgeFunctions.ts): ohne useSessionAuth geht der anonyme
// Schlüssel mit, mit useSessionAuth das Token des angemeldeten Betreibers.
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    query?: Query;
    useSessionAuth?: boolean;
  } = {},
): Promise<EdgeFunctionResponse<T>> {
  const { method = 'GET', body, query, useSessionAuth = false } = options;
  try {
    let token = SUPABASE_ANON_KEY;
    if (useSessionAuth) {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token ?? SUPABASE_ANON_KEY;
    }
    const headers = (t: string) => ({
      Authorization: `Bearer ${t}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    });
    const url = `${SUPABASE_URL}/functions/v1/${functionName}${toQuery(query)}`;
    const init: RequestInit = { method, headers: headers(token), body: body && method !== 'GET' ? JSON.stringify(body) : undefined };
    let response = await fetch(url, init);
    if (response.status === 401 && useSessionAuth && token !== SUPABASE_ANON_KEY) {
      response = await fetch(url, { ...init, headers: headers(SUPABASE_ANON_KEY) });
    }
    if (!response.ok) return { data: null, error: await parseError(response) };
    const json = await response.json().catch(() => null);
    if (json && typeof json === 'object' && typeof json.error === 'string') return { data: null, error: json.error };
    return { data: json as T, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
  }
}

export function getOptionalSourceWarning(source: string, error: string | null | undefined): string | null {
  return error ? `${source}: ${error}` : null;
}
