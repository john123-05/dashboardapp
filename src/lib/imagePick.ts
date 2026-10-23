import * as ImagePicker from 'expo-image-picker';
import { tr } from '../i18n';
import { formatDecimal } from './format';

export type PickedImage = { uri: string; name: string; type: string; width: number; height: number; base64: string | null; size: number | null };

// Bild aus der Mediathek oder von der Kamera. `null`, wenn abgebrochen. PNG bleibt PNG (Transparenz
// der Overlays), weil ohne `allowsEditing` die Originaldatei kommt.
export async function pickImage(source: 'library' | 'camera' = 'library', opts: { base64?: boolean } = {}): Promise<PickedImage | null> {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(source === 'camera' ? tr('Kein Zugriff auf die Kamera. Bitte in den iOS-Einstellungen erlauben.') : tr('Kein Zugriff auf die Fotos. Bitte in den iOS-Einstellungen erlauben.'));
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, base64: opts.base64 ?? false, exif: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  const type = a.mimeType || (a.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
  const ext = type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const name = (a.fileName || `bild-${Date.now()}.${ext}`).toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  return { uri: a.uri, name, type, width: a.width, height: a.height, base64: a.base64 ?? null, size: a.fileSize ?? null };
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Für supabase.storage.upload: in React Native ist ein ArrayBuffer der verlässliche Weg.
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buf = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < clean.length; i++) {
    buf = (buf << 6) | ALPHABET.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buf >> bits) & 0xff;
    }
  }
  return out.subarray(0, o);
}

export function formatBytes(size: number | null | undefined) {
  if (!size) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${formatDecimal(size / (1024 * 1024))} MB`;
}
