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
import { useData } from '../lib/useData';
import { colors, font, space } from '../theme';

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

  const today = todayInTimezone(timezone);
  const days = useMemo(() => (sales.data ? aggregateByDate(sales.data.days, sales.data.priceCents ?? 0) : []), [sales.data]);
  const todayRow = days.find((d) => d.businessDate === today);
  const schedule = getEffectiveScheduleForDate(openingHoursConfig, today, openingHours);

  const revenueToday = revenue.data ? revenue.data.reduce((s, m) => s + m.heute.cent, 0) : null;
  const soldToday = revenue.data ? revenue.data.reduce((s, m) => s + m.heute.anzahl, 0) : (todayRow?.soldCount ?? null);
  const ridesToday = todayRow?.expectedCount ?? (health.data ? health.data.reduce((s, m) => s + (m.photos_taken_today ?? 0), 0) || null : null);
  const conversion = todayRow?.conversionRate ?? (ridesToday && soldToday !== null ? soldToday / ridesToday : null);
  const chart = useMemo(
    () => toChartSeries(days, Number(range)).map((p) => ({ label: p.label, value: p.revenueEur, caption: `${formatDayLong(p.date)} · ${p.soldCount} Fotos` })),
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
  const greeting = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
  const firstName = (fullName ?? '').split(' ')[0];
  const row = wide ? { flexDirection: 'row' as const, gap: space.lg, alignItems: 'flex-start' as const } : { gap: space.lg };
  const col = wide ? { flex: 1, minWidth: 0, gap: space.lg } : { gap: space.lg };

  return (
    <Screen page="overview"
      tabs
      actions
      title={wide && firstName ? `${greeting}, ${firstName}` : parkName ?? 'Übersicht'}
      kicker={wide ? `Dashboard · ${parkName ?? ''}` : null}
      subtitle={`${schedule ? `Heute geöffnet ${schedule.open} bis ${schedule.close} Uhr` : openingHoursConfig || openingHours ? 'Heute geschlossen' : formatDayLong(today)}`}
      refreshing={refreshing}
      onRefresh={reload}
    >
      {sales.error && !sales.data ? <ErrorNote text={sales.error} onRetry={reload} /> : null}

      {loading ? (
        <KpiSkeleton />
      ) : !isKioskPark && sales.data ? (
        <Card>
          <EmptyState icon="storefront-outline" title="Online-Verkauf" text="Dieser Park verkauft über den Online-Shop. Umsatz und Käufe findest du in der Web-Ansicht." />
          <Button title="Web-Ansicht öffnen" icon="open-outline" kind="plain" onPress={() => nav.navigate('Web', { path: '/', title: 'Übersicht' })} />
        </Card>
      ) : (
        <>
          {wide ? (
            <KpiGrid columns={screenW >= 1300 ? 6 : 3}>
              <Kpi icon="card-outline" label="Umsatz heute" accent="#3B82F6" value={formatCents(revenueToday ?? todayRow?.revenueCents ?? null)} />
              <Kpi icon="images-outline" label="Fotos heute verkauft" accent="#F59E0B" value={formatNumber(soldToday)} />
              <Kpi icon="pulse-outline" label="Fotopapier" accent="#14B8A6" value={paper.length ? `${Math.min(...paper)}` : '–'} sub={paper.length ? 'Drucke übrig' : null} />
              <Kpi icon="calendar-outline" label="Fotos im Monat verkauft" accent="#64748B" value={formatNumber(soldMonth)} />
              <Kpi icon="cash-outline" label="Monatsumsatz" accent="#22C55E" value={formatCents(revenueMonth)} />
              <Kpi icon="camera-outline" label="Fotos insgesamt verkauft" accent="#A855F7" value={formatNumber(soldTotal)} />
            </KpiGrid>
          ) : null}
          <KpiGrid>
            {!wide ? <Kpi icon="cash-outline" label="Umsatz heute" value={formatCents(revenueToday ?? todayRow?.revenueCents ?? null)} sub={soldToday !== null ? `${formatNumber(soldToday)} Fotos verkauft` : null} /> : null}
            {!wide ? <Kpi icon="images-outline" label="Fotos verkauft" value={formatNumber(soldToday)} sub={todayRow?.expectedCount ? `von ${formatNumber(todayRow.expectedCount)} Fahrten` : null} /> : null}
            <Kpi icon="speedometer-outline" label="Fahrten heute" accent="#6366F1" value={formatNumber(ridesToday)} />
            <Kpi icon="trending-up-outline" label="Kaufquote heute" accent="#EC4899" value={formatPercent(conversion)} sub={conversion !== null && conversion < 0.05 ? 'niedrig' : 'Verkauft je Fahrt'} tone={conversion !== null && conversion < 0.05 ? 'warn' : undefined} />
            {wide ? <Kpi icon="hardware-chip-outline" label="Automaten online" accent="#EF4444" value={`${(health.data ?? []).filter((m) => m.reachable).length}/${(health.data ?? []).length}`} /> : null}
          </KpiGrid>

          <View style={row}>
          <View style={col}>
          <RushHours />
          </View>
          <View style={col}>

          {canSee('revenue', viewer) ? (
            <Section title="Umsatz pro Tag" action="Details" onAction={() => nav.navigate('Revenue')}>
              <Card>
                <View style={{ marginBottom: space.md }}>
                  <Segmented<Range> value={range} onChange={setRange} options={[{ value: '7', label: '7 Tage' }, { value: '14', label: '14 Tage' }, { value: '30', label: '30 Tage' }]} />
                </View>
                {chart.length > 0 ? (
                  <BarChart data={chart} format={(v) => formatCents(Math.round(v * 100))} />
                ) : sales.loading ? (
                  <Skeleton height={150} radius={12} />
                ) : (
                  <EmptyState title="Noch keine Verkäufe" text="Sobald das erste Foto verkauft ist, erscheint hier der Verlauf." />
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
        <Section title="Systemzustand" action="Alle" onAction={() => nav.navigate('Health')}>
          {health.data && health.data.length > 0 ? (
            <ListCard>
              {health.data.map((m, i) => (
                <Row
                  key={m.id}
                  icon="hardware-chip-outline"
                  iconBg={m.reachable ? colors.okSoft : colors.errSoft}
                  iconColor={m.reachable ? colors.ok : colors.err}
                  title={m.machine_label || m.machine_id}
                  subtitle={m.reachable ? `Zuletzt ${timeAgo(m.last_seen_at)}` : `Offline seit ${timeAgo(m.last_seen_at).replace('vor ', '')}`}
                  right={<Pill text={m.reachable ? 'Online' : 'Offline'} tone={m.reachable ? 'ok' : 'err'} />}
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
              <Text style={{ ...font.subhead, color: colors.ink2 }}>Noch keine Automaten verbunden.</Text>
            </Card>
          )}
          {offline > 0 ? <Pill tone="err" icon="warning" text={`${offline} Automat${offline === 1 ? '' : 'en'} offline`} /> : null}
        </Section>
      ) : null}

      {canSee('purchases', viewer) && isKioskPark ? (
        <Section title="Letzte Verkäufe" action="Alle" onAction={() => nav.navigate('Purchases')}>
          {ledger.data && ledger.data.purchases.length > 0 ? (
            <ListCard>
              {ledger.data.purchases.slice(0, 5).map((p, i, arr) => (
                <Row
                  key={`${p.sold_at}-${p.bild_nr}-${i}`}
                  icon={p.method === 'bar' ? 'cash-outline' : 'card-outline'}
                  iconBg={colors.brandSoft}
                  title={p.claimed_name || (p.bild_nr ? `Foto ${p.bild_nr}` : 'Foto verkauft')}
                  subtitle={`${formatTime(p.sold_at, timezone)} Uhr${p.card_scheme ? ` · ${p.card_scheme}` : ''}`}
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
              <Row title="Heute noch kein Verkauf" subtitle={schedule ? 'Die Bahn hat heute geöffnet.' : 'Die Bahn hat heute geschlossen.'} icon="time-outline" last />
            </Card>
          )}
        </Section>
      ) : null}
      </View>
      {wide && canSee('photos', viewer) ? (
        <View style={col}>
          <Section title="Letzte Fotos" action="Alle" onAction={() => nav.navigate('Photos')}>
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
