import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card, EmptyState, ErrorNote, Kpi, KpiGrid, KpiSkeleton, ListCard, Pill, Row, Section, Segmented } from '../components/ui';
import { usePark } from '../contexts/ParkContext';
import { loadLedger } from '../lib/data';
import { formatCents, formatDayLong, formatNumber, formatTime } from '../lib/format';
import { daysAgoInTimezone, todayInTimezone } from '../lib/kioskSales';
import { useData } from '../lib/useData';
import { colors, font } from '../theme';

type Range = '0' | '7' | '30';

export function PurchasesScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { parkId, timezone } = usePark();
  const [range, setRange] = useState<Range>('7');
  const from = range === '0' ? todayInTimezone(timezone) : daysAgoInTimezone(timezone, Number(range));
  const ledger = useData(parkId ? `ledger:${parkId}:${range}` : null, () => loadLedger(parkId!, { from }), [parkId, range, timezone]);

  const purchases = ledger.data?.purchases ?? [];
  const price = ledger.data?.priceCents ?? null;
  const total = purchases.reduce((s, p) => s + (p.amount_cents ?? price ?? 0), 0);
  const card = purchases.filter((p) => p.method === 'karte').length;
  const cash = purchases.filter((p) => p.method === 'bar').length;

  const groups = useMemo(() => {
    const map = new Map<string, typeof purchases>();
    for (const p of purchases) {
      const key = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(p.sold_at));
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [purchases, timezone]);

  return (
    <Screen title="Käufe" subtitle="Einzelne Verkäufe am Automaten" onBack={navigation.goBack} refreshing={ledger.refreshing} onRefresh={ledger.reload}>
      <Segmented<Range> value={range} onChange={setRange} options={[{ value: '0', label: 'Heute' }, { value: '7', label: '7 Tage' }, { value: '30', label: '30 Tage' }]} />
      {ledger.error && !ledger.data ? <ErrorNote text={ledger.error} onRetry={ledger.reload} /> : null}
      {ledger.loading && !ledger.data ? (
        <KpiSkeleton />
      ) : (
        <KpiGrid>
          <Kpi icon="receipt-outline" label="Verkäufe" value={formatNumber(purchases.length)} />
          <Kpi icon="cash-outline" label="Umsatz" value={formatCents(total)} />
          <Kpi icon="card-outline" label="Karte" value={formatNumber(card)} />
          <Kpi icon="wallet-outline" label="Bar" value={formatNumber(cash)} />
        </KpiGrid>
      )}
      {groups.map(([day, rows]) => (
        <Section key={day} title={formatDayLong(day)}>
          <ListCard>
            {rows.map((p, i) => (
              <Row
                key={`${p.sold_at}-${p.bild_nr}-${i}`}
                icon={p.method === 'bar' ? 'cash-outline' : 'card-outline'}
                title={p.claimed_name || p.claimed_email || (p.bild_nr ? `Foto ${p.bild_nr}` : 'Foto verkauft')}
                subtitle={`${formatTime(p.sold_at, timezone)} Uhr${p.bild_nr ? ` · Bild ${p.bild_nr}` : ''}${p.card_scheme ? ` · ${p.card_scheme}` : ''}`}
                right={
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ ...font.callout, color: colors.ink, fontVariant: ['tabular-nums'] }}>{formatCents(p.amount_cents ?? price)}</Text>
                    {p.claimed_email ? <Pill text="abgeholt" tone="ok" /> : null}
                  </View>
                }
                last={i === rows.length - 1}
              />
            ))}
          </ListCard>
        </Section>
      ))}
      {!ledger.loading && purchases.length === 0 && !ledger.error ? (
        <Card>
          <EmptyState icon="receipt-outline" title="Keine Verkäufe" text="In diesem Zeitraum wurde noch kein Foto verkauft." />
        </Card>
      ) : null}
      {ledger.data?.truncated ? <Text style={{ ...font.footnote, color: colors.ink2, textAlign: 'center' }}>Es werden nur die neuesten Verkäufe angezeigt.</Text> : null}
    </Screen>
  );
}
