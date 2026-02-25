import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { MetricCard } from '../../components/MetricCard';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import { formatCurrency, formatDate } from '../../lib/utils';
import { colors } from '../../theme/colors';

interface RevenueByDayRow {
  date: string;
  amount: number;
}

export function RevenueScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [rows, setRows] = useState<RevenueByDayRow[]>([]);

  const monthlyRevenue = useMemo(
    () => rows.reduce((total, row) => total + row.amount, 0),
    [rows]
  );

  useEffect(() => {
    loadRevenue();
  }, []);

  async function loadRevenue(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await invokeEdgeFunction<{
      total_revenue: number;
      revenue_by_day: RevenueByDayRow[];
    }>('stripe-revenue');

    if (result.error) {
      setError(result.error);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const dailyRows = result.data?.revenue_by_day ?? [];

    setTotalRevenue(Math.round((result.data?.total_revenue ?? 0) * 100));
    setRows(dailyRows);
    setError(null);
    setLoading(false);
    setRefreshing(false);
  }

  if (loading) {
    return <Screen title="Revenue"><ActivityIndicator color={colors.primary} /></Screen>;
  }

  return (
    <Screen
      title="Revenue"
      subtitle="Financial performance and daily trends"
      right={
        <Pressable style={styles.refreshButton} onPress={() => loadRevenue(true)}>
          <Text style={styles.refreshButtonText}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
        </Pressable>
      }
    >
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      <View style={styles.metricGrid}>
        <MetricCard label="Total Revenue" value={formatCurrency(totalRevenue)} />
        <MetricCard label="30-Day Revenue" value={`$${monthlyRevenue.toFixed(2)}`} />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Daily Revenue</Text>
        {rows.length === 0 ? (
          <Text style={styles.muted}>No data from Stripe revenue function.</Text>
        ) : (
          rows
            .slice()
            .reverse()
            .slice(0, 30)
            .map((row) => (
              <View key={`${row.date}-${row.amount}`} style={styles.row}>
                <Text style={styles.rowLabel}>{formatDate(row.date)}</Text>
                <Text style={styles.rowValue}>${row.amount.toFixed(2)}</Text>
              </View>
            ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  refreshButton: {
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  refreshButtonText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 14,
  },
  rowValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
