import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { colors } from '../theme';
import { tapHaptic } from './haptics';
import { useWide } from './layout';

export function initialsOf(name: string | null | undefined, email: string | null | undefined) {
  return (name || email || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

// Oben rechts, immer sichtbar: kleine Glocke (Meldungen) und Konto-Symbol (Konto und Einstellungen).
export function HeaderActions() {
  const nav = useNavigation<any>();
  const { unread } = useNotifications();
  const { fullName, email } = useAuth();
  const wide = useWide();
  return (
    <View style={[styles.row, wide && styles.wideBar]}>
      {wide ? (
        <>
          <Pressable onPress={() => nav.navigate('Help')} style={styles.btn} accessibilityLabel="Hilfe">
            <Ionicons name="help-circle-outline" size={22} color={colors.ink} />
          </Pressable>
          <Pressable onPress={() => nav.navigate('Settings')} style={styles.btn} accessibilityLabel="Einstellungen">
            <Ionicons name="settings-outline" size={21} color={colors.ink} />
          </Pressable>
        </>
      ) : null}
      <Pressable
        onPress={() => {
          tapHaptic();
          nav.navigate('Alerts');
        }}
        hitSlop={6}
        style={styles.btn}
        accessibilityRole="button"
        accessibilityLabel={unread > 0 ? `Meldungen, ${unread} neu` : 'Meldungen'}
      >
        <Ionicons name="notifications-outline" size={22} color={colors.ink} />
        {unread > 0 ? <View style={styles.dot} /> : null}
      </Pressable>
      <Pressable
        onPress={() => {
          tapHaptic();
          nav.navigate('Account');
        }}
        hitSlop={6}
        style={styles.btn}
        accessibilityRole="button"
        accessibilityLabel="Konto und Einstellungen"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(fullName, email)}</Text>
          </View>
          {wide ? <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{(fullName || email || '').split(' ')[0]}</Text> : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  btn: { minWidth: 40, height: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  wideBar: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 6, gap: 4 },
  dot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.err, borderWidth: 1.5, borderColor: colors.white },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2b2b2b', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.onBrand, fontSize: 12, fontWeight: '700' },
});
