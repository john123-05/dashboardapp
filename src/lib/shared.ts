import { EXTERNAL_SUPABASE_ANON_KEY, EXTERNAL_SUPABASE_URL } from './supabase';
import { getFunctionSession } from './functionAuth';

// Aufruf einer Function im geteilten Projekt mit dem Token des Betreibers (wie im Web die vielen
// `call()` in lib/surveyApi.ts, lib/shop.ts usw.). Antwort ohne `data`-Hülle kommt unverändert zurück.
export async function sharedHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await getFunctionSession();
  if (!session?.access_token) throw new Error('Sitzung abgelaufen. Bitte neu anmelden.');
  return { Authorization: `Bearer ${session.access_token}`, apikey: EXTERNAL_SUPABASE_ANON_KEY };
}

export class SharedError extends Error {
  constructor(message: string, public status: number, public body: any) {
    super(message);
  }
}

export async function callShared<T = any>(
  fn: string,
  opts: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; query?: Record<string, string | undefined>; body?: unknown; form?: FormData; raw?: boolean } = {},
): Promise<T> {
  const { method = 'GET', query, body, form, raw } = opts;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== '') params.set(k, v);
  const qs = params.toString();
  const headers: Record<string, string> = await sharedHeaders();
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${EXTERNAL_SUPABASE_URL}/functions/v1/${fn}${qs ? `?${qs}` : ''}`, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new SharedError(json?.error || `HTTP ${res.status}`, res.status, json);
  return (raw ? json : json?.data ?? json) as T;
}

// Datei aus der Bildauswahl als Teil eines Formulars (React Native versteht { uri, name, type }).
export function formFile(file: { uri: string; name: string; type: string }) {
  return file as unknown as Blob;
}
