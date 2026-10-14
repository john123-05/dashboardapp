import { Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card, EmptyState, ErrorNote, Kpi, KpiGrid, Pill, Row, Skeleton } from '../components/ui';
import { usePark } from '../contexts/ParkContext';
import { loadHealth, type HealthItem, type HealthMachine } from '../lib/data';
import { formatNumber, formatPercent, timeAgo } from '../lib/format';
import { benenne } from '../lib/geraeteNamen';
import { useData } from '../lib/useData';
import { colors, font, radius, space } from '../theme';

function statusTone(status: string): 'ok' | 'warn' | 'err' | 'neutral' {
  if (status === 'ok' || status === 'operational') return 'ok';
  if (status === 'down' || status === 'error' || status === 'failed') return 'err';
  if (status === 'degraded' || status === 'warning' || status === 'off') return 'warn';
  return 'neutral';
}
const toneLabel = { ok: 'In Ordnung', warn: 'Eingeschränkt', err: 'Störung', neutral: 'Unbekannt' } as const;

function PaperBar({ remaining, capacity, warn }: { remaining: number; capacity: number | null; warn: number }) {
  const cap = capacity && capacity > 0 ? capacity : Math.max(remaining, 400);
  const ratio = Math.max(0, Math.min(1, remaining / cap));
  const low = remaining <= warn;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ ...font.footnote, color: colors.ink2 }}>Papier</Text>
        <Text style={{ ...font.footnote, color: low ? colors.err : colors.ink2, fontWeight: '600' }}>
          {formatNumber(remaining)} Drucke übrig
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(16,24,40,0.07)', overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(3, ratio * 100)}%`, height: 8, borderRadius: 4, backgroundColor: low ? colors.err : colors.ok }} />
      </View>
    </View>
  );
}

function MachineCard({ m }: { m: HealthMachine }) {
  const name = m.machine_label || m.machine_id;
  const devices: HealthItem[] = [...(m.probes ?? []), ...(m.devices ?? [])].filter((d) => !(m.ausgeblendet ?? []).includes(d.name));
  const seen = new Set<string>();
  const rows = devices.filter((d) => {
    const k = benenne(d.name).klar;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return (
    <Card padded={false}>
      <View style={{ padding: space.lg, gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ ...font.headline, color: colors.ink }} numberOfLines={1}>
              {name}
            </Text>
            <Text style={{ ...font.footnote, color: colors.ink2 }} numberOfLines={1}>
              {m.reachable ? `Zuletzt ${timeAgo(m.last_seen_at)}` : `Offline, zuletzt ${timeAgo(m.last_seen_at)}`}
              {m.agent_version ? ` · v${m.agent_version}` : ''}
            </Text>
          </View>
          <Pill text={m.reachable ? 'Online' : 'Offline'} tone={m.reachable ? 'ok' : 'err'} />
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <MiniStat label="Fahrten" value={formatNumber(m.photos_taken_today)} />
          <MiniStat label="Verkauft" value={formatNumber(m.photos_sold_today)} />
          <MiniStat label="Quote" value={formatPercent(m.photo_conversion_today)} />
        </View>

        {typeof m.paper_remaining === 'number' ? <PaperBar remaining={m.paper_remaining} capacity={m.paper_capacity ?? null} warn={m.paper_warn_remaining ?? 30} /> : null}

        {typeof m.queue_count === 'number' && m.queue_count > 0 ? <Pill tone="warn" icon="cloud-upload-outline" text={`${m.queue_count} Fotos warten auf den Upload`} /> : null}
        {m.customer_code_registered === false ? <Pill tone="err" icon="warning" text={`Abholcode ${m.customer_code ?? ''} nicht im Park eingetragen`} /> : null}
        {(m.coin_warnings ?? []).map((c) => (
          <Pill key={c.cent} tone={c.stufe === 'leer' ? 'err' : 'warn'} icon="logo-euro" text={c.text} />
        ))}
      </View>

      {rows.length > 0 ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
          {rows.map((d, i) => {
            const tone = statusTone(d.status);
            return (
              <Row
                key={`${d.name}-${i}`}
                title={benenne(d.name).klar}
                subtitle={d.plain || d.detail || null}
                right={<Pill text={toneLabel[tone]} tone={tone} />}
                last={i === rows.length - 1}
              />
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(16,24,40,0.04)', borderRadius: radius.md, paddingVertical: space.sm, paddingHorizontal: space.md }}>
      <Text style={{ ...font.caption, color: colors.ink2 }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ ...font.headline, color: colors.ink, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
    </View>
  );
}

export function MachinesScreen() {
  const { parkId } = usePark();
  const health = useData(parkId ? `health:${parkId}` : null, () => loadHealth(parkId!), [parkId], 30000);
  const machines = health.data ?? [];
  const online = machines.filter((m) => m.reachable).length;

  return (
    <Screen
      tabs
      title="Anlagen"
      subtitle={machines.length ? `${online} von ${machines.length} online` : null}
      refreshing={health.refreshing}
      onRefresh={health.reload}
    >
      {health.error && !health.data ? <ErrorNote text={health.error} onRetry={health.reload} /> : null}
      {health.loading && !health.data ? (
        <>
          <Card>
            <Skeleton height={20} width="50%" />
            <Skeleton height={60} style={{ marginTop: 14 }} radius={12} />
          </Card>
        </>
      ) : null}
      {machines.map((m) => (
        <MachineCard key={m.id} m={m} />
      ))}
      {!health.loading && machines.length === 0 && !health.error ? (
        <Card>
          <EmptyState icon="hardware-chip-outline" title="Keine Automaten" text="Für diesen Park ist noch kein Automat verbunden." />
        </Card>
      ) : null}
    </Screen>
  );
}

export { KpiGrid, Kpi };
