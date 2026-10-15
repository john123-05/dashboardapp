import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, type ReactNode } from 'react';
import { PREVIEW } from '../lib/preview';
import { Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, HEADER_HEIGHT, space, TAP } from '../theme';
import { tapHaptic } from './haptics';
import { HeaderActions } from './HeaderActions';
import { useWide } from './layout';

// Schwebende Tab-Leiste: Höhe plus Abstand zum unteren Rand.
export const TAB_BAR_HEIGHT = 62;
export const TAB_BAR_GAP = 8;

interface Props {
  title: string;
  subtitle?: string | null;
  right?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  // true: Seite liegt in der Tab-Leiste, unten bleibt Platz dafür (nichts wird abgeschnitten).
  tabs?: boolean;
  // Glocke und Konto-Symbol oben rechts (Hauptseiten).
  actions?: boolean;
  // Blatt-Seiten (von unten): grauer Hintergrund, Schließen statt Zurück.
  sheet?: boolean;
  children: ReactNode;
}

// Eine Seite wie in iOS: großer Titel, der beim Scrollen in eine durchsichtige Kopfzeile übergeht.
// Inhalt läuft unter der unscharfen Kopfzeile durch. Ziehen zum Aktualisieren, Gummiband-Scrollen
// und Rand-Wischen zurück kommen vom System.
export function Screen({ title, subtitle, right, onBack, backLabel = 'Zurück', refreshing, onRefresh, tabs, actions, sheet, children }: Props) {
  const realInsets = useSafeAreaInsets();
  const wide = useWide();
  // Als Blatt (iOS-Modal) liegt die Seite unter der Statusleiste: oben kein Abstand nötig.
  const insets = sheet ? { ...realInsets, top: 8 } : realInsets;
  const y = useSharedValue(0);
  const topInset = insets.top + HEADER_HEIGHT;
  const isIOS = Platform.OS === 'ios';
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // Nur Vorschau: nach 4 s ans Ende scrollen, um den unteren Rand zu prüfen.
  useEffect(() => {
    if (!PREVIEW || process.env.EXPO_PUBLIC_PREVIEW_SCROLL !== '1') return;
    const t = setTimeout(() => (scrollRef.current as any)?.scrollToEnd({ animated: false }), 4500);
    return () => clearTimeout(t);
  }, [scrollRef]);

  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y + (isIOS ? topInset : 0);
  });

  const smallTitle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [18, 46], [0, 1], 'clamp') }));
  const hairline = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [8, 30], [0, 1], 'clamp') }));
  const blurIn = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 16], [0.0, 1], 'clamp') }));

  const bottom = (tabs && !wide ? TAB_BAR_HEIGHT + TAB_BAR_GAP + 12 : 0) + insets.bottom + space.xl;
  const contentWidth = wide ? { width: '100%' as const, maxWidth: 1180, alignSelf: 'center' as const } : null;

  return (
    <View style={[styles.root, sheet && { backgroundColor: '#EEF0F3' }]}>
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInset={isIOS ? { top: topInset } : undefined}
        contentOffset={isIOS ? { x: 0, y: -topInset } : undefined}
        scrollIndicatorInsets={isIOS ? { top: topInset - insets.top + 0 } : undefined}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: isIOS ? 0 : topInset, paddingBottom: bottom }}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.ink3} progressViewOffset={topInset} /> : undefined}
      >
        <View style={[styles.titleRow, contentWidth, wide && { paddingHorizontal: space.xxl }]}>
          <View style={styles.titleCol}>
            <Text style={styles.largeTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
        <View style={[styles.body, contentWidth, wide && { paddingHorizontal: space.xxl }]}>{children}</View>
      </Animated.ScrollView>

      {/* Durchsichtige Kopfzeile: unscharfer Hintergrund, kleiner Titel blendet beim Scrollen ein. */}
      <View style={[styles.header, { height: topInset, paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, blurIn]} pointerEvents="none">
          <BlurView intensity={70} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[styles.hairline, hairline]} pointerEvents="none" />
        <View style={styles.headerRow} pointerEvents="box-none">
          <View style={styles.headerSide}>
            {onBack ? (
              <Pressable
                onPress={() => {
                  tapHaptic();
                  onBack();
                }}
                hitSlop={8}
                style={styles.back}
                accessibilityRole="button"
                accessibilityLabel={backLabel}
              >
                <Ionicons name="chevron-back" size={26} color={colors.brand} />
                <Text style={styles.backText} numberOfLines={1}>
                  {backLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Animated.Text style={[styles.smallTitle, smallTitle]} numberOfLines={1} pointerEvents="none">
            {title}
          </Animated.Text>
          <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{actions ? <HeaderActions /> : null}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.md, gap: space.md },
  titleCol: { flex: 1, minWidth: 0 },
  largeTitle: { ...font.largeTitle, color: colors.ink },
  subtitle: { ...font.subhead, color: colors.ink2, marginTop: 2 },
  right: { minHeight: TAP, justifyContent: 'center' },
  body: { paddingHorizontal: space.lg, gap: space.lg },
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
  hairline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  headerRow: { height: HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm },
  headerSide: { width: 110, justifyContent: 'center' },
  smallTitle: { flex: 1, textAlign: 'center', ...font.headline, color: colors.ink },
  back: { flexDirection: 'row', alignItems: 'center', minHeight: TAP, paddingRight: space.sm },
  backText: { ...font.body, color: colors.brand, marginLeft: -2 },
});
