import { callShared, formFile } from './shared';
import type { PickedImage } from './imagePick';
import { PREVIEW } from './preview';

// Online-Shop wie im Web (src/lib/shop.ts): Function operator-shop-settings im geteilten Projekt.
// Der öffentliche Shop liegt auf der Abholseite, die Demo unter /demo-shop/<token>.

export const PUBLIC_SHOP_URL = 'https://liftpictures-fotos.de';

export interface ShopProduct { key: string; label: string; description: string; price_cents: number; per_photo: boolean; enabled: boolean }
export interface ShopSettings {
  price_cents: number;
  accent_color: string;
  logo_url: string | null;
  shop_name: string | null;
  welcome_text: string | null;
  font_family: string;
  products: ShopProduct[];
  demo_token: string;
  activation_requested_at: string | null;
}
export type ShopOverview = { settings: ShopSettings; revenue: { salesCount: number; totalCents: number } | null; redemptions: { total: number; delayed: number } | null };

export async function fetchShopOverview(parkId: string): Promise<ShopOverview> {
  if (PREVIEW) return (await import('./mockMore')).previewShop();
  return callShared<ShopOverview>('operator-shop-settings', { query: { park_id: parkId }, raw: true });
}

export async function saveShopSettings(
  parkId: string,
  changes: { accent_color?: string; shop_name?: string | null; welcome_text?: string | null; font_family?: string; products?: { key: string; enabled: boolean; price_cents: number }[] },
): Promise<ShopSettings> {
  if (PREVIEW) return { ...(await fetchShopOverview(parkId)).settings, ...(changes as object) } as ShopSettings;
  const body = await callShared<{ settings: ShopSettings }>('operator-shop-settings', { method: 'POST', body: { park_id: parkId, ...changes }, raw: true });
  return body.settings;
}

export async function uploadShopLogo(parkId: string, img: PickedImage): Promise<ShopSettings> {
  if (PREVIEW) return (await fetchShopOverview(parkId)).settings;
  const form = new FormData();
  form.append('park_id', parkId);
  form.append('logo', formFile({ uri: img.uri, name: img.name, type: img.type }));
  const body = await callShared<{ settings: ShopSettings }>('operator-shop-settings', { method: 'POST', form, raw: true });
  return body.settings;
}

export const demoShopUrl = (s: ShopSettings) => `${PUBLIC_SHOP_URL}/demo-shop/${s.demo_token}`;

// Namen der Produkte wie im Web-Wörterbuch (shop.catalog.*); unbekannte Schlüssel behalten den Server-Text.
export const PRODUCT_TEXT: Record<string, [string, string]> = {
  digital: ['Digitaler Download', 'Dein Foto in voller Auflösung zum Herunterladen'],
  print: ['Fotoabzug 13×18', 'Hochglanzabzug, per Post zu dir nach Hause'],
  postcard: ['Postkarte', 'Dein Foto als Postkarte mit Park-Logo'],
  magnet: ['Kühlschrankmagnet', 'Erinnerung für jeden Tag'],
  mug: ['Tasse', 'Keramiktasse mit deinem Foto, spülmaschinenfest'],
  tshirt: ['T-Shirt', 'Bio-Baumwolle, dein Foto auf der Brust'],
  daypass: ['Tagespass', 'Alle deine Fotos des Tages als Download'],
  poster: ['Poster 30×40', 'Dein Foto groß an der Wand, matt gedruckt'],
  canvas: ['Leinwand 30×40', 'Auf Keilrahmen gespannt, fertig zum Aufhängen'],
  keychain: ['Schlüsselanhänger', 'Dein Foto immer dabei'],
  puzzle: ['Puzzle (120 Teile)', 'Dein Foto zum Zusammensetzen'],
};
export const NEW_PRODUCTS = ['poster', 'canvas', 'keychain', 'puzzle'];
export const PRODUCT_ICON: Record<string, string> = {
  digital: 'cloud-download-outline', print: 'image-outline', postcard: 'mail-outline', magnet: 'magnet-outline', mug: 'cafe-outline',
  tshirt: 'shirt-outline', daypass: 'calendar-outline', poster: 'easel-outline', canvas: 'tablet-landscape-outline', keychain: 'key-outline', puzzle: 'extension-puzzle-outline',
};

export const SHOP_FONTS: { key: string; label: string }[] = [
  ['system', 'Standard (System)'], ['inter', 'Inter'], ['roboto', 'Roboto'], ['open-sans', 'Open Sans'], ['lato', 'Lato'], ['montserrat', 'Montserrat'],
  ['poppins', 'Poppins'], ['nunito', 'Nunito'], ['raleway', 'Raleway'], ['work-sans', 'Work Sans'], ['source-sans-3', 'Source Sans 3'], ['dm-sans', 'DM Sans'],
  ['manrope', 'Manrope'], ['rubik', 'Rubik'], ['figtree', 'Figtree'], ['palanquin', 'Palanquin'], ['barlow', 'Barlow'], ['fira-sans', 'Fira Sans'],
  ['archivo', 'Archivo'], ['josefin-sans', 'Josefin Sans'], ['quicksand', 'Quicksand'], ['oswald', 'Oswald'], ['bebas-neue', 'Bebas Neue'],
  ['playfair-display', 'Playfair Display'], ['merriweather', 'Merriweather'], ['lora', 'Lora'],
].map(([key, label]) => ({ key, label }));

export const SHOP_COLORS = ['#C6A233', '#D2561A', '#E5392D', '#DB2777', '#7C3AED', '#2563EB', '#0891B2', '#12A15F', '#65A30D', '#101828'];

export function priceToCents(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}
export const centsToInput = (c: number) => (c / 100).toFixed(2).replace('.', ',');
