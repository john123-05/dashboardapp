import type { HealthMachine } from './data';
import { callShared } from './shared';
import { PREVIEW } from './preview';
import { tr } from '../i18n';

// Kamera einstellen wie im Web (src/pages/Kamera.tsx). Die Grenzen stehen auch im Agenten und in der
// Function operator-liftpic-camera; jede Seite prüft selbst.

export type Kamerawerte = Record<string, Record<string, number | string>>;
export type Kameradaten = {
  modell: string | null;
  seriennummer: string | null;
  videoformat: string | null;
  fps: number | null;
  quelle: string | null;
  programm: string | null;
  werte: Kamerawerte;
  fehler: string | null;
};
export type KameraAutomat = HealthMachine & { camera_settings?: Kameradaten | null; can_test_photo?: boolean };

// Farbmatrix für die Vorschau (SVG feColorMatrix, 4 x 5). Gamma lässt sich so nicht nachstellen und hat
// in der App keine Vorschau: ein Regler, der etwas verspricht, was er nicht zeigt, wäre schlimmer als keiner.
type Vorschau = { art: 'hell'; faktor: (neu: number, alt: number) => number } | { art: 'kontrast'; faktor: (neu: number, alt: number) => number } | { art: 'saettigung'; faktor: (neu: number, alt: number) => number } | { art: 'farbton'; grad: (neu: number, alt: number) => number };

export type Eigenschaft = {
  schluessel: string;
  titel: string;
  erklaerung: string;
  art: 'zahl' | 'schalter';
  von: number;
  bis: number;
  schritt: number;
  einheit?: string;
  nachkommastellen?: number;
  vorschau: Vorschau | null;
};

const hell = (f: (neu: number, alt: number) => number): Vorschau => ({ art: 'hell', faktor: f });

