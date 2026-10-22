import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import { announcementFor, fetchAnnouncements, reportAnnouncement } from '../lib/announcements';
import type { PageKey } from '../lib/permissions';
import { routeForUrl } from '../lib/push';
import { useData } from '../lib/useData';
import { colors, font, radius, space } from '../theme';
import { tapHaptic } from './haptics';
import { useWide } from './layout';
import { QrCode } from './QrCode';

const DASHBOARD = 'https://dashboard-liftpictures.com';
// Für alle Seiten gemeinsam: einmal geschlossen bleibt ein Hinweis in dieser Sitzung weg (und serverseitig für den Nutzer).
const closedIds: string[] = [];

/** Hinweis aus dem Liftpictures-CRM für diese Seite (höchstens einer), wie AnnouncementHost im Web. */
export function AnnouncementCard({ page }: { page: PageKey }) {
  const nav = useNavigation<any>();
  const wide = useWide();
  const { parkId } = usePark();
  const { isOwner, isStaff } = useAuth();
  const q = useData(parkId ? `ann:${parkId}` : null, () => fetchAnnouncements(parkId!), [parkId], 10 * 60000);
  const [, setTick] = useState(0);
  const a = announcementFor(q.data ?? [], page, { isOwner, isStaff }, closedIds);

  useEffect(() => {
    if (a && parkId) reportAnnouncement(parkId, a.id, 'seen');
  }, [a?.id, parkId]);
  if (!a || !parkId) return null;

  const bar = a.tone === 'offer' ? colors.brand : a.tone === 'warning' ? colors.warn : colors.info;
  const qr = a.qr_url ? (a.qr_url.startsWith('/') ? `${DASHBOARD}${a.qr_url}` : a.qr_url) : null;

  function follow() {
    if (!a?.cta_url || !parkId) return;
    tapHaptic();
    reportAnnouncement(parkId, a.id, 'clicked');
    if (a.cta_url.startsWith('/')) {
      const r = routeForUrl(a.cta_url);
      if (wide && ['Overview', 'Revenue', 'Health', 'Photos'].includes(r.name)) nav.navigate('Main', { screen: r.name, params: r.params });
      else nav.navigate(r.name, r.params);
    } else void Linking.openURL(a.cta_url);
  }
  function dismiss() {
    if (!a || !parkId) return;
    tapHaptic();
    closedIds.push(a.id);
    reportAnnouncement(parkId, a.id, 'dismissed');
    setTick((t) => t + 1);
  }

  return (
    <View style={styles.card}>
      <View style={[styles.bar, { backgroundColor: bar }]} />
      <View style={{ flex: 1, gap: 6, padding: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Text style={{ ...font.headline, color: colors.ink, flex: 1 }}>{a.title}</Text>
          <Pressable onPress={dismiss} hitSlop={10} accessibilityLabel="Hinweis schließen">
            <Ionicons name="close" size={20} color={colors.ink3} />
          </Pressable>
        </View>
        {a.body ? <Text style={{ ...font.subhead, color: colors.ink2 }}>{a.body}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
          {a.cta_url && a.cta_label ? (
            <Pressable onPress={follow} style={({ pressed }) => [styles.cta, { backgroundColor: bar, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={{ ...font.callout, color: colors.onBrand, fontWeight: '700' }}>{a.cta_label}</Text>
            </Pressable>
          ) : null}
          {qr ? (
            <View style={styles.qr}>
              <QrCode value={qr} size={72} margin={1} />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  bar: { width: 5 },
  cta: { minHeight: 40, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  qr: { padding: 4, backgroundColor: '#FFFFFF', borderRadius: 8 },
});
