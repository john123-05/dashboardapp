import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { usePark } from '../contexts/ParkContext';
import { canSee } from '../lib/permissions';
import { PAGES, type PageEntry } from '../lib/pages';
import { font } from '../theme';
import { tapHaptic } from './haptics';
import { initialsOf } from './HeaderActions';
import { BAR_GREY } from './TabBar';

// iPad quer und Mac: Seitenleiste links wie im Web-Dashboard (#2b2b2b, Gruppen Betrieb/Marketing/Verwaltung).
export function Sidebar({ active, onOpen, onAlerts, onAccount }: { active: string | null; onOpen: (p: PageEntry) => void; onAlerts: () => void; onAccount: () => void }) {
  const insets = useSafeAreaInsets();
  const { isOwner, isStaff, allowedPages, fullName, email } = useAuth();
  const { parkName } = usePark();
  const { unread } = useNotifications();
  const viewer = { isOwner, isStaff, allowedPages };
  const visible = PAGES.filter((p) => canSee(p.key, viewer));
  return (
    <View style={[styles.root, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.brand}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.brandName}>Liftpictures</Text>
          <Text style={styles.park} numberOfLines={1}>
            {parkName}
          </Text>
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, gap: 14 }} showsVerticalScrollIndicator={false}>
        {(['Betrieb', 'Marketing', 'Verwaltung'] as const).map((g) => {
          const items = visible.filter((p) => p.group === g);
          if (!items.length) return null;
          return (
            <View key={g} style={{ gap: 2 }}>
              <Text style={styles.group}>{g}</Text>
              {items.map((p) => {
                const on = active === p.route;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => {
                      tapHaptic();
                      onOpen(p);
                    }}
                    style={({ pressed }) => [styles.item, (on || pressed) && styles.itemOn]}
                  >
                    <Ionicons name={p.icon} size={18} color={on ? '#fff' : 'rgba(255,255,255,0.7)'} />
                    <Text style={[styles.itemText, on && { color: '#fff', fontWeight: '600' }]} numberOfLines={1}>
                      {p.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable onPress={onAccount} style={({ pressed }) => [styles.account, pressed && styles.itemOn]}>
          <View style={styles.avatar}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{initialsOf(fullName, email)}</Text>
          </View>
          <Text style={[styles.itemText, { flex: 1 }]} numberOfLines={1}>
            {fullName || email}
          </Text>
        </Pressable>
        <Pressable onPress={onAlerts} style={({ pressed }) => [styles.bell, pressed && styles.itemOn]} accessibilityLabel="Meldungen">
          <Ionicons name="notifications-outline" size={20} color="#fff" />
          {unread > 0 ? <View style={styles.dot} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: 256, backgroundColor: BAR_GREY },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 18 },
  logo: { width: 34, height: 34, borderRadius: 8 },
  brandName: { ...font.headline, color: '#fff' },
  park: { ...font.footnote, color: 'rgba(255,255,255,0.55)' },
  group: { ...font.caption, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 10, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40, paddingHorizontal: 10, borderRadius: 9 },
  itemOn: { backgroundColor: 'rgba(255,255,255,0.1)' },
  itemText: { ...font.callout, color: 'rgba(255,255,255,0.78)', fontWeight: '500' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  account: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 8, borderRadius: 9 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  bell: { width: 44, height: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 11, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5392D' },
});