export const EIGENSCHAFTEN: Eigenschaft[] = [
  { schluessel: 'Exposure.Auto', get titel() { return tr('Belichtung automatisch'); }, art: 'schalter', von: 0, bis: 1, schritt: 1, vorschau: null, get erklaerung() { return tr('Die Kamera regelt die Belichtungszeit selbst nach. Ausschalten nur, wenn das Licht immer gleich ist – sonst werden Bilder bei Sonne und Wolken unterschiedlich.'); } },
  { schluessel: 'Exposure.Value', get titel() { return tr('Belichtungszeit'); }, art: 'zahl', von: 0.0002, bis: 0.02, schritt: 0.0001, nachkommastellen: 2, vorschau: hell((n, a) => n / (a || n)), get erklaerung() { return tr('Wie lange der Sensor Licht sammelt. Länger heißt heller, aber auch mehr Bewegungsunschärfe – bei einer Rodelbahn der entscheidende Kompromiss.'); } },
  { schluessel: 'Exposure.Auto Reference', get titel() { return tr('Ziel-Helligkeit'); }, art: 'zahl', von: 30, bis: 200, schritt: 1, vorschau: hell((n, a) => n / (a || n)), get erklaerung() { return tr('Worauf die automatische Belichtung hinregelt. Höher heißt hellere Bilder. Der wirksamste Regler, solange die Automatik an ist.'); } },
  { schluessel: 'Gain.Auto', get titel() { return tr('Verstärkung automatisch'); }, art: 'schalter', von: 0, bis: 1, schritt: 1, vorschau: null, get erklaerung() { return tr('Hebt das Signal an, wenn zu wenig Licht da ist. Kostet Bildrauschen.'); } },
  { schluessel: 'Gain.Auto Max Value', get titel() { return tr('Verstärkung höchstens'); }, art: 'zahl', von: 0, bis: 96, schritt: 1, vorschau: null, get erklaerung() { return tr('Die Obergrenze für die Verstärkung. Niedriger heißt sauberere, aber dunklere Bilder bei schlechtem Licht.'); } },
  { schluessel: 'Saturation.Value', get titel() { return tr('Sättigung'); }, art: 'zahl', von: 0, bis: 200, schritt: 1, vorschau: { art: 'saettigung', faktor: (n, a) => n / (a || 100) }, get erklaerung() { return tr('Wie kräftig die Farben sind. 100 ist neutral.'); } },
  { schluessel: 'Gamma.Value', get titel() { return tr('Gamma'); }, art: 'zahl', von: 0.3, bis: 2.5, schritt: 0.01, nachkommastellen: 2, vorschau: null, get erklaerung() { return tr('Verteilt die Helligkeit ungleichmäßig: hebt Schatten an, ohne die Lichter auszubrennen. Kleiner als 1 heißt heller.'); } },
  { schluessel: 'Brightness.Value', get titel() { return tr('Helligkeit'); }, art: 'zahl', von: -64, bis: 64, schritt: 1, vorschau: hell((n, a) => 1 + (n - a) / 128), get erklaerung() { return tr('Hebt oder senkt das ganze Bild gleichmäßig – ohne Einfluss auf die Schärfe.'); } },
  { schluessel: 'Contrast.Value', get titel() { return tr('Kontrast'); }, art: 'zahl', von: -64, bis: 64, schritt: 1, vorschau: { art: 'kontrast', faktor: (n, a) => 1 + (n - a) / 128 }, get erklaerung() { return tr('Der Abstand zwischen hell und dunkel. Zu viel frisst Zeichnung in Schatten und Himmel.'); } },
  { schluessel: 'Hue.Value', get titel() { return tr('Farbton'); }, art: 'zahl', von: -30, bis: 30, schritt: 1, einheit: '°', vorschau: { art: 'farbton', grad: (n, a) => n - a }, get erklaerung() { return tr('Dreht alle Farben im Kreis. Zum Ausgleichen eines Farbstichs, nicht zum Gestalten.'); } },
  { schluessel: 'WhiteBalance.Auto', get titel() { return tr('Weißabgleich automatisch'); }, art: 'schalter', von: 0, bis: 1, schritt: 1, vorschau: null, get erklaerung() { return tr('Gleicht die Farbe des Lichts aus, damit Weiß weiß bleibt – morgens anders als mittags.'); } },
  { schluessel: 'Highlight Reduction.Enable', get titel() { return tr('Spitzlichter dämpfen'); }, art: 'schalter', von: 0, bis: 1, schritt: 1, vorschau: null, get erklaerung() { return tr('Rettet Zeichnung in ausgefressenen hellen Stellen – Himmel, Schnee, Sonnenreflexe auf dem Helm. Bei Gegenlicht der interessanteste Schalter.'); } },
  { schluessel: 'Tone Mapping.Enable', get titel() { return tr('Tone Mapping'); }, art: 'schalter', von: 0, bis: 1, schritt: 1, vorschau: null, get erklaerung() { return tr('Holt Schatten und Lichter gleichzeitig zurück. Macht kontrastreiche Bilder ausgewogener, kann aber flau wirken.'); } },
  { schluessel: 'Sharpness.Value', get titel() { return tr('Schärfe'); }, art: 'zahl', von: 0, bis: 100, schritt: 1, vorschau: null, get erklaerung() { return tr('Betont Kanten nach der Aufnahme. Zu viel erzeugt harte Ränder und verstärkt Rauschen. Lässt sich hier nicht vorab zeigen.'); } },
  { schluessel: 'Denoise.Value', get titel() { return tr('Rauschminderung'); }, art: 'zahl', von: 0, bis: 100, schritt: 1, vorschau: null, get erklaerung() { return tr('Glättet Bildrauschen, kostet aber Feinzeichnung. Lässt sich hier nicht vorab zeigen.'); } },
];

