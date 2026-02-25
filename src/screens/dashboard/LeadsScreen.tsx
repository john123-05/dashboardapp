import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { MetricCard } from '../../components/MetricCard';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import { usePark } from '../../contexts/ParkContext';
import { colors } from '../../theme/colors';
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
  const { parkId } = usePark();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

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

  if (loading) {
    return <Screen title="Leads"><ActivityIndicator color={colors.primary} /></Screen>;
  }

  return (
    <Screen
      title="Leads"
      subtitle="Marketing capture and opt-in management"
      right={
        <Pressable style={styles.refreshButton} onPress={() => loadLeads(true)}>
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
        <MetricCard label="Total Leads" value={formatNumber(rows.length)} />
        <MetricCard label="Opted In" value={formatNumber(rows.filter((item) => item.opted_in).length)} />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Filter</Text>
        <View style={styles.filterRow}>
          <FilterButton label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterButton
            label="Opted In"
            active={filter === 'opted_in'}
            onPress={() => setFilter('opted_in')}
          />
          <FilterButton
            label="Opted Out"
            active={filter === 'opted_out'}
            onPress={() => setFilter('opted_out')}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Top Sources</Text>
        {sourceCounts.length === 0 ? (
          <Text style={styles.muted}>No lead source data.</Text>
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
        <Text style={styles.sectionTitle}>Lead List ({filtered.length})</Text>
        {filtered.length === 0 ? (
          <Text style={styles.muted}>No leads found.</Text>
        ) : (
          filtered.slice(0, 80).map((row) => (
            <View key={row.id} style={styles.leadRow}>
              <View style={styles.leadLeft}>
                <Text style={styles.leadTitle}>{row.email}</Text>
                <Text style={styles.leadSub}>{row.full_name || 'No name'}</Text>
                <Text style={styles.leadSub}>{row.park?.name || 'Unknown park'}</Text>
                <Text style={styles.leadSub}>{formatDate(row.created_at)}</Text>
              </View>
              <Text style={styles.leadBadge}>{row.opted_in ? 'Opted In' : 'Opted Out'}</Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

interface FilterButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function FilterButton({ label, active, onPress }: FilterButtonProps) {
  return (
    <Pressable style={[styles.filterButton, active && styles.filterButtonActive]} onPress={onPress}>
      <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>{label}</Text>
    </Pressable>
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
    backgroundColor: '#F9FAFB',
  },
  filterButtonActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#7DD3FC',
  },
  filterButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
  },
  filterButtonTextActive: {
    color: '#0369A1',
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
    backgroundColor: '#E5E7EB',
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
