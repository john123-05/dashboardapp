import { supabase } from './supabase';

// Token für die Functions. Läuft es in weniger als 90 Sekunden ab (oder ist es nach längerer Pause im
// Hintergrund schon abgelaufen), wird es vorher erneuert – sonst lehnt der Server mit
// "Invalid operator auth token" ab.
export async function getFunctionSession() {
  const res = await supabase.auth.getSession();
  const expiresAt = res.data.session?.expires_at ?? 0;
  if (res.data.session && expiresAt * 1000 - Date.now() < 90_000) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.data.session) return { data: { session: refreshed.data.session }, error: null };
  }
  return res;
}

/** Nach einer Ablehnung wegen des Tokens: einmal erneuern, dann darf der Aufruf es noch einmal versuchen. */
export async function refreshFunctionSession(): Promise<boolean> {
  const { data } = await supabase.auth.refreshSession();
  return !!data.session;
}

export const isTokenRejection = (status: number, message: unknown) =>
  status === 401 && typeof message === 'string' && /auth token|jwt|bearer/i.test(message);
