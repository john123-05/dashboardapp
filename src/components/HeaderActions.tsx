import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { colors } from '../theme';
import { tapHaptic } from './haptics';

export function initialsOf(name: string | null | undefined, email: string | null | undefined) {
  return (name || email || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

// Oben rechts, immer sichtbar: kleine Glocke (Meldungen) und Konto-Symbol (Konto und Einstellungen).
export function HeaderActions() {
  const nav = useNavigation<any>();
  const { unread } = useNotifications();
  const { fullName, email } = useAuth();
  return (
    <View style={styles.row}>
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
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(fullName, email)}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.err, borderWidth: 1.5, borderColor: colors.white },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2b2b2b', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 12, fontWeight: '700' },
});
