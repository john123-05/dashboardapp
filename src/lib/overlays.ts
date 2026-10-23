import { externalSupabase, supabase } from './supabase';
import { callShared, formFile } from './shared';
import { invokeEdgeFunction } from './edgeFunctions';
import { base64ToBytes, type PickedImage } from './imagePick';
import { PREVIEW } from './preview';
import { tr } from '../i18n';

// Personalisierung wie im Web (src/pages/Personalization.tsx + components/AutomatBranding.tsx):
// gespeicherte Overlays (Bucket `overlays`, Operator-Projekt), "Sofort Overlay"-Kampagnen und die
// Bilder am Automaten (operator-liftpic-assets, geteiltes Projekt).

const BUCKET = 'overlays';

export type OverlayAsset = { id: string; park_id: string; bucket: string; path: string; mime_type: string | null; width: number | null; height: number | null; created_at: string; preview_url: string | null };
type Layer = { id: string; asset_id: string; z_index: number; opacity: number; fit: string; anchor: string; scale: number };
export type OverlayCampaign = { id: string; name: string; status: string; starts_at: string; layers: Layer[] };

export const basename = (path: string) => path.split('/').pop() || path;

export async function loadOverlays(parkId: string): Promise<{ assets: OverlayAsset[]; campaigns: OverlayCampaign[] }> {
  if (PREVIEW) return (await import('./mockMore')).previewOverlays();
  const { data: rows, error } = await supabase.from('overlay_assets').select('*').eq('park_id', parkId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const list = (rows ?? []) as Omit<OverlayAsset, 'preview_url'>[];
  const signed = list.length ? (await supabase.storage.from(BUCKET).createSignedUrls(list.map((a) => a.path), 3600)).data ?? [] : [];
  const url = new Map(signed.map((s) => [s.path, s.signedUrl]));
  const assets = list.map((a) => ({ ...a, preview_url: url.get(a.path) ?? null }));

  const { data: camps, error: campErr } = await supabase
    .from('overlay_campaigns')
    .select('id, name, status, starts_at, layers:overlay_campaign_layers(id, asset_id, z_index, opacity, fit, anchor, scale)')
    .eq('park_id', parkId)
    .order('starts_at', { ascending: false });
  if (campErr) throw new Error(campErr.message);
  return { assets, campaigns: (camps ?? []) as unknown as OverlayCampaign[] };
}

/** Die gerade aktive Kampagne (wie im Web: die neueste). */
export const activeCampaign = (campaigns: OverlayCampaign[]) => campaigns.find((c) => c.status === 'active') ?? campaigns[0] ?? null;

export async function uploadOverlay(parkId: string, userId: string, img: { bytes: Uint8Array; type: string; name: string; width: number | null; height: number | null }) {
  const ext = img.name.includes('.') ? img.name.split('.').pop() : 'png';
  const path = `${parkId}/${uuid()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, img.bytes, { upsert: false, contentType: img.type });
  if (upErr) throw new Error(upErr.message);
  const { data, error } = await supabase
    .from('overlay_assets')
    .insert({ park_id: parkId, bucket: BUCKET, path, mime_type: img.type, width: img.width, height: img.height, created_by: userId })
    .select('*')
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(error.message);
  }
  return data as OverlayAsset;
}

export function pickedToUpload(p: PickedImage) {
  if (!p.base64) throw new Error(tr('Bild konnte nicht gelesen werden.'));
  return { bytes: base64ToBytes(p.base64), type: p.type, name: p.name, width: p.width || null, height: p.height || null };
}

/** "Sofort verwenden": eine Kampagne aus genau diesem Overlay, die bisherige Sofort-Kampagne wird archiviert. */
export async function activateOverlay(parkId: string, asset: Pick<OverlayAsset, 'id' | 'path'>): Promise<string> {
  if (PREVIEW) return 'c-preview';
  await supabase.from('overlay_campaigns').update({ status: 'archived' }).eq('park_id', parkId).eq('status', 'active').like('name', 'Sofort Overlay:%');
  const { data: campaign, error } = await supabase
    .from('overlay_campaigns')
    .insert({ park_id: parkId, name: `Sofort Overlay: ${basename(asset.path)}`, starts_at: new Date().toISOString(), ends_at: null, priority: 1000, status: 'active' })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  const id = (campaign as { id: string }).id;
  const { error: layerErr } = await supabase
    .from('overlay_campaign_layers')
    .insert({ campaign_id: id, asset_id: asset.id, z_index: 10, opacity: 1, blend_mode: 'normal', fit: 'fill', anchor: 'center', scale: 1 });
  if (layerErr) throw new Error(layerErr.message);
  return id;
}

export async function deleteOverlay(asset: Pick<OverlayAsset, 'id' | 'bucket' | 'path'>) {
  if (PREVIEW) return;
  const { error: layerErr } = await supabase.from('overlay_campaign_layers').delete().eq('asset_id', asset.id);
  if (layerErr) throw new Error(layerErr.message);
  const { error } = await supabase.from('overlay_assets').delete().eq('id', asset.id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(asset.bucket).remove([asset.path]);
}

/** KI-Overlays (Function generate-overlays im Operator-Projekt), dann wie ein Upload ablegen. */
export async function generateOverlays(parkId: string, userId: string, message: string, prompt: string, baseImageUrl: string | null): Promise<OverlayAsset | null> {
  const { data, error } = await invokeEdgeFunction<{ overlays: { name: string; url: string }[] }>('generate-overlays', { method: 'POST', body: { message, prompt, baseImageUrl } });
  if (error) throw new Error(error);
  let last: OverlayAsset | null = null;
  for (const item of data?.overlays ?? []) {
    if (!item?.url) continue;
    const res = await fetch(item.url);
    if (!res.ok) continue;
    const bytes = new Uint8Array(await res.arrayBuffer());
    last = await uploadOverlay(parkId, userId, { bytes, type: res.headers.get('content-type') || 'image/png', name: item.name || `overlay-${uuid()}.png`, width: null, height: null });
  }
  return last;
}

export async function latestPhotoUrl(parkId: string): Promise<string | null> {
  if (PREVIEW) return (await import('./mock')).previewPhotos(1)[0].imageUrl;
  const { data, error } = await invokeEdgeFunction<{ recent?: { image_url?: string; thumbnail_url?: string }[] }>('external-photos', { query: { park_id: parkId } });
  if (error) return null;
  const r = data?.recent?.[0];
  return r?.image_url || r?.thumbnail_url || null;
}

// ---------------------------------------------------------------- Bilder am Automaten

export const SLOTS = [
  { id: 'viewer_overlay_png', get label() { return tr('Foto-Overlay'); }, get desc() { return tr('Rahmen oder Wasserzeichen, das auf dem verkauften Foto liegt.'); }, get tip() { return tr('Am besten PNG mit transparentem Hintergrund, Seitenverhältnis 4:3 (z. B. 2362 × 1772 px).'); } },
  { id: 'viewer_main_logo', get label() { return tr('Automat-Logo'); }, get desc() { return tr('Logo auf dem Verkaufsbildschirm des Automaten.'); }, get tip() { return tr('PNG mit transparentem Hintergrund.'); } },
  { id: 'viewer_background', get label() { return tr('Hintergrund'); }, get desc() { return tr('Hintergrundbild des Verkaufsbildschirms.'); }, get tip() { return tr('Querformat, etwa 2100 × 1200 px.'); } },
] as const;
export type SlotId = (typeof SLOTS)[number]['id'];

export type BrandingMachine = {
  id: string;
  machine_id: string;
  machine_label: string | null;
  last_seen_at: string | null;
  pending_restart?: { mode?: 'now' | 'tonight'; requested_at?: string } | null;
  last_restart_at?: string | null;
};
export type Deployment = { id: string; machine_id: string | null; slot: string; bucket: string | null; storage_path: string | null; updated_at: string | null; created_at: string | null; preview_url: string | null };
export type CurrentRef = { url: string; createdAt: string | null; machineId: string; slot: string };

export async function loadBranding(parkId: string): Promise<{ machines: BrandingMachine[]; assets: Deployment[]; refs: Record<string, CurrentRef>; notDeployed: boolean }> {
  if (PREVIEW) return (await import('./mockMore')).previewBranding();
  let data: { machines?: BrandingMachine[]; assets?: Omit<Deployment, 'preview_url'>[] };
  try {
    data = await callShared('operator-liftpic-assets', { query: { park_id: parkId } });
  } catch (e: any) {
    if (e?.status === 404) return { machines: [], assets: [], refs: {}, notDeployed: true };
    throw new Error(tr('Die Automaten konnten nicht geladen werden ({0}).', e?.message ?? tr('unbekannter Fehler')));
  }
  // Der Bucket der Automaten-Dateien ist öffentlich: getPublicUrl, nicht signieren.
  const assets = (data.assets ?? []).map((a) => ({
    ...a,
    preview_url: a.bucket && a.storage_path ? externalSupabase.storage.from(a.bucket).getPublicUrl(a.storage_path).data.publicUrl : null,
  }));
  const refs = await listCurrentRefs(parkId).catch(() => ({}));
  return { machines: data.machines ?? [], assets, refs, notDeployed: false };
}

const safe = (v: string) => v.replace(/[^a-zA-Z0-9-]+/g, '-');
export const refKey = (machineId: string, slot: string) => `${safe(machineId)}__${safe(slot)}`;

async function listCurrentRefs(parkId: string): Promise<Record<string, CurrentRef>> {
  const folder = `${parkId}/aktuell`;
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) throw new Error(error.message);
  const files = (data ?? []).filter((f) => f.id && f.name && !f.name.startsWith('.'));
  if (!files.length) return {};
  const paths = files.map((f) => `${folder}/${f.name}`);
  const signed = (await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)).data ?? [];
  const url = new Map(signed.map((s) => [s.path, s.signedUrl]));
  const out: Record<string, CurrentRef> = {};
  files.forEach((f, i) => {
    const [machine, slot] = f.name.split('__');
    const u = url.get(paths[i]);
    if (!machine || !slot || !u) return;
    const key = `${machine}__${slot}`;
    if (!out[key]) out[key] = { url: u, createdAt: f.created_at ?? null, machineId: machine, slot };
  });
  return out;
}

/** "Aktuellen Stand hinterlegen": nur zum Anzeigen, geht nicht an den Automaten. */
export async function uploadCurrentRef(parkId: string, machineId: string, slot: string, img: PickedImage) {
  if (PREVIEW) return;
  const up = pickedToUpload(img);
  const ext = img.name.split('.').pop() || 'png';
  const { error } = await supabase.storage.from(BUCKET).upload(`${parkId}/aktuell/${refKey(machineId, slot)}__${Date.now()}.${ext}`, up.bytes, { upsert: false, contentType: up.type });
  if (error) throw new Error(error.message);
}

/** Was der Platz gerade zeigt: das gesendete oder das hinterlegte Bild, das neuere von beiden. */
export function displayFor(slot: string, machine: BrandingMachine | null, assets: Deployment[], refs: Record<string, CurrentRef>) {
  if (!machine) return null;
  const sent = assets.find((a) => a.machine_id === machine.machine_id && a.slot === slot);
  const ref = refs[refKey(machine.machine_id, slot)];
  const s = sent?.preview_url ? { url: sent.preview_url, kind: 'sent' as const, when: sent.updated_at || sent.created_at } : null;
  const r = ref ? { url: ref.url, kind: 'reference' as const, when: ref.createdAt } : null;
  if (s && r) return new Date(r.when ?? 0).getTime() > new Date(s.when ?? 0).getTime() ? r : s;
  return s ?? r;
}

/** Bild an einen Platz des Automaten senden: neue Datei aus der Mediathek oder ein gespeichertes Overlay. */
export async function sendToSlot(parkId: string, machineConfigId: string, slot: SlotId, source: { picked: PickedImage } | { overlay: OverlayAsset }) {
  if (PREVIEW) return;
  const form = new FormData();
  form.append('park_id', parkId);
  form.append('machine_config_id', machineConfigId);
  form.append('slot', slot);
  if ('picked' in source) {
    form.append('file', formFile({ uri: source.picked.uri, name: source.picked.name, type: source.picked.type }));
  } else {
    // Gespeichertes Overlay: über die signierte Adresse als Datei weiterreichen.
    if (!source.overlay.preview_url) throw new Error(tr('Das gespeicherte Overlay ist nicht erreichbar.'));
    form.append('file', formFile({ uri: source.overlay.preview_url, name: basename(source.overlay.path), type: source.overlay.mime_type || 'image/png' }));
  }
  try {
    await callShared('operator-liftpic-assets', { method: 'POST', form, raw: true });
  } catch (e) {
    throw new Error(tr('Der Server hat die Übertragung abgelehnt: {0}', e instanceof Error ? e.message : String(e)));
  }
}

export async function requestRestart(parkId: string, machineConfigId: string, mode: 'now' | 'tonight' | 'cancel') {
  if (PREVIEW) return;
  await callShared('operator-liftpic-assets', { method: 'PATCH', body: { park_id: parkId, machine_config_id: machineConfigId, mode }, raw: true });
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
