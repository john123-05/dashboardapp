import { EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY } from './supabase';
import { getFunctionSession } from './functionAuth';
import { PREVIEW } from './preview';

/** Gäste mit mehreren eingelösten Bildern (letzte `days` Tage): Familie/Gruppe oder nochmal gefahren. */
export interface PhotoBuyerStats {
  days: number;
  guests: number;
  photos: number;
  multi: number;
  family: number;
  again: number;
}

// Function `operator-guest-users?view=buyers` (Bilder innerhalb von 5 Minuten = eine Fahrt).
export async function fetchPhotoBuyers(parkId: string): Promise<PhotoBuyerStats | null> {
  if (PREVIEW) return { days: 30, guests: 31, photos: 49, multi: 14, family: 8, again: 7 };
  const {
    data: { session },
  } = await getFunctionSession();
  if (!session?.access_token) return null;
  const res = await fetch(`${EXTERNAL_SUPABASE_URL}/functions/v1/operator-guest-users?park_id=${encodeURIComponent(parkId)}&view=buyers`, {
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: EXTERNAL_SUPABASE_ANON_KEY },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) return null;
  // Ältere Function ohne `view=buyers` liefert die Gästeliste – dann nichts anzeigen.
  return body?.data && typeof body.data.multi === 'number' ? (body.data as PhotoBuyerStats) : null;
}
