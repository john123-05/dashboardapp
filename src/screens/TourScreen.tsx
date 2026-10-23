import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { startCoach } from '../components/coach/Coach';
import { tapHaptic } from '../components/haptics';
import { Button } from '../components/ui';
import { colors, font, radius, space, TAP } from '../theme';
import { tr } from '../i18n';

export const TOUR_SEEN_KEY = 'lp-tour-seen-v2';

const POINTS: { icon: any; title: string; text: string }[] = [
  { icon: 'stats-chart-outline', get title() { return tr('Betrieb'); }, get text() { return tr('Umsatz, Fotos und Automaten in Echtzeit'); } },
  { icon: 'people-outline', get title() { return tr('Marketing'); }, get text() { return tr('Kontakte, Umfrage, E-Mails und Social Media'); } },
  { icon: 'color-wand-outline', get title() { return tr('Auftritt'); }, get text() { return tr('Overlays, Kamera und Online-Shop'); } },
];

// Begrüßung beim ersten Start (und über „Rundgang starten“): danach führt der Rundgang Seite für Seite
// durch die echte App und hebt hervor, was man wo tun kann.
export function TourScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const insets = useSafeAreaInsets();
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
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      {/* Animierte Hülle ohne Farben (dynamische Farben vertragen animierte Views nicht). */}
      <Animated.View entering={FadeIn.duration(350)} style={styles.content}>
        <View style={{ gap: space.xl }}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <View style={{ gap: 8 }}>
            <Text style={styles.title}>{tr('Willkommen bei Liftbase')}</Text>
            <Text style={styles.lead}>{tr('Ein kurzer Rundgang zeigt dir in etwa einer Minute, wo du was findest.')}</Text>
          </View>
          <View style={styles.list}>
            {POINTS.map((p, k) => (
              <View key={p.title} style={[styles.row, k < POINTS.length - 1 && styles.rowLine]}>
                <Ionicons name={p.icon} size={22} color={colors.ink2} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...font.headline, color: colors.ink }}>{p.title}</Text>
                  <Text style={{ ...font.subhead, color: colors.ink2 }}>{p.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Button title={tr('Rundgang starten')} onPress={start} />
          <Pressable onPress={later} style={styles.later} accessibilityRole="button">
            <Text style={{ ...font.callout, color: colors.ink2, fontWeight: '600' }}>{tr('Später')}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: space.xl, paddingTop: space.xxl, width: '100%', maxWidth: 520, alignSelf: 'center' },
  logo: { width: 56, height: 56, borderRadius: 13 },
  title: { ...font.largeTitle, color: colors.ink },
  lead: { ...font.body, fontSize: 17, lineHeight: 24, color: colors.ink2 },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space.lg, paddingVertical: 14 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineStrong },
  later: { minHeight: TAP, alignItems: 'center', justifyContent: 'center' },
});
