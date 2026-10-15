import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import { canSee } from '../lib/permissions';
import { speedUnlocked, useEntitlements } from '../lib/entitlements';
import { PAGES, type PageEntry } from '../lib/pages';
import { font } from '../theme';
import { tapHaptic } from './haptics';
import { initialsOf } from './HeaderActions';
import { BAR_GREY } from './TabBar';

const EASE = Easing.bezier(0.32, 0.72, 0, 1);

// "Mehr" wie im Liftpictures-CRM: dunkles Blatt, das von unten hochfährt, mit Griff oben.
// Nach unten ziehen oder daneben tippen schließt es.
export function MoreSheet({ open, onClose, onOpenPage, onAccount }: { open: boolean; onClose: () => void; onOpenPage: (p: PageEntry) => void; onAccount: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { isOwner, isStaff, allowedPages, fullName, email } = useAuth();
  const { parkName, parkId } = usePark();
  const ent = useEntitlements(parkId);
  const upgrade = (k: string) => (k === 'speed' && !speedUnlocked(parkId, ent.has)) || (k === 'shop' && !ent.has('online_shop'));
  const [mounted, setMounted] = useState(open);
  const p = useSharedValue(0);
  const drag = useSharedValue(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      drag.value = 0;
      p.value = withTiming(1, { duration: 300, easing: EASE });
    } else if (mounted) {
      p.value = withTiming(0, { duration: 240, easing: EASE }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sheetH = height * 0.8;
  const backdrop = useAnimatedStyle(() => ({ opacity: p.value * 0.5 }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(p.value, [0, 1], [sheetH, 0]) + drag.value }] }));
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 90 || e.velocityY > 900) runOnJS(onClose)();
      else drag.value = withTiming(0, { duration: 200, easing: EASE });
    });

  if (!mounted) return null;
  const viewer = { isOwner, isStaff, allowedPages };
  const list = PAGES.filter((pg) => !pg.tab && canSee(pg.key, viewer));
  const groups = ['Betrieb', 'Marketing', 'Verwaltung'] as const;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Schließen" />
      </Animated.View>
      <Animated.View style={[styles.sheet, { maxHeight: sheetH, paddingBottom: insets.bottom + 12 }, sheet]}>
        <GestureDetector gesture={pan}>
          <View style={styles.grabArea}>
            <View style={styles.grabber} />
          </View>
        </GestureDetector>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
          <Pressable
            style={({ pressed }) => [styles.account, pressed && styles.pressed]}
            onPress={() => {
              tapHaptic();
              onAccount();
            }}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsOf(fullName, email)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.accountName} numberOfLines={1}>
                {fullName || email}
              </Text>
              <Text style={styles.accountSub} numberOfLines={1}>
                {parkName}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.45)" />
          </Pressable>
          {groups.map((g) => {
            const items = list.filter((pg) => pg.group === g);
            if (!items.length) return null;
            return (
              <View key={g} style={{ gap: 2 }}>
                <Text style={styles.group}>{g}</Text>
                {items.map((pg) => (
                  <Pressable
                    key={pg.key}
                    style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                    onPress={() => {
                      tapHaptic();
                      onOpenPage(pg);
                    }}
                    accessibilityRole="button"
                  >
                    <Ionicons name={pg.icon} size={20} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.itemText} numberOfLines={1}>
                      {pg.title}
                      {upgrade(pg.key) ? <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}> (Upgrade)</Text> : null}
                    </Text>
                    {!pg.route ? <Ionicons name="open-outline" size={14} color="rgba(255,255,255,0.35)" /> : null}
                  </Pressable>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#0b0e14' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: BAR_GREY, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  grabArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 12 },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  accountName: { ...font.callout, color: '#fff', fontWeight: '600' },
  accountSub: { ...font.footnote, color: 'rgba(255,255,255,0.55)' },
  group: { ...font.caption, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 12, marginBottom: 4, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48, paddingHorizontal: 12, borderRadius: 11 },
  itemText: { ...font.body, color: '#fff', flex: 1 },
  pressed: { backgroundColor: 'rgba(255,255,255,0.08)' },
});
