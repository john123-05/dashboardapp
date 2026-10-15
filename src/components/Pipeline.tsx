import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { ZUSTAND, type Eintrag } from '../lib/health';
import { colors, font } from '../theme';
import { tapHaptic } from './haptics';

type IconName = ComponentProps<typeof Ionicons>['name'];
const KIND_ICON: Record<string, IconName> = {
  camera: 'camera-outline', sensor: 'radio-outline', viewer: 'tv-outline', cash: 'logo-euro', terminal: 'card-outline',
  printer: 'print-outline', uploader: 'cloud-upload-outline', network: 'wifi-outline', config: 'options-outline', mail: 'mail-outline', system: 'server-outline',
};

// Ablauf-Streifen wie im Web: Station für Station leuchtet kurz auf, die Linie davor läuft mit.
// An der ersten roten Station bleibt der Lauf stehen, sie pulsiert rot.
export function Pipeline({ stationen, onPress }: { stationen: Eintrag[]; onPress: (name: string) => void }) {
  const ersteRote = stationen.findIndex((e) => e.ton === 'bad');
  const letzte = ersteRote === -1 ? stationen.length - 1 : ersteRote - 1;
  const [lauf, setLauf] = useState(-1);
  useEffect(() => {
    if (letzte < 0) return setLauf(-1);
    const PAUSE = 4;
    let schritt = -1;
    const t = setInterval(() => {
      schritt = schritt >= letzte + PAUSE ? 0 : schritt + 1;
      setLauf(schritt <= letzte ? schritt : -1);
    }, 650);
    return () => clearInterval(t);
  }, [letzte]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {stationen.map((e, i) => (
        <View key={e.name} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {i > 0 ? <Linie aktiv={lauf === i} warn={e.ton === 'warn'} /> : null}
          <Station e={e} aktiv={lauf === i} rot={i === ersteRote} onPress={() => onPress(e.name)} />
        </View>
      ))}
    </ScrollView>
  );
}

function Linie({ aktiv, warn }: { aktiv: boolean; warn: boolean }) {
  const x = useSharedValue(-1);
  useEffect(() => {
    if (aktiv) {
      x.value = -1;
      x.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
    }
  }, [aktiv, x]);
  const flow = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 24 }], opacity: aktiv ? 1 - Math.abs(x.value) * 0.6 : 0 }));
  return (
    <View style={styles.line}>
      <Animated.View style={[styles.flow, { backgroundColor: warn ? colors.warn : colors.ok }, flow]} />
    </View>
  );
}

function Station({ e, aktiv, rot, onPress }: { e: Eintrag; aktiv: boolean; rot: boolean; onPress: () => void }) {
  const z = ZUSTAND[e.ton];
  const glow = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    glow.value = withTiming(aktiv ? 1 : 0, { duration: aktiv ? 250 : 500 });
  }, [aktiv, glow]);
  useEffect(() => {
    if (rot) pulse.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1);
    else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
  }, [rot, pulse]);
  const glowColor = e.ton === 'warn' ? colors.warn : colors.ok;
  const ring = useAnimatedStyle(() => ({
    borderColor: rot ? colors.err : glow.value > 0.5 ? glowColor : 'rgba(16,24,40,0.16)',
    shadowColor: rot ? colors.err : glowColor,
    shadowOpacity: rot ? 0.25 + pulse.value * 0.45 : glow.value * 0.6,
    shadowRadius: rot ? 6 + pulse.value * 8 : glow.value * 10,
    transform: [{ scale: 1 + (rot ? pulse.value * 0.06 : glow.value * 0.05) }],
  }));
  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={styles.station}
      accessibilityLabel={`${e.name}: ${z.label}`}
    >
      <Animated.View style={[styles.circle, ring]}>
        <Ionicons name={KIND_ICON[e.kind] ?? 'hardware-chip-outline'} size={17} color={colors.ink2} />
        <View style={[styles.dot, { backgroundColor: z.color }]} />
      </Animated.View>
      <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {e.name}
      </Text>
      <Text style={styles.state} numberOfLines={1}>
        {z.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: 12, paddingVertical: 14 },
  station: { width: 86, alignItems: 'center', gap: 5 },
  circle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 } },
  dot: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.white },
  name: { ...font.caption, fontSize: 11, color: colors.ink2, textAlign: 'center', lineHeight: 13 },
  state: { fontSize: 10, color: colors.ink3 },
  line: { width: 18, height: 1.5, marginTop: 20, backgroundColor: 'rgba(16,24,40,0.16)', overflow: 'hidden' },
  flow: { position: 'absolute', top: -0.5, left: 0, width: 18, height: 2.5, borderRadius: 2 },
});
