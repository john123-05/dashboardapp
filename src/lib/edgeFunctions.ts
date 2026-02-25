import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

interface EdgeFunctionOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
}

interface EdgeFunctionResponse<T> {
  data: T | null;
  error: string | null;
}

function toQueryString(query?: EdgeFunctionOptions['query']): string {
  if (!query) return '';

  const entries = Object.entries(query)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return entries.length > 0 ? `?${entries.join('&')}` : '';
}

export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  options: EdgeFunctionOptions = {}
): Promise<EdgeFunctionResponse<T>> {
  try {
    const { method = 'GET', body, query } = options;
    const url = `${SUPABASE_URL}/functions/v1/${functionName}${toQueryString(query)}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        data: null,
        error: `HTTP ${response.status}: ${text || response.statusText}`,
      };
    }

    const json = (await response.json()) as { error?: string } & T;

    if (json && 'error' in json && typeof json.error === 'string') {
      return { data: null, error: json.error };
    }

    return { data: json, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