export const GRUPPEN: { id: string; titel: string; sub: string; icon: 'sunny-outline' | 'color-palette-outline' | 'contrast-outline' | 'aperture-outline'; schluessel: string[] }[] = [
  { id: 'exposure', get titel() { return tr('Belichtung'); }, get sub() { return tr('Wie hell das Bild wird'); }, icon: 'sunny-outline', schluessel: ['Exposure.Auto', 'Exposure.Value', 'Exposure.Auto Reference', 'Gain.Auto', 'Gain.Auto Max Value'] },
  { id: 'color', get titel() { return tr('Farbe'); }, get sub() { return tr('Farbkraft und Farbstich'); }, icon: 'color-palette-outline', schluessel: ['WhiteBalance.Auto', 'Saturation.Value', 'Hue.Value'] },
  { id: 'contrast', get titel() { return tr('Kontrast & Dynamik'); }, get sub() { return tr('Schatten, Lichter und Tiefe'); }, icon: 'contrast-outline', schluessel: ['Brightness.Value', 'Contrast.Value', 'Gamma.Value', 'Highlight Reduction.Enable', 'Tone Mapping.Enable'] },
  { id: 'sharp', get titel() { return tr('Schärfe & Rauschen'); }, get sub() { return tr('Feinzeichnung und Körnung'); }, icon: 'aperture-outline', schluessel: ['Sharpness.Value', 'Denoise.Value'] },
];

// Ab wann der Automat als nicht verbunden gilt (wie lib/cameraControl.ts im Web).
export const MAX_OFFLINE_MINUTEN = 15;

export function wertAus(werte: Kamerawerte | undefined, schluessel: string): number | null {
  const [eigenschaft, element] = schluessel.split('.');
  const roh = werte?.[eigenschaft]?.[element];
  return typeof roh === 'number' ? roh : null;
}

export function anzeige(e: Eigenschaft, wert: number): string {
  if (e.art === 'schalter') return wert ? 'an' : 'aus';
  if (e.schluessel === 'Exposure.Value') return `${(wert * 1000).toFixed(2).replace('.', ',')} ms`;
  return wert.toFixed(e.nachkommastellen ?? 0).replace('.', ',') + (e.einheit ?? '');
}

const NAMEN: Record<string, string> = {
  get Exposure() { return tr('Belichtung'); }, get Gain() { return tr('Verstärkung'); }, get Saturation() { return tr('Sättigung'); }, get Gamma() { return tr('Gamma'); }, get Brightness() { return tr('Helligkeit'); }, get Contrast() { return tr('Kontrast'); },
  get Hue() { return tr('Farbton'); }, get WhiteBalance() { return tr('Weißabgleich'); }, get 'Highlight Reduction'() { return tr('Spitzlichter dämpfen'); }, get 'Tone Mapping'() { return tr('Tone Mapping'); }, get Sharpness() { return tr('Schärfe'); }, get Denoise() { return tr('Rauschminderung'); },
};
export const nameLabel = (name: string) => NAMEN[name] ?? name;

export function istWert(werte: Kamerawerte, name: string): string {
  const eintrag = werte[name];
  if (!eintrag) return '—';
  const teile: string[] = [];
  const auto = eintrag['Auto'];
  const wert = eintrag['Value'];
  if (auto !== undefined) teile.push(auto ? tr('automatisch') : tr('von Hand'));
  if (typeof wert === 'number') teile.push(name === 'Exposure' ? `${(wert * 1000).toFixed(2).replace('.', ',')} ms` : String(Math.round(wert * 100) / 100).replace('.', ','));
  const enable = eintrag['Enable'] ?? eintrag['Enabled'];
  if (enable !== undefined && wert === undefined) teile.push(enable ? tr('an') : tr('aus'));
  if (eintrag['Auto Max Value'] !== undefined) teile.push(tr('höchstens {0}', eintrag['Auto Max Value']));
  if (eintrag['Auto Reference'] !== undefined) teile.push(tr('Sollwert {0}', eintrag['Auto Reference']));
  return teile.length ? teile.join(' · ') : '—';
}

// ---------------------------------------------------------------- Vorschau als Farbmatrix

type M = number[][]; // 5 x 5, letzte Zeile [0,0,0,0,1]
const ident = (): M => [0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4].map((c) => (r === c ? 1 : 0)));
const mul = (a: M, b: M): M => a.map((row) => [0, 1, 2, 3, 4].map((c) => row.reduce((s, v, k) => s + v * b[k][c], 0)));

