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
import { tr } from '../i18n';

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
    () => toChartSeries(days, Number(range)).map((p) => ({ label: p.label, value: p.revenueEur, caption: tr('{0} · {1} Fotos', formatDayLong(p.date), p.soldCount) })),
    [days, range],
  );
  const conversion = totals.expected && totals.expected > 0 ? totals.sold / totals.expected : null;
  const loading = sales.loading && !sales.data;

  return (
    <Screen page="revenue"
      tabs
      actions
      title={tr('Umsatz')}
      subtitle={isKioskPark ? tr('Verkaufte Fotos am Automaten') : null}
      refreshing={sales.refreshing || revenue.refreshing}
      onRefresh={() => {
        sales.reload();
        revenue.reload();
      }}
    >
      <CoachTarget id="revenue.range">
        <Segmented<Range> value={range} onChange={setRange} options={[{ value: '7', label: tr('7 Tage') }, { value: '30', label: tr('30 Tage') }, { value: '90', label: tr('90 Tage') }]} />
      </CoachTarget>
      {sales.error && !sales.data ? <ErrorNote text={sales.error} onRetry={sales.reload} /> : null}

      {loading ? (
        <KpiSkeleton />
      ) : (
        <KpiGrid>
          <Kpi icon="cash-outline" label={tr('Umsatz')} value={formatCents(totals.revenueCents)} sub={tr('letzte {0} Tage', range)} />
          <Kpi icon="images-outline" label={tr('Fotos verkauft')} value={formatNumber(totals.sold)} />
          <Kpi icon="speedometer-outline" label={tr('Fahrten')} value={formatNumber(totals.expected)} />
          <Kpi icon="trending-up-outline" label={tr('Kaufquote')} value={formatPercent(conversion)} />
        </KpiGrid>
      )}

      <Section title={tr('Verlauf')}>
        <Card>
          {chart.length > 0 ? <BarChart data={chart} format={(v) => formatCents(Math.round(v * 100))} /> : loading ? <Skeleton height={170} radius={12} /> : <EmptyState title={tr('Noch keine Verkäufe')} />}
        </Card>
      </Section>

      {revenue.data && revenue.data.length > 0 ? (
        <Section title={tr('Pro Automat')}>
          {revenue.data.map((m) => (
            <Card key={m.machine_id} padded={false}>
              <View style={{ padding: space.lg, paddingBottom: space.sm }}>
                <Text style={{ ...font.headline, color: colors.ink }} numberOfLines={1}>
                  {m.machine_label || m.machine_id}
                </Text>
                <Text style={{ ...font.footnote, color: colors.ink2 }} numberOfLines={1}>
                  {m.card_only ? tr('nur Kartenzahlung') : tr('{0} Karte · {1} bar', formatNumber(m.karte_anzahl), formatNumber(m.bar_anzahl))}
                  {m.unbekannt_anzahl > 0 ? tr(' · {0} unbekannt', formatNumber(m.unbekannt_anzahl)) : ''}
                </Text>
              </View>
              {(['heute', 'woche', 'monat', 'gesamt'] as const).map((k, i) => (
                <Row
                  key={k}
                  title={{ heute: tr('Heute'), woche: tr('Diese Woche'), monat: tr('Dieser Monat'), gesamt: tr('Gesamt') }[k]}
                  subtitle={tr('{0} Fotos', formatNumber(m[k].anzahl))}
                  right={<Text style={{ ...font.headline, color: colors.ink, fontVariant: ['tabular-nums'] }}>{formatCents(m[k].cent)}</Text>}
                  last={i === 3}
                />
              ))}
            </Card>
          ))}
        </Section>
      ) : null}

      {periodDays.length > 0 ? (
        <Section title={tr('Tage')}>
          <ListCard>
            {periodDays.slice(0, 31).map((d, i, arr) => (
              <Row
                key={d.businessDate}
                title={formatDay(d.businessDate)}
                subtitle={tr('{0} Fotos{1}', formatNumber(d.soldCount), d.expectedCount ? tr(' von {0} Fahrten', formatNumber(d.expectedCount)) : '')}
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
