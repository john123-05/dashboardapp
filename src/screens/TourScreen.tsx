import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { startCoach } from '../components/coach/Coach';
import { tapHaptic } from '../components/haptics';
import { Button } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { colors, font, radius, space } from '../theme';

export const TOUR_SEEN_KEY = 'lp-tour-seen-v2';

const POINTS: { icon: any; title: string; text: string }[] = [
  { icon: 'stats-chart-outline', title: 'Betrieb live', text: 'Umsatz, Fotos und Automaten in Echtzeit.' },
  { icon: 'megaphone-outline', title: 'Gäste gewinnen', text: 'Kontakte, Umfrage, E-Mails und Social Media.' },
  { icon: 'color-wand-outline', title: 'Dein Auftritt', text: 'Overlays, Kamera und Online-Shop selbst gestalten.' },
];

// Begrüßung beim ersten Start (und über „Rundgang starten“): danach führt der Rundgang Seite für Seite
// durch die echte App und hebt hervor, was man wo tun kann.
export function TourScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const insets = useSafeAreaInsets();
  const { fullName } = useAuth();
  const first = (fullName ?? '').trim().split(/\s+/)[0];
  const glow = useSharedValue(1);
  useEffect(() => {
    glow.value = withRepeat(withSequence(withTiming(1.08, { duration: 900 }), withTiming(1, { duration: 900 })), -1);
  }, [glow]);
  const halo = useAnimatedStyle(() => ({ transform: [{ scale: glow.value }], opacity: 2 - glow.value }));

  const later = () => {
    void AsyncStorage.setItem(TOUR_SEEN_KEY, '1');
    navigation.goBack();
  };
  const start = () => {
    tapHaptic();
    navigation.goBack();
    setTimeout(startCoach, 450);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <Pressable onPress={later} hitSlop={10} style={styles.skip}>
        <Text style={{ ...font.callout, color: colors.ink3, fontWeight: '600' }}>Später</Text>
      </Pressable>
      <View style={{ flex: 1, justifyContent: 'center', gap: space.xl, paddingHorizontal: space.xxl }}>
        <Animated.View entering={ZoomIn.duration(500).springify().damping(14)} style={{ alignSelf: 'flex-start' }}>
          <Animated.View style={[styles.halo, halo]} />
          <View style={styles.icon}>
            <Ionicons name="sparkles" size={40} color={colors.brand} />
          </View>
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(120).duration(450)} style={{ ...font.largeTitle, color: colors.ink }}>
          {first ? `Willkommen, ${first}!` : 'Willkommen bei Liftbase'}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(220).duration(450)} style={{ ...font.body, fontSize: 18, lineHeight: 26, color: colors.ink2 }}>
          In einer Minute zeigen wir dir jede Seite – direkt in der App, Schritt für Schritt.
        </Animated.Text>
        <View style={{ gap: 14 }}>
          {POINTS.map((p, k) => (
            <Animated.View key={p.title} entering={FadeInDown.delay(340 + k * 110).duration(420)} style={styles.point}>
              <View style={styles.pointIcon}>
                <Ionicons name={p.icon} size={20} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...font.headline, color: colors.ink }}>{p.title}</Text>
                <Text style={{ ...font.subhead, color: colors.ink2 }}>{p.text}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </View>
      <Animated.View entering={FadeInDown.delay(720).duration(420)} style={{ paddingHorizontal: space.xl, gap: 10 }}>
        <Button title="Rundgang starten" icon="play" onPress={start} />
        <Button title="Später" kind="plain" onPress={later} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  skip: { position: 'absolute', right: space.xl, top: 56, zIndex: 2, minHeight: 44, justifyContent: 'center' },
  halo: { position: 'absolute', left: -10, top: -10, right: -10, bottom: -10, borderRadius: 34, backgroundColor: colors.brandSoft },
  icon: { width: 84, height: 84, borderRadius: 24, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  point: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: colors.line },
  pointIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
});
