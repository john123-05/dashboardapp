import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui';
import { tapHaptic } from '../components/haptics';
import { TOUR } from '../lib/help';
import { colors, font, space } from '../theme';

export const TOUR_SEEN_KEY = 'lp-tour-seen-v1';

const APP_STEPS = [
  { title: 'Willkommen bei Liftbase', text: 'Hier hast du deinen Park immer dabei: Umsatz, Fotos, Systemzustand und Gäste. Wische durch den Rundgang, er dauert eine Minute.', icon: 'sparkles-outline' },
  ...TOUR,
  { title: 'Glocke und Konto', text: 'Oben rechts die Glocke: Störungen, Papier und Antworten vom Support. Daneben dein Konto mit Einstellungen, Benachrichtigungen, Mitarbeiter-Zugang und Hilfe.', icon: 'notifications-outline' },
  { title: 'Alles Weitere unter „Mehr“', text: 'Unten rechts öffnet „Mehr“ alle weiteren Seiten. Zwischen den Tabs kannst du seitlich wischen.', icon: 'grid-outline' },
];

// Rundgang (wie "Rundgang starten" im Web): beim ersten Start und jederzeit über das Hilfe-Center.
export function TourScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const list = useRef<FlatList>(null);
  const last = i === APP_STEPS.length - 1;
  const fertig = () => {
    void AsyncStorage.setItem(TOUR_SEEN_KEY, '1');
    navigation.goBack();
  };
  const weiter = () => {
    tapHaptic();
    if (last) return fertig();
    list.current?.scrollToIndex({ index: i + 1, animated: true });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.top}>
        <Text style={{ ...font.footnote, color: colors.ink3 }}>
          {i + 1} von {APP_STEPS.length}
        </Text>
        <Pressable onPress={fertig} hitSlop={10}>
          <Text style={{ ...font.callout, color: colors.brand, fontWeight: '600' }}>Überspringen</Text>
        </Pressable>
      </View>
      <FlatList
        ref={list}
        data={APP_STEPS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.title}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: space.xxl, justifyContent: 'center', gap: space.lg }}>
            <View style={styles.icon}>
              <Ionicons name={item.icon as any} size={44} color={colors.brand} />
            </View>
            <Text style={{ ...font.largeTitle, color: colors.ink }}>{item.title}</Text>
            <Text style={{ ...font.body, fontSize: 18, lineHeight: 26, color: colors.ink2 }}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {APP_STEPS.map((s, k) => (
          <View key={s.title} style={[styles.dot, k === i && styles.dotOn]} />
        ))}
      </View>
      <View style={{ paddingHorizontal: space.xl }}>
        <Button title={last ? 'Los geht’s' : 'Weiter'} onPress={weiter} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.xl, minHeight: 44 },
  icon: { width: 84, height: 84, borderRadius: 24, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: space.lg },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lineStrong },
  dotOn: { width: 22, backgroundColor: colors.brand },
});
