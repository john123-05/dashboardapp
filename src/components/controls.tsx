import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import type { LayoutChangeEvent, TextInputProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, shadow, space, TAP } from '../theme';
import { successHaptic, tapHaptic } from './haptics';
import { TAB_BAR_HEIGHT } from './Screen';
import { useWide } from './layout';
import { tr } from '../i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Bausteine der Bearbeiten-Seiten (Kamera, Shop, CRM): Reiter zum Wischen, Hinweise, Schalter-Zeilen,
// Eingaben mit Sprache, Auswahlblatt, Speichern-Leiste und ein Regler mit Haptik.

/** Reiter in einer Zeile, seitlich wischbar, wenn sie nicht passen (z. B. die sechs CRM-Reiter). */
export function TabStrip<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; dot?: boolean; icon?: IconName }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }} style={{ flexGrow: 0 }}>
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <Pressable
            key={t.value}
            onPress={() => {
              if (on) return;
              tapHaptic();
              onChange(t.value);
            }}
            style={({ pressed }) => [styles.tab, on && styles.tabOn, pressed && !on && { opacity: 0.7 }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            {t.icon ? <Ionicons name={t.icon} size={15} color={on ? colors.onBrand : colors.ink2} /> : null}
            <Text style={[styles.tabText, on && { color: colors.onBrand }]}>{t.label}</Text>
            {t.dot ? <View style={[styles.tabDot, on && { backgroundColor: colors.onBrand }]} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Notice({ text, tone = 'ok', icon }: { text: string; tone?: 'ok' | 'info' | 'warn'; icon?: IconName }) {
  const bg = tone === 'ok' ? colors.okSoft : tone === 'warn' ? colors.warnSoft : colors.infoSoft;
  const fg = tone === 'ok' ? colors.ok : tone === 'warn' ? colors.warn : colors.info;
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Ionicons name={icon ?? (tone === 'ok' ? 'checkmark-circle' : tone === 'warn' ? 'warning' : 'information-circle')} size={18} color={fg} style={{ marginTop: 1 }} />
      <Text style={[styles.noticeText, { color: tone === 'warn' ? colors.ink : colors.ink }]}>{text}</Text>
    </View>
  );
}

/** Zeile mit iOS-Schalter. */
export function SwitchRow({ title, subtitle, value, onChange, disabled, last }: { title: string; subtitle?: string | null; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; last?: boolean }) {
  return (
    <View style={[styles.switchRow, disabled && { opacity: 0.5 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...font.body, color: colors.ink }}>{title}</Text>
        {subtitle ? <Text style={{ ...font.footnote, color: colors.ink2, marginTop: 1 }}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          tapHaptic();
          onChange(v);
        }}
        trackColor={{ true: colors.ok, false: undefined }}
      />
      {!last ? <View style={styles.rowLine} /> : null}
    </View>
  );
}

/** Mehrzeiliges oder einzeiliges Feld ohne Beschriftungs-Pflicht (für Listen in Karten). */
export function Input({ label, hint, style, multiline, ...rest }: TextInputProps & { label?: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.ink3}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' }, style]}
        autoCorrect={rest.autoCorrect ?? !rest.keyboardType}
        {...rest}
      />
      {hint ? <Text style={{ ...font.caption, color: colors.ink3, fontWeight: '400' }}>{hint}</Text> : null}
    </View>
  );
}

/** Text in Deutsch und Englisch (Gäste sehen ihre Sprache), wie LocalizedField im Web. */
export function LocalizedInput({ label, value, onChange, multiline }: { label: string; value: Record<string, string>; onChange: (v: Record<string, string>) => void; multiline?: boolean }) {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styles.label, { flex: 1 }]}>{label}</Text>
        <View style={styles.langSwitch}>
          {(['de', 'en'] as const).map((l) => (
            <Pressable key={l} onPress={() => { tapHaptic(); setLang(l); }} style={[styles.langBtn, lang === l && styles.langBtnOn]} hitSlop={6}>
              <Text style={[styles.langText, lang === l && { color: colors.ink }]}>
                {l.toUpperCase()}
                {value[l]?.trim() ? '' : ' ·'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <TextInput
        value={value[lang] ?? ''}
        onChangeText={(t) => onChange({ ...value, [lang]: t })}
        placeholder={lang === 'de' ? tr('Deutsch') : tr('English')}
        placeholderTextColor={colors.ink3}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 76, paddingTop: 12, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

/** Auswahl in drei Stufen, z. B. Pflicht / Freiwillig / Aus. */
export function Choice<T extends string>({ label, options, value, onChange }: { label?: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => { if (!on) { tapHaptic(); onChange(o.value); } }} style={[styles.chip, on && styles.chipOn]} accessibilityState={{ selected: on }}>
              {on ? <Ionicons name="checkmark" size={14} color={colors.brand} /> : null}
              <Text style={[styles.chipText, on && { color: colors.brand }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Auswahlliste als Blatt von unten (Schriftart, Fragetyp, Automat, ...). */
export function PickerSheet<T extends string>({ open, title, options, value, onPick, onClose }: { open: boolean; title: string; options: { value: T; label: string; sub?: string }[]; value?: T | null; onPick: (v: T) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.sheet }}>
        <View style={styles.sheetHead}>
          <Text style={{ ...font.headline, color: colors.ink, flex: 1 }}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} style={{ minHeight: TAP, justifyContent: 'center' }}>
            <Text style={{ ...font.body, color: colors.brand, fontWeight: '600' }}>{tr('Fertig')}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 24 }}>
          <View style={[styles.sheetList, shadow as object]}>
            {options.map((o, i) => (
              <Pressable
                key={o.value}
                onPress={() => {
                  tapHaptic();
                  onPick(o.value);
                  onClose();
                }}
                style={({ pressed }) => [styles.sheetItem, pressed && { backgroundColor: colors.fill }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ ...font.body, color: colors.ink }}>{o.label}</Text>
                  {o.sub ? <Text style={{ ...font.footnote, color: colors.ink2 }}>{o.sub}</Text> : null}
                </View>
                {o.value === value ? <Ionicons name="checkmark" size={20} color={colors.brand} /> : null}
                {i < options.length - 1 ? <View style={[styles.rowLine, { left: space.lg }]} /> : null}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Zeile, die ein Auswahlblatt öffnet. */
export function SelectRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => { tapHaptic(); onPress(); }} style={({ pressed }) => [styles.input, styles.select, pressed && { opacity: 0.7 }]}>
        <Text style={{ ...font.body, color: colors.ink, flex: 1 }} numberOfLines={1}>{value}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.ink3} />
      </Pressable>
    </View>
  );
}

/** Feste Leiste unten für ungespeicherte Änderungen (über der Tab-Leiste). */
export function SaveBar({ visible, text, saveLabel, onSave, onDiscard, busy, tabs }: { visible: boolean; text: string; saveLabel?: string; onSave: () => void; onDiscard?: () => void; busy?: boolean; tabs?: boolean }) {
  const insets = useSafeAreaInsets();
  const wide = useWide();
  if (!visible) return null;
  return (
    <View style={[styles.saveBar, { bottom: (tabs && !wide ? TAB_BAR_HEIGHT : 0) + insets.bottom + 10 }, shadow as object]} pointerEvents="box-none">
      <Text style={{ ...font.callout, color: colors.ink, flex: 1 }} numberOfLines={2}>{text}</Text>
      {onDiscard ? (
        <Pressable onPress={() => { tapHaptic(); onDiscard(); }} disabled={busy} style={styles.saveGhost} hitSlop={6}>
          <Text style={{ ...font.callout, color: colors.ink2, fontWeight: '600' }}>{tr('Verwerfen')}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={() => { if (!busy) { tapHaptic(); onSave(); } }} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}>
        {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={{ ...font.callout, color: colors.onBrand, fontWeight: '700' }}>{saveLabel ?? tr('Speichern')}</Text>}
      </Pressable>
    </View>
  );
}

/** Kleiner Knopf (Text oder Symbol) für Kartenköpfe und Zeilen. */
export function MiniButton({ title, icon, onPress, tone = 'plain', disabled, busy }: { title?: string; icon?: IconName; onPress: () => void; tone?: 'plain' | 'brand' | 'danger'; disabled?: boolean; busy?: boolean }) {
  const fg = tone === 'brand' ? colors.onBrand : tone === 'danger' ? colors.err : colors.ink;
  const bg = tone === 'brand' ? colors.brand : tone === 'danger' ? colors.errSoft : colors.fill;
  return (
    <Pressable
      onPress={() => { if (!disabled && !busy) { tapHaptic(); onPress(); } }}
      style={({ pressed }) => [styles.mini, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={title}
      hitSlop={4}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
      {title ? <Text style={{ ...font.footnote, fontWeight: '600', color: fg }} numberOfLines={1}>{title}</Text> : null}
    </Pressable>
  );
}

/**
 * Regler mit Daumen zum Ziehen oder Tippen auf die Spur, plus − / + für einzelne Schritte.
 * Haptik beim Einrasten auf dem Ausgangswert und an den Enden.
 */
export function Slider({ value, min, max, step, onChange, origin, accent = colors.brand }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; origin?: number; accent?: string }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const last = useRef(value);
  const ratio = (v: number) => (max === min ? 0 : (v - min) / (max - min));
  useEffect(() => {
    last.current = value;
    if (w) x.value = ratio(value) * w;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, w]);

  const emit = (px: number) => {
    if (!w) return;
    const raw = min + (Math.min(w, Math.max(0, px)) / w) * (max - min);
    const snapped = Math.min(max, Math.max(min, Math.round((raw - min) / step) * step + min));
    const v = Number(snapped.toFixed(6));
    if (v === last.current) return;
    const hitOrigin = origin !== undefined && ((last.current < origin && v >= origin) || (last.current > origin && v <= origin));
    if (hitOrigin || v === min || v === max) tapHaptic();
    last.current = v;
    onChange(v);
  };
  // Waagerecht ziehen bewegt den Regler, senkrecht bleibt der Seite zum Scrollen; Tippen springt.
  const pan = Gesture.Pan()
    .activeOffsetX([-4, 4])
    .failOffsetY([-10, 10])
    .onStart((e) => {
      x.value = Math.min(w, Math.max(0, e.x));
      runOnJS(emit)(e.x);
    })
    .onUpdate((e) => {
      x.value = Math.min(w, Math.max(0, e.x));
      runOnJS(emit)(e.x);
    });
  const tap = Gesture.Tap().onEnd((e) => {
    x.value = Math.min(w, Math.max(0, e.x));
    runOnJS(emit)(e.x);
  });
  const gesture = Gesture.Exclusive(pan, tap);
  const fill = useAnimatedStyle(() => ({ width: x.value }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - 14 }] }));
  const nudge = (dir: -1 | 1) => {
    const v = Number(Math.min(max, Math.max(min, value + dir * step)).toFixed(6));
    if (v !== value) {
      tapHaptic();
      onChange(v);
    }
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable onPress={() => nudge(-1)} disabled={value <= min} style={[styles.nudge, value <= min && { opacity: 0.35 }]} accessibilityLabel={tr('Weniger')} hitSlop={6}>
        <Ionicons name="remove" size={18} color={colors.ink} />
      </Pressable>
      <GestureDetector gesture={gesture}>
        <View style={styles.track} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} accessibilityRole="adjustable">
          <View style={styles.rail} />
          {origin !== undefined && w ? <View style={[styles.originMark, { left: ratio(origin) * w - 1 }]} /> : null}
          <Animated.View style={[styles.railFill, fill]}>
            <View style={{ flex: 1, borderRadius: 3, backgroundColor: accent }} />
          </Animated.View>
          <Animated.View style={[styles.thumb, thumb]}>
            <View style={[styles.thumbInner, shadow as object]} />
          </Animated.View>
        </View>
      </GestureDetector>
      <Pressable onPress={() => nudge(1)} disabled={value >= max} style={[styles.nudge, value >= max && { opacity: 0.35 }]} accessibilityLabel={tr('Mehr')} hitSlop={6}>
        <Ionicons name="add" size={18} color={colors.ink} />
      </Pressable>
    </View>
  );
}

/** Kurzer Erfolg mit Haptik, z. B. nach dem Speichern. */
export function useSavedFlag() {
  const [saved, setSaved] = useState(false);
  return {
    saved,
    mark: () => {
      successHaptic();
      setSaved(true);
    },
    reset: () => setSaved(false),
  };
}

/** Kleine Kopfzeile in einer Karte: Titel, Unterzeile, rechts Aktion. */
export function CardHead({ title, sub, right }: { title: string; sub?: string | null; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...font.headline, color: colors.ink }}>{title}</Text>
        {sub ? <Text style={{ ...font.footnote, color: colors.ink2, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** Balken für Verteilungen (Umfrage, Kanäle). */
export function Bars({ items, labelWidth = 92 }: { items: { label: string; count: number; color?: string }[]; labelWidth?: number }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <View style={{ gap: 7 }}>
      {items.map((it, i) => (
        <View key={`${it.label}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ ...font.footnote, color: colors.ink2, width: labelWidth, textAlign: 'right' }} numberOfLines={1}>{it.label}</Text>
          <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.fill, overflow: 'hidden' }}>
            <View style={{ width: `${(it.count / max) * 100}%`, height: 10, borderRadius: 5, backgroundColor: it.color ?? colors.brand }} />
          </View>
          <Text style={{ ...font.footnote, color: colors.ink, fontWeight: '700', width: 34, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{it.count}</Text>
        </View>
      ))}
    </View>
  );
}

export const controlStyles = StyleSheet.create({
  label: { ...font.footnote, color: colors.ink2, fontWeight: '600', marginLeft: 2 },
});

const styles = StyleSheet.create({
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.fill },
  tabOn: { backgroundColor: colors.brand },
  tabText: { ...font.footnote, fontWeight: '600', color: colors.ink2 },
  tabDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.ok },
  notice: { flexDirection: 'row', gap: 8, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10 },
  noticeText: { ...font.footnote, flex: 1 },
  switchRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: colors.card },
  rowLine: { position: 'absolute', left: space.lg, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  label: { ...font.footnote, color: colors.ink2, fontWeight: '600', marginLeft: 2 },
  input: { minHeight: 50, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: space.md, paddingVertical: 10, ...font.body, fontSize: 16, color: colors.ink },
  select: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langSwitch: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: 8, padding: 2 },
  langBtn: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6 },
  langBtnOn: { backgroundColor: colors.white },
  langText: { fontSize: 11, fontWeight: '700', color: colors.ink3 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.white },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  chipText: { ...font.footnote, fontWeight: '600', color: colors.ink2 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: 14, paddingBottom: 6 },
  sheetList: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  sheetItem: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 10 },
  saveBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.lg, paddingLeft: space.lg, paddingRight: 8, paddingVertical: 8, borderWidth: 1, borderColor: colors.line },
  saveBtn: { minHeight: 44, minWidth: 110, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  saveGhost: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 34, paddingHorizontal: 11, borderRadius: 10 },
  nudge: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 40, justifyContent: 'center' },
  rail: { height: 6, borderRadius: 3, backgroundColor: colors.fill },
  railFill: { position: 'absolute', left: 0, height: 6 },
  originMark: { position: 'absolute', width: 2, height: 14, borderRadius: 1, backgroundColor: colors.ink3 },
  thumb: { position: 'absolute', left: 0, width: 28, height: 28 },
  thumbInner: { flex: 1, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.15)' },
});

const pad = (n: number) => String(n).padStart(2, '0');
export const formatDeDateTime = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** "TT.MM.JJJJ HH:MM" (Uhrzeit optional) in ISO; leer = null, ungültig = undefined. */
export function parseDeDateTime(text: string): string | null | undefined {
  const t = text.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:[ ,]+(\d{1,2})[:.](\d{2}))?$/);
  if (!m) return undefined;
  const year = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
  const d = new Date(year, Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0));
  return Number.isNaN(d.getTime()) || d.getDate() !== Number(m[1]) ? undefined : d.toISOString();
}

/** Datum mit Uhrzeit als Text plus schnelle Vorschläge (ohne nativen Datums-Wähler). */
export function DateTimeInput({ label, value, onChange, quick = [] }: { label: string; value: string | null; onChange: (iso: string | null) => void; quick?: { label: string; iso: string | null }[] }) {
  const [text, setText] = useState(formatDeDateTime(value));
  const [bad, setBad] = useState(false);
  // Nur von außen geänderte Werte übernehmen, sonst springt der Text beim Tippen.
  useEffect(() => {
    if (parseDeDateTime(text) === value) return;
    setText(formatDeDateTime(value));
    setBad(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          const iso = parseDeDateTime(t);
          setBad(iso === undefined);
          if (iso !== undefined) onChange(iso);
        }}
        placeholder={tr('TT.MM.JJJJ HH:MM')}
        placeholderTextColor={colors.ink3}
        keyboardType="numbers-and-punctuation"
        style={[styles.input, bad && { borderColor: colors.err }]}
      />
      {quick.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {quick.map((q) => (
            <Pressable key={q.label} onPress={() => { tapHaptic(); onChange(q.iso); }} style={[styles.chip, { minHeight: 30 }]}>
              <Text style={styles.chipText}>{q.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {bad ? <Text style={{ ...font.caption, color: colors.err }}>{tr('Bitte so eingeben: 24.12.2026 18:00')}</Text> : null}
    </View>
  );
}
