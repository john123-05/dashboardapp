import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Pipeline } from '../components/Pipeline';
import { Screen } from '../components/Screen';
import { Card, EmptyState, ErrorNote, ListCard, Pill, Segmented, Skeleton } from '../components/ui';
import { successHaptic, tapHaptic } from '../components/haptics';
import { usePark } from '../contexts/ParkContext';
import { formatDayLong, formatNumber, formatTime } from '../lib/format';
import { kurzText, loadMachines, orderMachine, seit, urteil, warnText, zusammenfuehren, ZUSTAND, type Eintrag, type Machine } from '../lib/health';
import { useData } from '../lib/useData';
import { colors, font, radius, space } from '../theme';

const TON_ICON = { ok: 'checkmark-circle', warn: 'alert-circle', bad: 'close-circle', ruhig: 'moon', aus: 'remove-circle', unklar: 'help-circle' } as const;

export function HealthScreen() {
  const { parkId, timezone } = usePark();
  const [ansicht, setAnsicht] = useState<'wichtig' | 'alle'>('wichtig');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const data = useData(parkId ? `machines:${parkId}` : null, () => loadMachines(parkId!), [parkId], 30000);
  const machines = data.data?.machines ?? [];
  const history = data.data?.history ?? [];
  const u = useMemo(() => urteil(machines), [machines]);
  const fotos = machines.reduce((s, m) => s + (m.photos_taken_today ?? 0), 0);
  const verkauft = machines.reduce((s, m) => s + (m.photos_sold_today ?? 0), 0);

  async function auftrag(m: Machine, mode: 'now' | 'tonight' | 'cancel' | 'stop', target?: string, label?: string) {
    if (!parkId) return;
    setBusy(`${m.id}:${target ?? mode}`);
    setNotice(null);
    try {
      await orderMachine(parkId, m.id, mode, target);
      successHaptic();
      setNotice(
        mode === 'cancel' ? 'Der geplante Neustart wurde zurückgenommen.'
          : target === 'testphoto' ? 'Testfoto beauftragt. Das Ergebnis erscheint gleich im Verlauf.'
            : mode === 'stop' ? `${label ?? 'Das Programm'} wird beendet.`
              : mode === 'tonight' ? `${label ?? 'Das Programm'} startet heute Nacht neu.`
                : `${label ?? 'Das Programm'} wird neu gestartet. Der Automat holt den Auftrag beim nächsten Abruf.`,
      );
      data.reload();
    } catch (e) {
      Alert.alert('Auftrag fehlgeschlagen', e instanceof Error ? e.message : 'Unbekannter Fehler');
    }
    setBusy(null);
  }

  return (
    <Screen page="health" tabs actions title="Systemzustand" refreshing={data.refreshing} onRefresh={data.reload}>
      {data.error && !data.data ? <ErrorNote text={data.error} onRetry={data.reload} /> : null}
      {notice ? <Pill tone="info" icon="information-circle" text={notice} /> : null}

      {u ? (
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <View style={{ height: 4, backgroundColor: ZUSTAND[u.ton].color }} />
          <View style={{ padding: space.lg, flexDirection: 'row', gap: space.md }}>
            <View style={[styles.verdictIcon, { backgroundColor: ZUSTAND[u.ton].soft }]}>
              <Ionicons name={TON_ICON[u.ton]} size={26} color={ZUSTAND[u.ton].color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...font.title, fontWeight: '600', color: colors.ink }} numberOfLines={2}>
                {u.titel}
              </Text>
              <Text style={{ ...font.subhead, color: colors.ink2, marginTop: 2 }}>{u.text}</Text>
            </View>
          </View>
          <View style={styles.sums}>
            <Kennzahl label="Fotos heute" wert={formatNumber(fotos)} />
            <Kennzahl label="Verkauft heute" wert={formatNumber(verkauft)} />
            <Kennzahl label="Automaten" wert={`${machines.filter((m) => m.reachable).length}/${machines.length}`} />
          </View>
        </Card>
      ) : data.loading ? (
        <Card>
          <Skeleton height={24} width="60%" />
          <Skeleton height={14} width="85%" style={{ marginTop: 10 }} />
        </Card>
      ) : null}

      {machines.length > 0 ? (
        <Segmented value={ansicht} onChange={setAnsicht} options={[{ value: 'wichtig', label: 'Einfache Ansicht' }, { value: 'alle', label: 'Alle Werte' }]} />
      ) : null}

      {machines.map((m) => (
        <Automat key={m.id} m={m} alle={ansicht === 'alle'} busy={busy} onAuftrag={auftrag} />
      ))}

      {!data.loading && machines.length === 0 && !data.error ? (
        <Card>
          <EmptyState icon="pulse-outline" title="Keine Automaten" text="Für diesen Park ist noch kein Automat verbunden." />
        </Card>
      ) : null}

      {history.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Text style={styles.sectionTitle}>Verlauf</Text>
          <ListCard>
            {history.slice(0, 30).map((h, i) => (
              <View key={h.id} style={[styles.hist, i > 0 && styles.histLine]}>
                <View style={[styles.histDot, { backgroundColor: h.severity === 'error' ? colors.err : h.severity === 'warning' ? colors.warn : colors.ink3 }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ ...font.subhead, color: colors.ink }}>{h.summary}</Text>
                  {h.detail ? <Text style={{ ...font.caption, color: colors.ink3 }} numberOfLines={2}>{h.detail}</Text> : null}
                </View>
                <Text style={styles.histTime}>
                  {formatDayLong(new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(h.occurred_at))).split(',')[0]} {formatTime(h.occurred_at, timezone)}
                </Text>
              </View>
            ))}
          </ListCard>
        </View>
      ) : null}
    </Screen>
  );
}

