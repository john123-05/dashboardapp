import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { colors, font, radius, shadow, space, TAP } from '../theme';
import { tapHaptic } from './haptics';
import { useWide } from './layout';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return <View style={[styles.card, padded && styles.cardPad, style]}>{children}</View>;
}

export function Section({ title, action, onAction, children }: { title?: string; action?: string; onAction?: () => void; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      {title ? (
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            {title}
          </Text>
          {action && onAction ? (
            <Pressable onPress={onAction} hitSlop={10} style={styles.sectionAction} accessibilityRole="button">
              <Text style={styles.sectionActionText} numberOfLines={1}>
                {action}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// Zahlenkachel. Alles einzeilig: zu lange Werte werden kleiner statt umzubrechen.
export function Kpi({ label, value, sub, tone, icon }: { label: string; value: string; sub?: string | null; tone?: 'ok' | 'warn' | 'err'; icon?: IconName }) {
  const subColor = tone === 'ok' ? colors.ok : tone === 'warn' ? colors.warn : tone === 'err' ? colors.err : colors.ink2;
  return (
    <View style={styles.kpi}>
      <View style={styles.kpiLabelRow}>
        {icon ? <Ionicons name={icon} size={14} color={colors.ink3} /> : null}
        <Text style={styles.kpiLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
        {value}
      </Text>
      {sub ? (
        <Text style={[styles.kpiSub, { color: subColor }]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function KpiGrid({ children, columns }: { children: ReactNode; columns?: number }) {
  const wide = useWide();
  const n = columns ?? (wide ? 4 : 2);
  const basis = `${Math.floor(100 / n) - 2}%`;
  return (
    <View style={styles.kpiGrid}>
      {Array.isArray(children)
        ? children.map((c, i) => (c ? <View key={i} style={{ flexBasis: basis as any, flexGrow: 1, minWidth: 0 }}>{c}</View> : null))
        : children}
    </View>
  );
}

// Listenzeile: mindestens 52 pt hoch, ganze Zeile antippbar, Rückmeldung beim Drücken.
export function Row({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  right,
  onPress,
  chevron,
  last,
  badge,
  subtitleLines = 1,
  titleLines = 1,
}: {
  icon?: IconName;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string | null;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
  badge?: string | null;
  subtitleLines?: number;
  titleLines?: number;
}) {
  const content = (pressed: boolean) => (
    <View style={[styles.row, pressed && styles.rowPressed]}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: iconBg ?? colors.brandSoft }]}>
          <Ionicons name={icon} size={18} color={iconColor ?? colors.brand} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={titleLines}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSub} numberOfLines={subtitleLines}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {right ? <View style={styles.rowRight}>{right}</View> : null}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.ink3} /> : null}
      {!last ? <View style={[styles.rowLine, { left: icon ? 60 : space.lg }]} /> : null}
    </View>
  );
  if (!onPress) return content(false);
  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      accessibilityRole="button"
    >
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

export function ListCard({ children }: { children: ReactNode }) {
  return <View style={[styles.card, { overflow: 'hidden' }]}>{children}</View>;
}

export function Pill({ text, tone = 'neutral', icon }: { text: string; tone?: 'ok' | 'warn' | 'err' | 'info' | 'neutral'; icon?: IconName }) {
  const map = {
    ok: [colors.okSoft, colors.ok],
    warn: [colors.warnSoft, colors.warn],
    err: [colors.errSoft, colors.err],
    info: [colors.infoSoft, colors.info],
    neutral: [colors.fill, colors.ink2],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={[styles.pillText, { color: fg }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

// iOS-Umschalter mit gleitender Markierung.
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const [width, setWidth] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const seg = width > 0 ? (width - 4) / options.length : 0;
  useEffect(() => {
    x.value = withSpring(idx * seg, { damping: 20, stiffness: 260, mass: 0.7 });
  }, [idx, seg, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={styles.segmented} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {seg > 0 ? (
        <Animated.View style={[styles.segPillPos, { width: seg }, pill]}>
          <View style={styles.segPill} />
        </Animated.View>
      ) : null}
      {options.map((o) => (
        <Pressable
          key={o.value}
          style={styles.segItem}
          onPress={() => {
            if (o.value !== value) {
              tapHaptic();
              onChange(o.value);
            }
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
        >
          <Text style={[styles.segText, o.value === value && styles.segTextActive]} numberOfLines={1}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Skeleton({ height = 16, width = '100%', radius: r = 8, style }: { height?: number; width?: number | string; radius?: number; style?: StyleProp<ViewStyle> }) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.5, { duration: 700 })), -1);
  }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  // Farbe im inneren View: animierte Views vertragen keine dynamischen Hell/Dunkel-Farben.
  return (
    <Animated.View style={[{ height, width: width as any }, a, style]}>
      <View style={{ flex: 1, borderRadius: r, backgroundColor: colors.fill }} />
    </Animated.View>
  );
}

export function KpiSkeleton() {
  return (
    <KpiGrid>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.kpi}>
          <Skeleton height={12} width="50%" />
          <Skeleton height={28} width="70%" style={{ marginTop: 10 }} />
        </View>
      ))}
    </KpiGrid>
  );
}

export function EmptyState({ icon = 'sparkles-outline', title, text }: { icon?: IconName; title: string; text?: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={30} color={colors.ink3} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    </View>
  );
}

export function ErrorNote({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <View style={styles.error}>
      <Ionicons name="alert-circle" size={18} color={colors.err} />
      <Text style={styles.errorText} numberOfLines={3}>
        {text}
      </Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={10} style={{ minHeight: TAP, justifyContent: 'center' }}>
          <Text style={styles.errorRetry}>Erneut</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Button({ title, onPress, loading, kind = 'primary', icon }: { title: string; onPress: () => void; loading?: boolean; kind?: 'primary' | 'plain' | 'danger'; icon?: IconName }) {
  const bg = kind === 'primary' ? colors.brand : kind === 'danger' ? colors.errSoft : colors.fill;
  const fg = kind === 'primary' ? colors.onBrand : kind === 'danger' ? colors.err : colors.ink;
  return (
    <Pressable
      onPress={() => {
        if (loading) return;
        tapHaptic();
        onPress();
      }}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: pressed ? 0.8 : 1 }]}
      accessibilityRole="button"
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, ...(shadow as object) },
  cardPad: { padding: space.lg },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xs, minHeight: 28 },
  sectionTitle: { ...font.headline, color: colors.ink, flexShrink: 1 },
  sectionAction: { minHeight: TAP, justifyContent: 'center', paddingLeft: space.md },
  sectionActionText: { ...font.callout, color: colors.brand },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  kpi: { flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: 2, ...(shadow as object) },
  kpiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kpiLabel: { ...font.footnote, color: colors.ink2, flexShrink: 1 },
  kpiValue: { ...font.kpi, color: colors.ink, marginTop: 4 },
  kpiSub: { ...font.caption, marginTop: 2 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.md, backgroundColor: colors.card },
  rowPressed: { backgroundColor: colors.fill },
  rowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { ...font.body, color: colors.ink },
  rowSub: { ...font.footnote, color: colors.ink2, marginTop: 1 },
  rowRight: { flexShrink: 0, alignItems: 'flex-end', maxWidth: '45%' },
  rowLine: { position: 'absolute', right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.onBrand, fontSize: 12, fontWeight: '700' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600' },
  segmented: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: 11, padding: 2, minHeight: 36 },
  segPillPos: { position: 'absolute', top: 2, bottom: 2, left: 2 },
  segPill: { flex: 1, borderRadius: 9, backgroundColor: colors.white, ...(shadow as object) },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 32, paddingHorizontal: 4 },
  segText: { ...font.footnote, color: colors.ink2, fontWeight: '600' },
  segTextActive: { color: colors.ink },
  empty: { alignItems: 'center', gap: 6, paddingVertical: space.xxl, paddingHorizontal: space.xl },
  emptyTitle: { ...font.headline, color: colors.ink, textAlign: 'center' },
  emptyText: { ...font.subhead, color: colors.ink2, textAlign: 'center' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.errSoft, borderRadius: radius.md, paddingLeft: space.md, paddingRight: space.sm, paddingVertical: space.sm },
  errorText: { ...font.footnote, color: colors.err, flex: 1 },
  errorRetry: { ...font.callout, color: colors.err, paddingHorizontal: space.sm },
  button: { minHeight: 50, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: space.lg },
  buttonText: { ...font.headline },
});
