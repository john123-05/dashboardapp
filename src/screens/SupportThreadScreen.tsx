import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../components/Screen';
import { ErrorNote, Pill, Skeleton } from '../components/ui';
import { successHaptic } from '../components/haptics';
import { usePark } from '../contexts/ParkContext';
import { formatDayLong, formatTime } from '../lib/format';
import { archiveTicket, loadTicketMessages, replyTicket, STATUS_LABEL, type SupportTicket } from '../lib/support';
import { useData } from '../lib/useData';
import { colors, font, radius, space } from '../theme';

export function SupportThreadScreen({ route, navigation }: { route: { params: { ticket: SupportTicket } }; navigation: { goBack: () => void } }) {
  const t = route.params.ticket;
  const insets = useSafeAreaInsets();
  const { parkId, timezone } = usePark();
  const msgs = useData(parkId ? `msgs:${t.id}` : null, () => loadTicketMessages(parkId!, t.id), [parkId, t.id], 30000);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function senden() {
    const m = text.trim();
    if (!m || !parkId) return;
    setSending(true);
    setErr(null);
    try {
      await replyTicket(parkId, t.id, m);
      setText('');
      successHaptic();
      msgs.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Senden fehlgeschlagen');
    }
    setSending(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1 }}>
        <Screen
          title={t.subject}
          subtitle={`${STATUS_LABEL[t.status]} · seit ${formatDayLong(t.created_at.slice(0, 10))}`}
          onBack={navigation.goBack}
          refreshing={msgs.refreshing}
          onRefresh={msgs.reload}
          right={
            <Pressable
              hitSlop={8}
              onPress={() =>
                Alert.alert(t.archived_at ? 'Aus dem Archiv holen?' : 'Anfrage archivieren?', undefined, [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: t.archived_at ? 'Zurückholen' : 'Archivieren', onPress: async () => { await archiveTicket(parkId!, t.id, !t.archived_at).catch(() => undefined); navigation.goBack(); } },
                ])
              }
            >
              <Ionicons name={t.archived_at ? 'arrow-undo-outline' : 'archive-outline'} size={22} color={colors.ink2} />
            </Pressable>
          }
        >
          {t.description ? (
            <View style={[styles.bubble, styles.mine]}>
              <Text style={styles.mineText}>{t.description}</Text>
            </View>
          ) : null}
          {msgs.loading && !msgs.data ? <Skeleton height={60} radius={16} /> : null}
          {msgs.error && !msgs.data ? <ErrorNote text={msgs.error} onRetry={msgs.reload} /> : null}
          {(msgs.data ?? []).map((m) => {
            const mine = m.author_role === 'operator';
            return (
              <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 3 }}>
                {!mine ? <Pill tone="info" text="Liftpictures Support" /> : null}
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={mine ? styles.mineText : styles.theirsText}>{m.message}</Text>
                </View>
                <Text style={styles.time}>{formatTime(m.created_at, timezone)} Uhr</Text>
              </View>
            );
          })}
        </Screen>
      </View>
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {err ? <Text style={{ ...font.caption, color: colors.err, marginBottom: 4 }}>{err}</Text> : null}
        <View style={styles.inputRow}>
          <TextInput value={text} onChangeText={setText} placeholder="Antwort schreiben…" placeholderTextColor={colors.ink3} multiline style={styles.input} />
          <Pressable onPress={senden} disabled={!text.trim() || sending} style={[styles.send, (!text.trim() || sending) && { opacity: 0.4 }]} accessibilityLabel="Senden">
            {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="arrow-up" size={20} color="#fff" />}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '85%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { backgroundColor: colors.brand, alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.white, borderBottomLeftRadius: 6 },
  mineText: { ...font.body, color: '#fff' },
  theirsText: { ...font.body, color: colors.ink },
  time: { ...font.caption, color: colors.ink3 },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineStrong, backgroundColor: colors.white, paddingHorizontal: space.md, paddingTop: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, ...font.body, fontSize: 16, color: colors.ink, maxHeight: 120, minHeight: 40, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