function Kennzahl({ label, wert }: { label: string; wert: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ ...font.caption, color: colors.ink3 }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ fontSize: 22, fontWeight: '300', color: colors.ink, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
        {wert}
      </Text>
    </View>
  );
}

function Automat({ m, alle, busy, onAuftrag }: { m: Machine; alle: boolean; busy: string | null; onAuftrag: (m: Machine, mode: 'now' | 'tonight' | 'cancel' | 'stop', target?: string, label?: string) => void }) {
  const eintraege = useMemo(() => zusammenfuehren(m), [m]);
  const [offen, setOffen] = useState<Set<string>>(new Set());
  const sichtbar = alle ? eintraege : eintraege.filter((e) => e.kind !== 'system' || e.ton === 'bad' || e.ton === 'warn');
  const stationen = eintraege.filter((e) => e.kind !== 'system' || e.ton === 'bad' || e.ton === 'warn');
  const inOrdnung = sichtbar.filter((e) => e.ton === 'ok' || e.ton === 'ruhig').length;
  const warnPapier = m.paper_warn_remaining ?? 30;
  const umschalten = (name: string) =>
    setOffen((alt) => {
      const neu = new Set(alt);
      if (neu.has(name)) neu.delete(name);
      else neu.add(name);
      return neu;
    });

  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <View style={{ padding: space.lg, gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand }} />
          <Text style={{ ...font.headline, color: colors.ink, flex: 1 }} numberOfLines={1}>
            {m.machine_label || m.machine_id}
          </Text>
          <Pill tone={m.reachable ? 'ok' : 'err'} text={m.reachable ? 'verbunden' : `keine Daten seit ${seit(m.offline_minutes)}`} />
        </View>
        {eintraege.length > 0 ? <Text style={{ ...font.footnote, color: colors.ink3, marginTop: -6 }}>{inOrdnung} von {sichtbar.length} in Ordnung</Text> : null}

        <View style={{ flexDirection: 'row', gap: space.lg }}>
          {typeof m.paper_remaining === 'number' ? (
            <View style={{ flex: 1.3 }}>
              <Text style={{ ...font.caption, color: colors.ink3 }}>Papier übrig</Text>
              <Text style={{ fontSize: 22, fontWeight: '300', color: m.paper_remaining <= warnPapier ? colors.warn : colors.ink, fontVariant: ['tabular-nums'] }}>
                {m.paper_remaining}
                {m.paper_capacity ? <Text style={{ fontSize: 13, color: colors.ink3 }}> / {m.paper_capacity}</Text> : null}
              </Text>
              {m.paper_capacity ? (
                <View style={styles.paperTrack}>
                  <View style={{ height: 5, borderRadius: 3, width: `${Math.min(100, Math.max(2, (m.paper_remaining / m.paper_capacity) * 100))}%`, backgroundColor: m.paper_remaining <= warnPapier ? colors.warn : colors.ok }} />
                </View>
              ) : null}
            </View>
          ) : null}
          {m.photos_taken_today !== null ? <Kennzahl label="Fotos heute" wert={formatNumber(m.photos_taken_today)} /> : null}
          {m.photos_sold_today !== null && m.photos_sold_today !== undefined ? <Kennzahl label="Verkauft" wert={formatNumber(m.photos_sold_today)} /> : null}
        </View>
      </View>

      {stationen.length > 0 ? (
        <View style={styles.strip}>
          <Pipeline stationen={stationen} onPress={umschalten} />
        </View>
      ) : null}

      <View style={{ padding: space.md, gap: space.sm }}>
        {m.customer_code_registered === false ? (
          <View style={styles.codeWarn}>
            <Text style={{ ...font.callout, color: colors.err, fontWeight: '700' }}>Abholcode {m.customer_code} ist nicht hinterlegt</Text>
            <Text style={{ ...font.footnote, color: colors.err }}>
              Fotos dieses Automaten werden einem fremden Park zugeordnet.{m.park_customer_codes?.length ? ` Hinterlegt sind: ${m.park_customer_codes.join(', ')}.` : ''}
            </Text>
          </View>
        ) : null}
        {eintraege.length === 0 ? (
          <Text style={{ ...font.subhead, color: colors.ink3, padding: space.sm }}>
            Dieser Automat meldet noch keinen Zustand seiner Programme{m.agent_version ? ` (Version ${m.agent_version})` : ''}.
          </Text>
        ) : null}
        {sichtbar.map((e) => (
          <Zeile
            key={e.name}
            e={e}
            m={m}
            offen={offen.has(e.name)}
            onToggle={() => umschalten(e.name)}
            busy={busy}
            onAuftrag={onAuftrag}
          />
        ))}
        {alle ? (
          <Text style={{ ...font.caption, color: colors.ink3, marginTop: 4 }}>
            {m.agent_version ? `Version ${m.agent_version}` : ''}
            {typeof m.queue_count === 'number' ? ` · ${m.queue_count} in der Upload-Warteschlange` : ''}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

function Zeile({ e, m, offen, onToggle, busy, onAuftrag }: {
  e: Eintrag; m: Machine; offen: boolean; onToggle: () => void; busy: string | null;
  onAuftrag: (m: Machine, mode: 'now' | 'tonight' | 'cancel' | 'stop', target?: string, label?: string) => void;
}) {
  const z = ZUSTAND[e.ton];
  const warn = warnText(e);
  const wartet = !!m.pending_restart && !!e.neustart && (m.pending_restart.target || 'viewer') === e.neustart.key;
  const gesperrt = !!m.pending_restart && !wartet;
  const testfoto = e.kind === 'camera' && e.name === 'Kamera-Software' && m.can_test_photo;

  const bestaetigen = (mode: 'now' | 'stop') => {
    const n = e.neustart!;
    Alert.alert(
      mode === 'now' ? `${n.name} neu starten?` : `${n.name} beenden?`,
      mode === 'now'
        ? `${n.name} (${n.tech}) wird beendet und neu gestartet.\n\n${n.folge}\n\nNur ausführen, wenn gerade niemand am Automaten steht.`
        : `${n.name} (${n.tech}) wird beendet und NICHT wieder gestartet. Es bleibt aus, bis du es wieder startest.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: mode === 'now' ? 'Neu starten' : 'Beenden', style: mode === 'stop' ? 'destructive' : 'default', onPress: () => onAuftrag(m, mode, n.key, n.name) },
      ],
    );
  };

  return (
    <Animated.View layout={LinearTransition.duration(220)}>
    <View style={[styles.row, e.ton === 'bad' && { borderColor: '#F6C7C2' }]}>
      <Pressable
        onPress={() => {
          tapHaptic();
          onToggle();
        }}
        style={styles.rowHead}
        accessibilityRole="button"
        accessibilityState={{ expanded: offen }}
      >
        <View style={[styles.rowDot, { backgroundColor: z.color }]} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...font.callout, color: colors.ink, fontWeight: '600' }} numberOfLines={1}>
            {e.name}
          </Text>
          <Text style={{ ...font.footnote, color: colors.ink2 }} numberOfLines={offen ? 3 : 1}>
            {kurzText(e)}
          </Text>
          {warn && !offen ? (
            <Text style={{ ...font.footnote, color: e.ton === 'bad' ? colors.err : colors.warn }} numberOfLines={2}>
              {warn}
            </Text>
          ) : null}
        </View>
        {wartet ? <Pill tone="info" text={m.pending_restart?.mode === 'tonight' ? 'heute Nacht' : 'startet neu'} /> : <Pill tone={e.ton === 'ok' ? 'ok' : e.ton === 'bad' ? 'err' : e.ton === 'warn' ? 'warn' : 'neutral'} text={z.label} />}
        <Ionicons name={offen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.ink3} />
      </Pressable>
      {offen ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} style={styles.rowBody}>
          {e.purpose ? <Text style={{ ...font.footnote, color: colors.ink2 }}>{e.purpose}</Text> : null}
          {e.tech ? <Text style={{ ...font.caption, color: colors.ink3 }}>Auf dem PC: {e.tech}</Text> : null}
          {e.gemessen ? <Befund titel="Gemessen" text={e.gemessen.detail} /> : null}
          {e.protokoll ? <Befund titel="Aus dem Protokoll" text={e.protokoll.plain || e.protokoll.detail} datei={e.protokoll.source_file} /> : null}
          {(m.coin_warnings ?? []).length && e.kind === 'cash'
            ? (m.coin_warnings ?? []).map((c) => <Pill key={c.cent} tone={c.stufe === 'leer' ? 'err' : 'warn'} icon="logo-euro" text={c.text} />)
            : null}
          {e.neustart ? (
            <View style={styles.actions}>
              {wartet ? (
                <Knopf label="Zurücknehmen" busy={busy === `${m.id}:cancel`} onPress={() => onAuftrag(m, 'cancel', undefined)} />
              ) : (
                <>
                  <Knopf label="Jetzt neu starten" icon="refresh" primary disabled={gesperrt} busy={busy === `${m.id}:${e.neustart.key}`} onPress={() => bestaetigen('now')} />
                  <Knopf label="Heute Nacht" icon="moon-outline" disabled={gesperrt} onPress={() => onAuftrag(m, 'tonight', e.neustart!.key, e.neustart!.name)} />
                  <Knopf label="Beenden" icon="stop-outline" disabled={gesperrt} onPress={() => bestaetigen('stop')} />
                </>
              )}
            </View>
          ) : null}
          {testfoto ? (
            <View style={styles.actions}>
              <Knopf
                label={m.pending_restart?.target === 'testphoto' ? 'wartet auf den Automaten…' : 'Testfoto auslösen'}
                icon="camera-outline"
                busy={busy === `${m.id}:testphoto`}
                disabled={m.pending_restart?.target === 'testphoto'}
                onPress={() =>
                  Alert.alert('Testfoto auslösen?', 'Der Automat nimmt jetzt ein Foto auf und schickt es durch die ganze Kette bis zum Upload.', [
                    { text: 'Abbrechen', style: 'cancel' },
                    { text: 'Auslösen', onPress: () => onAuftrag(m, 'now', 'testphoto') },
                  ])
                }
              />
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
    </Animated.View>
  );
}

function Befund({ titel, text, datei }: { titel: string; text: string; datei?: string }) {
  if (!text) return null;
  return (
    <View style={styles.befund}>
      <Text style={{ ...font.caption, color: colors.ink3 }}>{titel}</Text>
      <Text style={{ ...font.footnote, color: colors.ink, fontFamily: 'Menlo' }}>{text}</Text>
      {datei ? <Text style={{ fontSize: 10.5, color: colors.ink3 }} numberOfLines={1}>{datei}</Text> : null}
    </View>
  );
}

function Knopf({ label, icon, onPress, primary, disabled, busy }: { label: string; icon?: any; onPress: () => void; primary?: boolean; disabled?: boolean; busy?: boolean }) {
  return (
    <Pressable
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [styles.knopf, primary && styles.knopfPrimary, (disabled || pressed) && { opacity: disabled ? 0.4 : 0.75 }]}
    >
      {busy ? <ActivityIndicator size="small" color={primary ? '#fff' : colors.ink} /> : icon ? <Ionicons name={icon} size={15} color={primary ? '#fff' : colors.ink} /> : null}
      <Text style={{ ...font.footnote, fontWeight: '600', color: primary ? '#fff' : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  verdictIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sums: { flexDirection: 'row', gap: space.md, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: space.lg, paddingVertical: space.md },
  paperTrack: { height: 5, borderRadius: 3, backgroundColor: colors.fill, marginTop: 6, overflow: 'hidden' },
  strip: { backgroundColor: colors.subtle, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  codeWarn: { backgroundColor: colors.errSoft, borderRadius: radius.md, padding: space.md, gap: 4 },
  row: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, overflow: 'hidden' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.md, paddingVertical: 11, minHeight: 56 },
  rowDot: { width: 9, height: 9, borderRadius: 5 },
  rowBody: { paddingHorizontal: space.md, paddingBottom: space.md, gap: 8 },
  befund: { backgroundColor: colors.subtle, borderRadius: 10, padding: 10, gap: 3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  knopf: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.fill },
  knopfPrimary: { backgroundColor: colors.brand },
  sectionTitle: { ...font.headline, color: colors.ink, paddingHorizontal: space.xs },
  hist: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: space.lg, paddingVertical: 11 },
  histLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineStrong },
  histDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  histTime: { ...font.caption, color: colors.ink3, fontVariant: ['tabular-nums'] },
});
