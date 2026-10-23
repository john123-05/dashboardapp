import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, shadow, space } from '../../theme';
import { successHaptic, tapHaptic } from '../haptics';
import { tr } from '../../i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Geführter Rundgang mit Spotlight: der Rundgang öffnet jede Seite wirklich, dunkelt sie ab und hebt
// das Bedienelement hervor, um das es gerade geht. Seiten melden ihre Bereiche mit <CoachTarget id="…">.

const targets = new Map<string, View>();

/** Bereich, den der Rundgang hervorheben kann. Ändert am Aussehen nichts. */
export function CoachTarget({ id, children, style }: { id: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<View>(null);
  useEffect(() => {
    const v = ref.current;
    if (v) targets.set(id, v);
    return () => {
      if (targets.get(id) === v) targets.delete(id);
    };
  }, [id]);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

export type CoachStep = {
  /** Seite im Navigator; `tab`: Hauptseite in der Tab-Leiste. */
  route: string;
  tab?: boolean;
  params?: object;
  target?: string;
  title: string;
  text: string;
  icon: IconName;
};

export const startCoach = () => DeviceEventEmitter.emit('lp-coach', true);

type Rect = { x: number; y: number; w: number; h: number };

function measure(id: string | undefined): Promise<Rect | null> {
  return new Promise((resolve) => {
    const v = id ? targets.get(id) : undefined;
    if (!v) return resolve(null);
    v.measureInWindow((x, y, w, h) => resolve(w > 0 && h > 0 ? { x, y, w, h } : null));
  });
}

const PAD = 8;
const EASE = Easing.bezier(0.25, 0.8, 0.25, 1);

export function CoachOverlay({ steps, go, onFinish }: { steps: CoachStep[]; go: (s: CoachStep) => void; onFinish: () => void }) {
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const x = useSharedValue(W / 2);
  const y = useSharedValue(H / 2);
  const w = useSharedValue(0);
  const h = useSharedValue(0);
  const dim = useSharedValue(0);
  const pulse = useSharedValue(1);
  const seq = useRef(0);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('lp-coach', (on: boolean) => {
      setI(0);
      setActive(on);
    });
    return () => sub.remove();
  }, []);

  const show = useCallback(
    async (k: number) => {
      const step = steps[k];
      if (!step) return;
      const mine = ++seq.current;
      go(step);
      // Warten, bis die Seite steht (Einschieben, Laden der ersten Daten).
      await new Promise((r) => setTimeout(r, 650));
      let r = await measure(step.target);
      if (!r) {
        await new Promise((res) => setTimeout(res, 500));
        r = await measure(step.target);
      }
      if (mine !== seq.current) return;
      // Ziele unter dem Rand (lange Seiten) nur bis zur Bildschirmmitte zeigen.
      if (r && r.y + r.h > H - 40) r = { ...r, h: Math.max(60, H - 40 - r.y) };
      setRect(r);
      const t = { duration: 420, easing: EASE };
      if (r) {
        x.value = withTiming(r.x - PAD, t);
        y.value = withTiming(r.y - PAD, t);
        w.value = withTiming(r.w + PAD * 2, t);
        h.value = withTiming(r.h + PAD * 2, t);
      } else {
        x.value = withTiming(W / 2, t);
        y.value = withTiming(H / 2, t);
        w.value = withTiming(0, t);
        h.value = withTiming(0, t);
      }
    },
    [steps, go, H, W, x, y, w, h],
  );

  useEffect(() => {
    if (!active) {
      dim.value = withTiming(0, { duration: 200 });
      return;
    }
    dim.value = withTiming(1, { duration: 300 });
    pulse.value = withRepeat(withSequence(withTiming(1.06, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
    void show(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, i, W, H]);

  const top = useAnimatedStyle(() => ({ opacity: dim.value, height: Math.max(0, y.value) }));
  const bottom = useAnimatedStyle(() => ({ opacity: dim.value, top: y.value + h.value }));
  const left = useAnimatedStyle(() => ({ opacity: dim.value, top: y.value, height: h.value, width: Math.max(0, x.value) }));
  const right = useAnimatedStyle(() => ({ opacity: dim.value, top: y.value, height: h.value, left: x.value + w.value }));
  const ring = useAnimatedStyle(() => ({ opacity: w.value > 0 ? dim.value : 0, left: x.value, top: y.value, width: w.value, height: h.value, transform: [{ scale: pulse.value }] }));

  if (!active) return null;
  const step = steps[i];
  if (!step) return null;
  const last = i === steps.length - 1;
  const below = !rect || rect.y + rect.h / 2 < H / 2;
  const cardW = Math.min(520, W - space.lg * 2);
  const cardPos = rect
    ? below
      ? { top: Math.min(rect.y + rect.h + PAD + 14, H - insets.bottom - 230) }
      : { bottom: Math.max(H - rect.y + PAD + 14, insets.bottom + 16) }
    : { top: H / 2 - 120 };

  const end = () => {
    seq.current++;
    setActive(false);
    setRect(null);
    onFinish();
  };
  const next = () => {
    if (last) {
      successHaptic();
      return end();
    }
    tapHaptic();
    setI((k) => k + 1);
  };
  const back = () => {
    if (i === 0) return;
    tapHaptic();
    setI((k) => k - 1);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Abdunkeln aus vier Teilen, damit das Ziel frei bleibt. */}
      <Animated.View style={[styles.dim, { left: 0, right: 0, top: 0 }, top]} />
      <Animated.View style={[styles.dim, { left: 0, right: 0, bottom: 0 }, bottom]} />
      <Animated.View style={[styles.dim, { left: 0 }, left]} />
      <Animated.View style={[styles.dim, { right: 0 }, right]} />
      <Animated.View style={[styles.ring, ring]} pointerEvents="none" />
      {/* Fängt Berührungen im freien Feld ab, damit niemand mitten im Rundgang wegnavigiert. */}
      {rect ? <View style={{ position: 'absolute', left: rect.x - PAD, top: rect.y - PAD, width: rect.w + PAD * 2, height: rect.h + PAD * 2 }} /> : null}

      {/* Animierte Hülle nur für Lage und Bewegung; Farben im inneren View (dynamische Farben vertragen animierte Views nicht). */}
      <Animated.View key={i} entering={FadeInDown.duration(320).springify().damping(18)} exiting={FadeOut.duration(120)} style={[styles.cardPos, { left: (W - cardW) / 2, width: cardW }, cardPos]}>
        <View style={[styles.card, shadow as object]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ ...font.caption, color: colors.ink3, flex: 1, fontVariant: ['tabular-nums'] }}>
            {i + 1} / {steps.length}
          </Text>
          <Pressable onPress={end} hitSlop={10} accessibilityLabel={tr('Rundgang beenden')}>
            <Ionicons name="close" size={20} color={colors.ink3} />
          </Pressable>
        </View>
        <Text style={{ ...font.headline, fontSize: 19, color: colors.ink }}>{step.title}</Text>
        <Text style={{ ...font.subhead, color: colors.ink2 }}>{step.text}</Text>
        <View style={styles.progress}>
          <View style={{ width: `${((i + 1) / steps.length) * 100}%`, height: 4, borderRadius: 2, backgroundColor: colors.brand }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {i > 0 ? (
            <Pressable onPress={back} style={({ pressed }) => [styles.btn, styles.btnPlain, pressed && { opacity: 0.75 }]}>
              <Text style={{ ...font.callout, color: colors.ink, fontWeight: '600' }}>{tr('Zurück')}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={next} style={({ pressed }) => [styles.btn, styles.btnBrand, pressed && { opacity: 0.85 }]}>
            <Text style={{ ...font.callout, color: colors.onBrand, fontWeight: '700' }}>{last ? tr('Los geht’s') : tr('Weiter')}</Text>
            {!last ? <Ionicons name="arrow-forward" size={16} color={colors.onBrand} /> : null}
          </Pressable>
        </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: 'rgba(8,12,20,0.62)' },
  ring: { position: 'absolute', borderRadius: radius.lg, borderWidth: 3, borderColor: '#F59E5B' },
  cardPos: { position: 'absolute' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  progress: { height: 4, borderRadius: 2, backgroundColor: colors.fill, overflow: 'hidden' },
  btn: { flex: 1, minHeight: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnPlain: { backgroundColor: colors.fill },
  btnBrand: { backgroundColor: colors.brand },
});
