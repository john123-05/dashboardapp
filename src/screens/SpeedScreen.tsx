import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Locked, SPEED_OFFER } from '../components/Locked';
import { Screen } from '../components/Screen';
import { speedUnlocked, useEntitlements } from '../lib/entitlements';
import { Card, EmptyState, ErrorNote, Kpi, KpiGrid, KpiSkeleton, ListCard, Pill, Segmented } from '../components/ui';
import { tapHaptic } from '../components/haptics';
import { usePark } from '../contexts/ParkContext';
import { formatDayLong, formatNumber, formatTime } from '../lib/format';
import { todayInTimezone } from '../lib/kioskSales';
import { fetchSpeedOverview, setSpeedResultHidden, shiftDate, type SpeedPeriod, type SpeedRow } from '../lib/speed';
import { useData } from '../lib/useData';
import { colors, font, space, TAP } from '../theme';

const PERIODS: { value: SpeedPeriod; label: string }[] = [
  { value: 'day', label: 'Tag' },
  { value: 'week', label: 'Woche' },
  { value: 'month', label: 'Monat' },
  { value: 'all', label: 'Allzeit' },
];
const kmh = (v: number | null | undefined) => (v === null || v === undefined ? '–' : `${v.toFixed(1).replace('.', ',')} km/h`);
const MEDAL = ['#E8B000', '#9AA3AB', '#C98A4B'];

function maskEmail(e: string) {
  const [u, d] = e.split('@');
  return d ? `${u.slice(0, 2)}…@${d}` : e;
}

export function SpeedScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { parkId, timezone } = usePark();
  const [period, setPeriod] = useState<SpeedPeriod>('day');
  const [date, setDate] = useState(todayInTimezone(timezone));
  const data = useData(parkId ? `speed:${parkId}:${period}:${date}` : null, () => fetchSpeedOverview(parkId!, period, date), [parkId, period, date], 60000);
  const o = data.data;
  const today = todayInTimezone(timezone);
  const ent = useEntitlements(parkId);
  const unlocked = speedUnlocked(parkId, ent.has);

  function aktion(r: SpeedRow) {
    tapHaptic();
    const label = r.hidden ? 'Wieder einblenden' : 'Auf der Bestenliste ausblenden';
    const run = async () => {
      try {
        await setSpeedResultHidden(parkId!, r.id, !r.hidden);
        data.reload();
      } catch (e) {
        Alert.alert('Fehler', e instanceof Error ? e.message : 'Unbekannt');
      }
    };
    if (Platform.OS === 'ios') ActionSheetIOS.showActionSheetWithOptions({ options: [label, 'Abbrechen'], cancelButtonIndex: 1, destructiveButtonIndex: r.hidden ? undefined : 0 }, (i) => i === 0 && void run());
    else Alert.alert(label, undefined, [{ text: 'Abbrechen', style: 'cancel' }, { text: 'OK', onPress: () => void run() }]);
  }

  const zeitraum = period === 'all' ? 'Alle Fahrten' : period === 'day' ? formatDayLong(date) : o?.from && o?.to ? `${formatDayLong(o.from)} bis ${formatDayLong(o.to)}` : formatDayLong(date);

  return (
    <Screen page="speed" title="Speedmessung" subtitle="Bestenliste und Geschwindigkeiten" onBack={navigation.goBack} refreshing={data.refreshing} onRefresh={data.reload}>
      {!unlocked && !ent.loading ? <Locked {...SPEED_OFFER} /> : null}
      {unlocked ? (<>
      <Segmented<SpeedPeriod> value={period} onChange={(p) => { setPeriod(p); setDate(today); }} options={PERIODS} />
      {period !== 'all' ? (
        <View style={styles.dateRow}>
          <Pressable onPress={() => setDate(shiftDate(date, period, -1))} style={styles.arrow} accessibilityLabel="Zurück">
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </Pressable>
          <Text style={{ ...font.callout, color: colors.ink, flex: 1, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>
            {zeitraum}
          </Text>
          <Pressable disabled={date >= today} onPress={() => setDate(shiftDate(date, period, 1))} style={[styles.arrow, date >= today && { opacity: 0.3 }]} accessibilityLabel="Weiter">
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </Pressable>
        </View>
      ) : null}
      {data.error && !o ? <ErrorNote text={data.error} onRetry={data.reload} /> : null}
      {data.loading && !o ? (
        <KpiSkeleton />
      ) : o ? (
        <KpiGrid>
          <Kpi icon="flag-outline" label="Fahrten gemessen" value={formatNumber(o.stats.count)} />
          <Kpi icon="flash-outline" label="Schnellste" value={kmh(o.stats.fastest)} />
          <Kpi icon="speedometer-outline" label="Durchschnitt" value={kmh(o.stats.average)} />
          <Kpi icon="trending-down-outline" label="Langsamste" value={kmh(o.stats.slowest)} />
        </KpiGrid>
      ) : null}

      {o && o.rows.length > 0 ? (
        <ListCard>
          {o.rows.map((r, i) => (
            <Pressable key={r.id} onPress={() => aktion(r)} style={({ pressed }) => [styles.row, i > 0 && styles.line, pressed && { backgroundColor: colors.fill }, r.hidden && { opacity: 0.45 }]}>
              <View style={[styles.rank, r.rank <= 3 && { backgroundColor: MEDAL[r.rank - 1] }]}>
                <Text style={[styles.rankText, r.rank <= 3 && { color: '#fff' }]}>{r.rank}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...font.callout, color: colors.ink, fontWeight: '600' }} numberOfLines={1}>
                  {r.displayName || maskEmail(r.email)}
                </Text>
                <Text style={{ ...font.footnote, color: colors.ink2 }} numberOfLines={1}>
                  {period === 'day' ? `${formatTime(r.capturedAt, timezone)} Uhr` : formatDayLong(r.day)}
                  {r.hidden ? ' · ausgeblendet' : ''}
                </Text>
              </View>
              <Text style={styles.speed} numberOfLines={1}>
                {kmh(r.speedKmh)}
              </Text>
            </Pressable>
          ))}
        </ListCard>
      ) : o && !data.loading ? (
        <Card>
          <EmptyState icon="speedometer-outline" title="Noch keine Fahrten" text="In diesem Zeitraum wurde keine Fahrt mit Foto-Abholung gemessen." />
        </Card>
      ) : null}
      {o && o.rows.length > 0 ? <Text style={{ ...font.caption, color: colors.ink3, textAlign: 'center' }}>Antippen, um ein Ergebnis auf der Bestenliste aus- oder einzublenden.</Text> : null}
      {o && !o.enabled ? <Pill tone="warn" text="Die Bestenliste ist für diesen Park noch nicht freigeschaltet." /> : null}
      </>) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 4 },
  arrow: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg, minHeight: 60 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineStrong },
  rank: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontWeight: '800', color: colors.ink2, fontVariant: ['tabular-nums'] },
  speed: { ...font.headline, color: colors.ink, fontVariant: ['tabular-nums'] },
});
