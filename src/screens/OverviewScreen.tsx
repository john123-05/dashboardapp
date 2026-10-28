import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Text, View } from 'react-native';
import { BarChart } from '../components/BarChart';
import { RushHours } from '../components/RushHours';
import { useWide } from '../components/layout';
import { Image } from 'expo-image';
import { fetchRecentPhotos } from '../lib/photoBrowser';
import { Screen } from '../components/Screen';
import { Button, Card, EmptyState, ErrorNote, Kpi, KpiGrid, KpiSkeleton, ListCard, Pill, Row, Section, Segmented, Skeleton } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import { loadHealth, loadKioskSales, loadLedger, loadMachineRevenue } from '../lib/data';
import { formatCents, formatDay, formatDayLong, formatNumber, formatPercent, formatTime, timeAgo } from '../lib/format';
import { aggregateByDate, getEffectiveScheduleForDate, todayInTimezone, toChartSeries } from '../lib/kioskSales';
import { canSee } from '../lib/permissions';
import { speedUnlocked, useEntitlements } from '../lib/entitlements';
import { fetchSpeedOverview } from '../lib/speed';
import { useData } from '../lib/useData';
import { colors, font, space } from '../theme';
import { CoachTarget } from '../components/coach/Coach';
import { tr } from '../i18n';

type Range = '7' | '14' | '30';

