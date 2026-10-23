import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tapHaptic } from '../components/haptics';
import { Button } from '../components/ui';
import { detectLanguage, LANGUAGES, markLanguagePicked, N_, setLanguage, trIn, type Language } from '../i18n';
import { colors, font, radius, space, TAP } from '../theme';

const HELLO = N_('Willkommen bei Liftbase');
const CHOOSE = N_('Wähle deine Sprache');
const NEXT = N_('Weiter');

// Erster Bildschirm vor der Anmeldung: Sprache wählen (Liste mit allen Sprachen). Die Begrüßung wechselt
// durch alle Sprachen, bis jemand eine auswählt; danach steht alles in der gewählten Sprache.
export function LanguageScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [sel, setSel] = useState<Language>(() => detectLanguage());
  const [touched, setTouched] = useState(false);
  const [k, setK] = useState(() => Math.max(0, LANGUAGES.findIndex((l) => l.value === detectLanguage())));

  useEffect(() => {
    if (touched) return;
    const t = setInterval(() => setK((n) => (n + 1) % LANGUAGES.length), 2600);
    return () => clearInterval(t);
  }, [touched]);

  const shown: Language = touched ? sel : LANGUAGES[k].value;
  const pick = (l: Language) => {
    tapHaptic();
    setSel(l);
    setTouched(true);
  };
  const next = async () => {
    tapHaptic();
    await setLanguage(sel);
    await markLanguagePicked();
    onDone();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <Animated.View entering={FadeIn.duration(350)} style={styles.content}>
        <ScrollView contentContainerStyle={{ gap: space.xl, paddingTop: space.xxl }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Image source={require('../../assets/icon.png')} style={styles.logo} />

          {/* Feste Höhe, damit beim Wechsel der Sprache nichts springt. Animierte Hülle ohne Farben. */}
          <View style={styles.headline}>
            <Animated.View key={shown} entering={FadeInDown.duration(420)} exiting={FadeOutUp.duration(260)} style={{ gap: 8 }}>
              <Text style={styles.title}>{trIn(shown, HELLO)}</Text>
              <Text style={styles.lead}>{trIn(shown, CHOOSE)}</Text>
            </Animated.View>
          </View>

          {/* Alle Sprachen gleich sichtbar, die gewählte mit Haken. */}
          <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={trIn(sel, CHOOSE)}>
            {LANGUAGES.map((l, i) => (
              <Pressable
                key={l.value}
                onPress={() => pick(l.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: l.value === sel }}
                style={({ pressed }) => [styles.row, i < LANGUAGES.length - 1 && styles.rowLine, pressed && { backgroundColor: colors.fill }]}
              >
                <Text style={{ ...font.body, color: colors.ink, flex: 1, fontWeight: l.value === sel ? '600' : '400' }}>{l.label}</Text>
                {l.value === sel ? <Ionicons name="checkmark" size={20} color={colors.brand} /> : null}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Button title={trIn(sel, NEXT)} onPress={() => void next()} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, justifyContent: 'space-between', gap: space.lg, paddingHorizontal: space.xl, width: '100%', maxWidth: 440, alignSelf: 'center' },
  logo: { width: 56, height: 56, borderRadius: 13 },
  headline: { minHeight: 120, justifyContent: 'flex-start' },
  title: { ...font.largeTitle, color: colors.ink },
  lead: { ...font.body, fontSize: 17, lineHeight: 24, color: colors.ink2 },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong, overflow: 'hidden' },
  row: { minHeight: TAP, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineStrong },
});
