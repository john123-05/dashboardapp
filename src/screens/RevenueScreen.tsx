import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { BarChart } from '../components/BarChart';
import { Screen } from '../components/Screen';
import { Card, EmptyState, ErrorNote, Kpi, KpiGrid, KpiSkeleton, ListCard, Row, Section, Segmented, Skeleton } from '../components/ui';
import { usePark } from '../contexts/ParkContext';
import { loadKioskSales, loadMachineRevenue } from '../lib/data';
import { formatCents, formatDay, formatDayLong, formatNumber, formatPercent } from '../lib/format';
import { aggregateByDate, sumDays, toChartSeries } from '../lib/kioskSales';
import { useData } from '../lib/useData';
import { colors, font, space } from '../theme';
import { CoachTarget } from '../components/coach/Coach';

type Range = '7' | '30' | '90';

export function RevenueScreen() {
  const { parkId, isKioskPark } = usePark();
  const [range, setRange] = useState<Range>('30');
  const sales = useData(parkId ? `sales:${parkId}` : null, () => loadKioskSales(parkId!), [parkId], 120000);
  const revenue = useData(parkId ? `rev:${parkId}` : null, () => loadMachineRevenue(parkId!), [parkId], 120000);

  const days = useMemo(() => (sales.data ? aggregateByDate(sales.data.days, sales.data.priceCents ?? 0) : []), [sales.data]);
  const periodDays = useMemo(() => days.slice(0, Number(range)), [days, range]);
  const totals = useMemo(() => sumDays(periodDays), [periodDays]);
  const chart = useMemo(
    () => toChartSeries(days, Number(range)).map((p) => ({ label: p.label, value: p.revenueEur, caption: `${formatDayLong(p.date)} · ${p.soldCount} Fotos` })),
    [days, range],
  );
  const conversion = totals.expected && totals.expected > 0 ? totals.sold / totals.expected : null;
  const loading = sales.loading && !sales.data;

  return (
    <Screen page="revenue"
      tabs
      actions
      title="Umsatz"
      subtitle={isKioskPark ? 'Verkaufte Fotos am Automaten' : null}
      refreshing={sales.refreshing || revenue.refreshing}
      onRefresh={() => {
        sales.reload();
        revenue.reload();
      }}
    >
      <CoachTarget id="revenue.range">
        <Segmented<Range> value={range} onChange={setRange} options={[{ value: '7', label: '7 Tage' }, { value: '30', label: '30 Tage' }, { value: '90', label: '90 Tage' }]} />
      </CoachTarget>
      {sales.error && !sales.data ? <ErrorNote text={sales.error} onRetry={sales.reload} /> : null}

      {loading ? (
        <KpiSkeleton />
      ) : (
        <KpiGrid>
          <Kpi icon="cash-outline" label="Umsatz" value={formatCents(totals.revenueCents)} sub={`letzte ${range} Tage`} />
          <Kpi icon="images-outline" label="Fotos verkauft" value={formatNumber(totals.sold)} />
          <Kpi icon="speedometer-outline" label="Fahrten" value={formatNumber(totals.expected)} />
          <Kpi icon="trending-up-outline" label="Kaufquote" value={formatPercent(conversion)} />
        </KpiGrid>
      )}

      <Section title="Verlauf">
        <Card>
          {chart.length > 0 ? <BarChart data={chart} format={(v) => formatCents(Math.round(v * 100))} /> : loading ? <Skeleton height={170} radius={12} /> : <EmptyState title="Noch keine Verkäufe" />}
        </Card>
      </Section>

      {revenue.data && revenue.data.length > 0 ? (
        <Section title="Pro Automat">
          {revenue.data.map((m) => (
            <Card key={m.machine_id} padded={false}>
              <View style={{ padding: space.lg, paddingBottom: space.sm }}>
                <Text style={{ ...font.headline, color: colors.ink }} numberOfLines={1}>
                  {m.machine_label || m.machine_id}
                </Text>
                <Text style={{ ...font.footnote, color: colors.ink2 }} numberOfLines={1}>
                  {m.card_only ? 'nur Kartenzahlung' : `${formatNumber(m.karte_anzahl)} Karte · ${formatNumber(m.bar_anzahl)} bar`}
                  {m.unbekannt_anzahl > 0 ? ` · ${formatNumber(m.unbekannt_anzahl)} unbekannt` : ''}
                </Text>
              </View>
              {(['heute', 'woche', 'monat', 'gesamt'] as const).map((k, i) => (
                <Row
                  key={k}
                  title={{ heute: 'Heute', woche: 'Diese Woche', monat: 'Dieser Monat', gesamt: 'Gesamt' }[k]}
                  subtitle={`${formatNumber(m[k].anzahl)} Fotos`}
                  right={<Text style={{ ...font.headline, color: colors.ink, fontVariant: ['tabular-nums'] }}>{formatCents(m[k].cent)}</Text>}
                  last={i === 3}
                />
              ))}
            </Card>
          ))}
        </Section>
      ) : null}

      {periodDays.length > 0 ? (
        <Section title="Tage">
          <ListCard>
            {periodDays.slice(0, 31).map((d, i, arr) => (
              <Row
                key={d.businessDate}
                title={formatDay(d.businessDate)}
                subtitle={`${formatNumber(d.soldCount)} Fotos${d.expectedCount ? ` von ${formatNumber(d.expectedCount)} Fahrten` : ''}`}
                right={
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ ...font.callout, color: colors.ink, fontVariant: ['tabular-nums'] }}>{formatCents(d.revenueCents)}</Text>
                    {d.conversionRate !== null ? <Text style={{ ...font.caption, color: colors.ink2 }}>{formatPercent(d.conversionRate)}</Text> : null}
                  </View>
                }
                last={i === arr.length - 1 || i === 30}
              />
            ))}
          </ListCard>
        </Section>
      ) : null}
    </Screen>
  );
}