export function OverviewScreen() {
  const nav = useNavigation<any>();
  const { isOwner, isStaff, allowedPages, fullName } = useAuth();
  const wide = useWide();
  const { width: screenW } = useWindowDimensions();
  const { parkId, parkName, isKioskPark, timezone, openingHours, openingHoursConfig, kioskLoading } = usePark();
  const [range, setRange] = useState<Range>('14');
  const viewer = { isOwner, isStaff, allowedPages };

  const sales = useData(parkId ? `sales:${parkId}` : null, () => loadKioskSales(parkId!), [parkId], 90000);
  const revenue = useData(parkId ? `rev:${parkId}` : null, () => loadMachineRevenue(parkId!), [parkId], 90000);
  const health = useData(parkId ? `health:${parkId}` : null, () => loadHealth(parkId!), [parkId], 60000);
  const photos = useData(wide && parkId ? `ovphotos:${parkId}` : null, () => fetchRecentPhotos(parkId!, 4), [parkId, wide], 120000);
  const ledger = useData(parkId ? `ledger-latest:${parkId}` : null, () => loadLedger(parkId!, { from: todayInTimezone(timezone) }), [parkId, timezone], 90000);
  // Speedmessung: Wiederholungsfahrten aus der Bestenliste (dieser Monat).
  const ent = useEntitlements(parkId);
  const speedOn = speedUnlocked(parkId, ent.has);
  const speed = useData(parkId && speedOn ? `ovspeed:${parkId}` : null, () => fetchSpeedOverview(parkId!, 'month', ''), [parkId, speedOn], 300000);
  const repeat = speed.data?.enabled && speed.data.repeat && speed.data.repeat.guests > 0 && 'extraRides' in speed.data.repeat ? speed.data.repeat : null;
  const repeatPrice = speed.data?.sales?.priceCents ?? sales.data?.priceCents ?? null;
  const repeatKpi = repeat ? (
    <Kpi
      icon="repeat-outline"
      accent="#F59E0B"
      label={tr('Wiederholungsfahrten im Monat')}
      value={tr('+{0} Fahrten', formatNumber(repeat.extraRides))}
      sub={repeatPrice
        ? tr('{0} Fotos · {1} zusätzlich', formatNumber(repeat.extraPhotos), formatCents(repeat.extraPhotos * repeatPrice))
        : tr('{0} Fotos zusätzlich verkauft', formatNumber(repeat.extraPhotos))}
    />
  ) : null;

  const today = todayInTimezone(timezone);
  const days = useMemo(() => (sales.data ? aggregateByDate(sales.data.days, sales.data.priceCents ?? 0) : []), [sales.data]);
  const todayRow = days.find((d) => d.businessDate === today);
  const schedule = getEffectiveScheduleForDate(openingHoursConfig, today, openingHours);

  const revenueToday = revenue.data ? revenue.data.reduce((s, m) => s + m.heute.cent, 0) : null;
  const soldToday = revenue.data ? revenue.data.reduce((s, m) => s + m.heute.anzahl, 0) : (todayRow?.soldCount ?? null);
  const ridesToday = todayRow?.expectedCount ?? (health.data ? health.data.reduce((s, m) => s + (m.photos_taken_today ?? 0), 0) || null : null);
  const conversion = todayRow?.conversionRate ?? (ridesToday && soldToday !== null ? soldToday / ridesToday : null);
  const chart = useMemo(
    () => toChartSeries(days, Number(range)).map((p) => ({ label: p.label, value: p.revenueEur, caption: tr('{0} · {1} Fotos', formatDayLong(p.date), p.soldCount) })),
    [days, range],
  );

  const offline = (health.data ?? []).filter((m) => !m.reachable).length;
  const refreshing = sales.refreshing || health.refreshing || revenue.refreshing;
  const reload = () => {
    sales.reload();
    revenue.reload();
    health.reload();
    ledger.reload();
  };
  const loading = (sales.loading || kioskLoading) && !sales.data;
  const revenueMonth = revenue.data ? revenue.data.reduce((a, m) => a + m.monat.cent, 0) : null;
  const soldMonth = revenue.data ? revenue.data.reduce((a, m) => a + m.monat.anzahl, 0) : null;
  const soldTotal = revenue.data ? revenue.data.reduce((a, m) => a + m.gesamt.anzahl, 0) : null;
  const paper = (health.data ?? []).map((m) => m.paper_remaining).filter((v): v is number => typeof v === 'number');
  const hour = Number(new Intl.DateTimeFormat('de-DE', { hour: 'numeric', hour12: false, timeZone: timezone }).format(new Date()));
  const greeting = hour < 11 ? tr('Guten Morgen') : hour < 18 ? tr('Guten Tag') : tr('Guten Abend');
  const firstName = (fullName ?? '').split(' ')[0];
  const row = wide ? { flexDirection: 'row' as const, gap: space.lg, alignItems: 'flex-start' as const } : { gap: space.lg };
  const col = wide ? { flex: 1, minWidth: 0, gap: space.lg } : { gap: space.lg };

  return (
    <Screen page="overview"
      tabs
      actions
      title={wide && firstName ? `${greeting}, ${firstName}` : parkName ?? tr('Übersicht')}
      kicker={wide ? tr('Dashboard · {0}', parkName ?? '') : null}
      subtitle={`${schedule ? tr('Heute geöffnet {0} bis {1} Uhr', schedule.open, schedule.close) : openingHoursConfig || openingHours ? tr('Heute geschlossen') : formatDayLong(today)}`}
      refreshing={refreshing}
      onRefresh={reload}
    >
      {sales.error && !sales.data ? <ErrorNote text={sales.error} onRetry={reload} /> : null}

      {loading ? (
        <KpiSkeleton />
      ) : !isKioskPark && sales.data ? (
        <Card>
          <EmptyState icon="storefront-outline" title={tr('Online-Verkauf')} text={tr('Dieser Park verkauft über den Online-Shop. Umsatz und Käufe findest du in der Web-Ansicht.')} />
          <Button title={tr('Web-Ansicht öffnen')} icon="open-outline" kind="plain" onPress={() => nav.navigate('Web', { path: '/', title: tr('Übersicht') })} />
        </Card>
      ) : (
        <>
          {wide ? (
            <KpiGrid columns={screenW >= 1300 ? 6 : 3}>
              <Kpi icon="card-outline" label={tr('Umsatz heute')} accent="#3B82F6" value={formatCents(revenueToday ?? todayRow?.revenueCents ?? null)} />
              <Kpi icon="images-outline" label={tr('Fotos heute verkauft')} accent="#F59E0B" value={formatNumber(soldToday)} />
              <Kpi icon="pulse-outline" label={tr('Fotopapier')} accent="#14B8A6" value={paper.length ? `${Math.min(...paper)}` : '–'} sub={paper.length ? tr('Drucke übrig') : null} />
              <Kpi icon="calendar-outline" label={tr('Fotos im Monat verkauft')} accent="#64748B" value={formatNumber(soldMonth)} />
              <Kpi icon="cash-outline" label={tr('Monatsumsatz')} accent="#22C55E" value={formatCents(revenueMonth)} />
              {repeatKpi ?? <Kpi icon="camera-outline" label={tr('Fotos insgesamt verkauft')} accent="#A855F7" value={formatNumber(soldTotal)} />}
            </KpiGrid>
          ) : null}
          <CoachTarget id="overview.kpis">
          <KpiGrid>
            {!wide ? <Kpi icon="cash-outline" label={tr('Umsatz heute')} value={formatCents(revenueToday ?? todayRow?.revenueCents ?? null)} sub={soldToday !== null ? tr('{0} Fotos verkauft', formatNumber(soldToday)) : null} /> : null}
            {!wide ? <Kpi icon="images-outline" label={tr('Fotos verkauft')} value={formatNumber(soldToday)} sub={todayRow?.expectedCount ? tr('von {0} Fahrten', formatNumber(todayRow.expectedCount)) : null} /> : null}
            <Kpi icon="speedometer-outline" label={tr('Fahrten heute')} accent="#6366F1" value={formatNumber(ridesToday)} />
            <Kpi icon="trending-up-outline" label={tr('Kaufquote heute')} accent="#EC4899" value={formatPercent(conversion)} sub={conversion !== null && conversion < 0.05 ? tr('niedrig') : tr('Verkauft je Fahrt')} tone={conversion !== null && conversion < 0.05 ? 'warn' : undefined} />
            {wide ? <Kpi icon="hardware-chip-outline" label={tr('Automaten online')} accent="#EF4444" value={`${(health.data ?? []).filter((m) => m.reachable).length}/${(health.data ?? []).length}`} /> : null}
            {!wide ? repeatKpi : null}
          </KpiGrid>
          </CoachTarget>

          <View style={row}>
          <View style={col}>
          <CoachTarget id="overview.rush">
          <RushHours />
          </CoachTarget>
          </View>
          <View style={col}>

          {canSee('revenue', viewer) ? (
            <Section title={tr('Umsatz pro Tag')} action={tr('Details')} onAction={() => nav.navigate('Revenue')}>
              <Card>
                <View style={{ marginBottom: space.md }}>
                  <Segmented<Range> value={range} onChange={setRange} options={[{ value: '7', label: tr('7 Tage') }, { value: '14', label: tr('14 Tage') }, { value: '30', label: tr('30 Tage') }]} />
                </View>
                {chart.length > 0 ? (
                  <BarChart data={chart} format={(v) => formatCents(Math.round(v * 100))} />
                ) : sales.loading ? (
                  <Skeleton height={150} radius={12} />
                ) : (
                  <EmptyState title={tr('Noch keine Verkäufe')} text={tr('Sobald das erste Foto verkauft ist, erscheint hier der Verlauf.')} />
                )}
              </Card>
            </Section>
          ) : null}
          </View>
          </View>
        </>
      )}

      <View style={row}>
      <View style={col}>
      {canSee('health', viewer) ? (
        <Section title={tr('Systemzustand')} action={tr('Alle')} onAction={() => nav.navigate('Health')}>
          {health.data && health.data.length > 0 ? (
            <ListCard>
              {health.data.map((m, i) => (
                <Row
                  key={m.id}
                  icon="hardware-chip-outline"
                  iconBg={m.reachable ? colors.okSoft : colors.errSoft}
                  iconColor={m.reachable ? colors.ok : colors.err}
                  title={m.machine_label || m.machine_id}
                  subtitle={m.reachable ? tr('Zuletzt {0}', timeAgo(m.last_seen_at)) : tr('Offline · zuletzt {0}', timeAgo(m.last_seen_at))}
                  right={<Pill text={m.reachable ? tr('Online') : tr('Offline')} tone={m.reachable ? 'ok' : 'err'} />}
                  onPress={() => nav.navigate('Health')}
                  last={i === health.data!.length - 1}
                />
              ))}
            </ListCard>
          ) : health.loading ? (
            <Card>
              <Skeleton height={20} width="60%" />
              <Skeleton height={14} width="40%" style={{ marginTop: 10 }} />
            </Card>
          ) : (
            <Card>
              <Text style={{ ...font.subhead, color: colors.ink2 }}>{tr('Noch keine Automaten verbunden.')}</Text>
            </Card>
          )}
          {offline > 0 ? <Pill tone="err" icon="warning" text={offline === 1 ? tr('1 Automat offline') : tr('{0} Automaten offline', offline)} /> : null}
        </Section>
      ) : null}

      {canSee('purchases', viewer) && isKioskPark ? (
        <Section title={tr('Letzte Verkäufe')} action={tr('Alle')} onAction={() => nav.navigate('Purchases')}>
          {ledger.data && ledger.data.purchases.length > 0 ? (
            <ListCard>
              {ledger.data.purchases.slice(0, 5).map((p, i, arr) => (
                <Row
                  key={`${p.sold_at}-${p.bild_nr}-${i}`}
                  icon={p.method === 'bar' ? 'cash-outline' : 'card-outline'}
                  iconBg={colors.brandSoft}
                  title={p.claimed_name || (p.bild_nr ? tr('Foto {0}', p.bild_nr) : tr('Foto verkauft'))}
                  subtitle={tr('{0} Uhr{1}', formatTime(p.sold_at, timezone), p.card_scheme ? ` · ${p.card_scheme}` : '')}
                  right={<Text style={{ ...font.callout, color: colors.ink, fontVariant: ['tabular-nums'] }}>{formatCents(p.amount_cents ?? ledger.data!.priceCents)}</Text>}
                  last={i === arr.length - 1}
                />
              ))}
            </ListCard>
          ) : ledger.loading ? (
            <Card>
              <Skeleton height={18} width="70%" />
              <Skeleton height={14} width="45%" style={{ marginTop: 10 }} />
            </Card>
          ) : (
            <Card>
              <Row title={tr('Heute noch kein Verkauf')} subtitle={schedule ? tr('Die Bahn hat heute geöffnet.') : tr('Die Bahn hat heute geschlossen.')} icon="time-outline" last />
            </Card>
          )}
        </Section>
      ) : null}
      </View>
      {wide && canSee('photos', viewer) ? (
        <View style={col}>
          <Section title={tr('Letzte Fotos')} action={tr('Alle')} onAction={() => nav.navigate('Photos')}>
            <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(photos.data ?? []).map((p) => (
                <View key={p.id} style={{ width: '48%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.subtle }}>
                  {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={{ flex: 1 }} contentFit="cover" /> : null}
                </View>
              ))}
            </Card>
          </Section>
        </View>
      ) : null}
      </View>
    </Screen>
  );
}

export { Ionicons };
