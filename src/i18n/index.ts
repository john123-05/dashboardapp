import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { getLocales } from 'expo-localization';
import { Platform } from 'react-native';
import en from './en';
import es from './es';
import fr from './fr';
import it from './it';
import lv from './lv';
import nl from './nl';

// Sprachen wie im Web-Dashboard (src/lib/i18n.tsx). Der deutsche Text ist zugleich der Schlüssel: tr('Umsatz')
// liefert die Übersetzung oder, wenn es keine gibt, den deutschen Text. Platzhalter {0}, {1} … werden
// mit den weiteren Argumenten gefüllt, z. B. tr('{0} Antworten', n).
export type Language = 'de' | 'en' | 'es' | 'fr' | 'it' | 'nl' | 'lv';
export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'lv', label: 'Latviešu' },
];
const DICTS: Record<Exclude<Language, 'de'>, Record<string, string>> = { en, es, fr, it, nl, lv };
const LOCALE_TAGS: Record<Language, string> = { de: 'de-DE', en: 'en-GB', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', nl: 'nl-NL', lv: 'lv-LV' };
const STORAGE_KEY = 'app_language';
const PICKED_KEY = 'app_language_picked';

let current: Language = 'de';
let chosen: Language | null = null;
let picked = false;

const isSupported = (v: string | null | undefined): v is Language => !!v && LANGUAGES.some((l) => l.value === v);

/** Sprachen des Geräts in der Reihenfolge der Vorliebe. */
function deviceLanguages(): string[] {
  const out: string[] = [];
  // expo-localization liest die bevorzugten Sprachen des Systems (iOS: Locale.preferredLanguages).
  // NativeModules.SettingsManager gibt es in der neuen Architektur nicht, und Hermes' Intl liefert dort
  // immer en-US – darum nur noch als Rückfall.
  try {
    for (const l of getLocales()) out.push(l.languageTag);
  } catch {
    // ohne Modul (Web-Vorschau) bleibt es bei den Angaben unten
  }
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') out.push(...(navigator.languages ?? [navigator.language]));
  try {
    out.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // ohne Intl bleibt es bei den Angaben oben
  }
  return out;
}

/** Wie im Web: eigene Wahl, sonst die erste unterstützte Gerätesprache, sonst Englisch. */
export function detectLanguage(): Language {
  for (const l of deviceLanguages()) {
    const base = l?.slice(0, 2).toLowerCase();
    if (isSupported(base)) return base;
  }
  return 'en';
}

/** Vor dem ersten Rendern aufrufen (index.ts), damit auch Texte in Konstanten gleich stimmen. */
export async function initLanguage(): Promise<void> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  chosen = isSupported(stored) ? stored : null;
  current = chosen ?? detectLanguage();
  picked = chosen !== null || (await AsyncStorage.getItem(PICKED_KEY).catch(() => null)) === '1';
}

/** Hat jemand auf diesem Gerät schon einmal eine Sprache gewählt (Sprachauswahl vor der Anmeldung)? */
export const hasPickedLanguage = () => picked;
export async function markLanguagePicked(): Promise<void> {
  picked = true;
  await AsyncStorage.setItem(PICKED_KEY, '1').catch(() => undefined);
}

export const getLanguage = () => current;
/** null = Sprache des Geräts. */
export const getChosenLanguage = () => chosen;
export const localeTag = () => LOCALE_TAGS[current];

const listeners = new Set<() => void>();
export function onLanguageChange(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Sprache wählen (null = wie das Gerät). Die App zeichnet danach alles neu. */
export async function setLanguage(lang: Language | null): Promise<void> {
  chosen = lang;
  current = lang ?? detectLanguage();
  if (lang) await AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => undefined);
  else await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  listeners.forEach((fn) => fn());
}

/** Text in einer bestimmten Sprache, unabhängig von der eingestellten (z. B. für die Sprachauswahl). */
export function trIn(lang: Language, text: string): string {
  return lang === 'de' ? text : DICTS[lang][text] ?? text;
}

export function tr(text: string, ...args: (string | number | null | undefined)[]): string {
  const out = current === 'de' ? text : DICTS[current][text] ?? text;
  return args.length ? out.replace(/\{(\d+)\}/g, (m, i) => (args[Number(i)] === undefined || args[Number(i)] === null ? '' : String(args[Number(i)]))) : out;
}

/** Aktuelle Sprache; Komponenten mit diesem Hook zeichnen sich bei einem Wechsel neu. */
export const useLanguage = () => useSyncExternalStore(onLanguageChange, getLanguage);

/** Markiert Texte für die Übersetzungsliste, ohne sie schon zu übersetzen (z. B. in Tabellen auf
 *  Modulebene); übersetzt wird beim Anzeigen mit tr(wert). */
export const N_ = (text: string) => text;

// Bis initLanguage() die gespeicherte Wahl gelesen hat, gilt die Gerätesprache.
current = detectLanguage();
