import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { MetricCard } from '../../components/MetricCard';
import { useI18n } from '../../contexts/LanguageContext';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import { usePark } from '../../contexts/ParkContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { formatDate, formatNumber } from '../../lib/utils';

interface LeadRow {
  id: string;
  email: string;
  full_name: string | null;
  source: string;
  opted_in: boolean;
  created_at: string;
  park: { name: string } | null;
}

type Filter = 'all' | 'opted_in' | 'opted_out';

export function LeadsScreen() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { parkId } = usePark();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadLeads();
  }, [parkId]);

  async function loadLeads(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await invokeEdgeFunction<{ leads: LeadRow[] }>('external-leads', {
      query: { park_id: parkId || undefined },
    });

    if (result.error) {
      setError(result.error);
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setRows(result.data?.leads ?? []);
    setError(null);
    setLoading(false);
    setRefreshing(false);
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'opted_in') return rows.filter((item) => item.opted_in);
    return rows.filter((item) => !item.opted_in);
  }, [rows, filter]);

  const sourceCounts = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => {
      map.set(row.source || 'unknown', (map.get(row.source || 'unknown') || 0) + 1);
    });

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [rows]);
  const maxSourceCount = useMemo(
    () => sourceCounts.reduce((max, [, count]) => Math.max(max, count), 0),
    [sourceCounts]
  );

  useEffect(() => {
    barAnim.setValue(0);
    if (sourceCounts.length === 0) return;
    Animated.timing(barAnim, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [barAnim, sourceCounts]);

  if (loading) {
    return <Screen title={t('nav_leads')}><ActivityIndicator color={colors.primary} /></Screen>;
  }

  return (
    <Screen
      title={t('nav_leads')}
      subtitle={t('leads_subtitle')}
      right={
        <Pressable style={styles.refreshButton} onPress={() => loadLeads(true)}>
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
        <MetricCard label={t('leads_total_leads')} value={formatNumber(rows.length)} />
        <MetricCard label={t('leads_opted_in')} value={formatNumber(rows.filter((item) => item.opted_in).length)} />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>{t('leads_filter')}</Text>
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
              {t('leads_all')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterButton, filter === 'opted_in' && styles.filterButtonActive]}
            onPress={() => setFilter('opted_in')}
          >
            <Text style={[styles.filterButtonText, filter === 'opted_in' && styles.filterButtonTextActive]}>
              {t('leads_opted_in')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterButton, filter === 'opted_out' && styles.filterButtonActive]}
            onPress={() => setFilter('opted_out')}
          >
            <Text style={[styles.filterButtonText, filter === 'opted_out' && styles.filterButtonTextActive]}>
              {t('leads_opted_out')}
            </Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('leads_top_sources')}</Text>
        {sourceCounts.length === 0 ? (
          <Text style={styles.muted}>{t('leads_no_source_data')}</Text>
        ) : (
          sourceCounts.map(([source, count]) => (
            <View key={source} style={styles.row}>
              <Text style={styles.rowTitle}>{source}</Text>
              <Text style={styles.rowValue}>{formatNumber(count)}</Text>
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('leads_by_source')}</Text>
        {sourceCounts.length === 0 ? (
          <Text style={styles.muted}>{t('leads_no_source_data')}</Text>
        ) : (
          <View style={styles.chartWrap}>
            {sourceCounts.map(([source, count]) => {
              const normalized = maxSourceCount > 0 ? count / maxSourceCount : 0;
              const height = barAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, Math.max(normalized * 148, 8)],
              });

              return (
                <View key={`bar-${source}`} style={styles.barGroup}>
                  <View style={styles.barTrack}>
                    <Animated.View style={[styles.barFill, { height }]} />
                  </View>
                  <Text style={styles.barValue}>{formatNumber(count)}</Text>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {source}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('leads_list', { count: filtered.length })}</Text>
        {filtered.length === 0 ? (
          <Text style={styles.muted}>{t('leads_no_leads')}</Text>
        ) : (
          filtered.slice(0, 80).map((row) => (
            <View key={row.id} style={styles.leadRow}>
              <View style={styles.leadLeft}>
                <Text style={styles.leadTitle}>{row.email}</Text>
                <Text style={styles.leadSub}>{row.full_name || t('leads_no_name')}</Text>
                <Text style={styles.leadSub}>{row.park?.name || t('leads_unknown_park')}</Text>
                <Text style={styles.leadSub}>{formatDate(row.created_at)}</Text>
              </View>
              <Text style={styles.leadBadge}>{row.opted_in ? t('leads_opted_in') : t('leads_opted_out')}</Text>
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
    marginBottom: 2,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.background,
  },
  filterButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  filterButtonText: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 12,
  },
  filterButtonTextActive: {
    color: colors.primaryText,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
  },
  rowValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  chartWrap: {
    minHeight: 190,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 8,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    height: 148,
    width: '100%',
    borderRadius: 10,
    backgroundColor: colors.dataBlueSoft,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.dataBlue,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  barValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  barLabel: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
  },
  leadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  leadLeft: {
    flex: 1,
    gap: 2,
  },
  leadTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  leadSub: {
    color: colors.muted,
    fontSize: 13,
  },
  leadBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
