import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { MetricCard } from '../../components/MetricCard';
import { RevenueLineChart } from '../../components/RevenueLineChart';
import { useI18n } from '../../contexts/LanguageContext';
import { usePark } from '../../contexts/ParkContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import { formatCurrency, formatDate } from '../../lib/utils';

interface RevenueByDayRow {
  date: string;
  amount: number;
}

interface PurchaseRow {
  amount: number;
  status: string;
  description: string | null;
}

interface AttractionRow {
  id: string;
  name: string;
}

export function RevenueScreen() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { parkId } = usePark();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [rows, setRows] = useState<RevenueByDayRow[]>([]);
  const [payments, setPayments] = useState<PurchaseRow[]>([]);
  const [attractions, setAttractions] = useState<AttractionRow[]>([]);

  const monthlyRevenue = useMemo(
    () => rows.reduce((total, row) => total + row.amount, 0),
    [rows]
  );
  const chartRows = useMemo(
    () =>
      rows
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30),
    [rows]
  );

  useEffect(() => {
    loadRevenue();
  }, [parkId]);

  const attractionRevenue = useMemo(() => {
    const totals = new Map<string, number>();
    const attractionNames = attractions.map((attraction) => attraction.name);
    const successful = payments.filter(
      (payment) => payment.status === 'succeeded' || payment.status === 'completed'
    );

    for (const payment of successful) {
      const amountCents = Math.round(payment.amount * 100);
      if (amountCents <= 0) continue;

      const label = getAttractionRevenueLabel(payment.description, attractionNames, t('revenue_unassigned'));
      totals.set(label, (totals.get(label) ?? 0) + amountCents);
    }

    const ranked = Array.from(totals.entries())
      .map(([label, amountCents]) => ({ label, amountCents }))
      .sort((a, b) => b.amountCents - a.amountCents);
    const max = ranked.length > 0 ? ranked[0].amountCents : 0;

    return ranked.slice(0, 6).map((row) => ({
      ...row,
      widthPercent: max > 0 ? Math.max((row.amountCents / max) * 100, 8) : 8,
    }));
  }, [attractions, payments]);

  async function loadRevenue(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const [revenueResult, paymentsResult, attractionsResult] = await Promise.all([
      invokeEdgeFunction<{
        total_revenue: number;
        revenue_by_day: RevenueByDayRow[];
      }>('stripe-revenue'),
      invokeEdgeFunction<{ payments: PurchaseRow[] }>('stripe-payments'),
      invokeEdgeFunction<{ attractions: AttractionRow[] }>('external-attractions', {
        query: parkId ? { park_id: parkId } : undefined,
      }),
    ]);

    if (revenueResult.error || paymentsResult.error || attractionsResult.error) {
      setError(
        revenueResult.error || paymentsResult.error || attractionsResult.error || t('common_failed_load_dashboard')
      );
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const dailyRows = revenueResult.data?.revenue_by_day ?? [];

    setTotalRevenue(Math.round((revenueResult.data?.total_revenue ?? 0) * 100));
    setRows(dailyRows);
    setPayments(paymentsResult.data?.payments ?? []);
    setAttractions(attractionsResult.data?.attractions ?? []);
    setError(null);
    setLoading(false);
    setRefreshing(false);
  }

  if (loading) {
    return <Screen title={t('nav_revenue')}><ActivityIndicator color={colors.primary} /></Screen>;
  }

  return (
    <Screen
      title={t('nav_revenue')}
      subtitle={t('revenue_subtitle')}
      right={
        <Pressable style={styles.refreshButton} onPress={() => loadRevenue(true)}>
          <Text style={styles.refreshButtonText}>
            {refreshing ? t('common_refreshing') : t('common_refresh')}
          </Text>
        </Pressable>
      }
    >
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      <View style={styles.metricGrid}>
        <MetricCard label={t('dashboard_total_revenue')} value={formatCurrency(totalRevenue)} />
        <MetricCard label={t('revenue_30_day_revenue')} value={`$${monthlyRevenue.toFixed(2)}`} />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>{t('dashboard_daily_revenue_30')}</Text>
        <RevenueLineChart rows={chartRows} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('revenue_by_attraction')}</Text>
        {attractionRevenue.length === 0 ? (
          <Text style={styles.muted}>{t('revenue_no_attraction_data')}</Text>
        ) : (
          attractionRevenue.map((row) => (
            <View key={row.label} style={styles.attractionRow}>
              <View style={styles.attractionHeaderRow}>
                <Text style={styles.attractionLabel} numberOfLines={1}>
                  {row.label}
                </Text>
                <Text style={styles.attractionValue}>{formatCurrency(row.amountCents)}</Text>
              </View>
              <View style={styles.attractionTrack}>
                <View style={[styles.attractionFill, { width: `${row.widthPercent}%` }]} />
              </View>
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('revenue_daily_revenue')}</Text>
        {chartRows.length === 0 ? (
          <Text style={styles.muted}>{t('revenue_no_data')}</Text>
        ) : (
          chartRows
            .slice()
            .reverse()
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

const createStyles = (colors: any) => StyleSheet.create({
  refreshButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  refreshButtonText: {
    color: colors.primaryText,
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
  attractionRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: 8,
    gap: 6,
  },
  attractionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  attractionLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  attractionValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  attractionTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.dataBlueSoft,
    overflow: 'hidden',
  },
  attractionFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.dataBlue,
  },
});

function getAttractionRevenueLabel(
  description: string | null,
  attractionNames: string[],
  fallback: string
) {
  const text = (description ?? '').trim();
  if (!text) return fallback;

  const textLower = text.toLowerCase();
  const exactMatch = attractionNames.find((name) => textLower.includes(name.toLowerCase()));
  if (exactMatch) return exactMatch;

  const splitCandidate = text.split(/[-|:]/)[0]?.trim();
  if (splitCandidate && splitCandidate.length > 1) return splitCandidate;

  return fallback;
}