function matrixFor(v: Vorschau, neu: number, alt: number): M {
  const m = ident();
  if (v.art === 'hell') {
    const f = v.faktor(neu, alt);
    m[0][0] = m[1][1] = m[2][2] = f;
  } else if (v.art === 'kontrast') {
    const c = v.faktor(neu, alt);
    m[0][0] = m[1][1] = m[2][2] = c;
    m[0][4] = m[1][4] = m[2][4] = 0.5 - 0.5 * c;
  } else if (v.art === 'saettigung') {
    const s = v.faktor(neu, alt);
    const rows = [
      [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
      [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
      [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s],
    ];
    rows.forEach((r, i) => r.forEach((x, j) => (m[i][j] = x)));
  } else {
    const rad = (v.grad(neu, alt) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rows = [
      [0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928],
      [0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.14, 0.072 - cos * 0.072 - sin * 0.283],
      [0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072],
    ];
    rows.forEach((r, i) => r.forEach((x, j) => (m[i][j] = x)));
  }
  return m;
}

/** Die 20 Werte für feColorMatrix, oder `null`, wenn sich am Bild nichts ändert. */
export function vorschauMatrix(geaendert: Eigenschaft[], entwurf: Record<string, number>, werte: Kamerawerte): string | null {
  let m = ident();
  let any = false;
  for (const e of geaendert) {
    const alt = wertAus(werte, e.schluessel);
    if (!e.vorschau || alt === null) continue;
    // Wie CSS-Filter nacheinander: die neue Matrix wirkt auf das schon veränderte Bild.
    m = mul(matrixFor(e.vorschau, entwurf[e.schluessel], alt), m);
    any = true;
  }
  if (!any) return null;
  return m
    .slice(0, 4)
    .map((row) => row.map((x) => Number(x.toFixed(4))).join(' '))
    .join(' ');
}

// ---------------------------------------------------------------- Aufträge

export async function cameraSend(parkId: string, machineConfigId: string, werte: Record<string, number>): Promise<void> {
  if (PREVIEW) return;
  try {
    await callShared('operator-liftpic-camera', { method: 'POST', body: { park_id: parkId, machine_config_id: machineConfigId, werte, neustart: true }, raw: true });
  } catch (e: any) {
    const abgelehnt = e?.body?.data?.abgelehnt as Record<string, string> | undefined;
    if (abgelehnt) throw new Error(tr('Abgelehnt: {0}', Object.entries(abgelehnt).map(([k, g]) => `${k} (${g})`).join(', ')));
    throw e;
  }
}

export async function triggerTestPhoto(parkId: string, machineConfigId: string): Promise<void> {
  if (PREVIEW) return;
  await callShared('operator-liftpic-assets', { method: 'PATCH', body: { park_id: parkId, machine_config_id: machineConfigId, mode: 'now', target: 'testphoto' }, raw: true });
}

/** Wie fetchCameraControlAvailable im Web: mindestens ein erreichbarer Automat meldet seine Kamera. */
export function cameraControlAvailable(machines: KameraAutomat[] | undefined): boolean {
  return (machines ?? []).some(
    (m) => !!m.camera_settings && !m.camera_settings.fehler && (m.offline_minutes == null || m.offline_minutes <= MAX_OFFLINE_MINUTEN),
  );
}

/** Einstellung aus dem CRM (park_page_settings): 'hidden' blendet die Kamera-Seite für den Kunden aus. */
export async function cameraPageSetting(parkId: string): Promise<'auto' | 'hidden'> {
  if (PREVIEW) return 'auto';
  try {
    const data = await callShared<{ camera_page?: string }>('operator-page-settings', { query: { park_id: parkId } });
    return data?.camera_page === 'hidden' ? 'hidden' : 'auto';
  } catch {
    // Function noch nicht deployt oder nicht erreichbar: bisheriges Verhalten.
    return 'auto';
  }
}
