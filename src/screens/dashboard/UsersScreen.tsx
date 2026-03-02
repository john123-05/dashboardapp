import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { MetricCard } from '../../components/MetricCard';
import { useI18n } from '../../contexts/LanguageContext';
import { usePark } from '../../contexts/ParkContext';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import { useAppTheme } from '../../contexts/ThemeContext';
import { formatCurrency, formatDate, formatNumber } from '../../lib/utils';

interface ExternalCustomer {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  opted_in_marketing: boolean;
  created_at: string;
}

interface ExternalPurchase {
  customer_id: string;
  amount_cents: number;
  status: string;
}

interface CustomerRow extends ExternalCustomer {
  purchaseCount: number;
  totalSpent: number;
}

export function UsersScreen() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { parkId } = usePark();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<CustomerRow[]>([]);

  useEffect(() => {
    loadUsers();
  }, [parkId]);

  async function loadUsers(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await invokeEdgeFunction<{
      customers: ExternalCustomer[];
      purchases: ExternalPurchase[];
    }>('external-users', {
      query: { park_id: parkId || undefined },
    });

    if (result.error) {
      setError(result.error);
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const customers = result.data?.customers ?? [];
    const purchases = (result.data?.purchases ?? []).filter((item) => item.status === 'completed');

    const purchasesByCustomer = new Map<string, { count: number; total: number }>();
    purchases.forEach((purchase) => {
      const entry = purchasesByCustomer.get(purchase.customer_id) || { count: 0, total: 0 };
      entry.count += 1;
      entry.total += purchase.amount_cents;
      purchasesByCustomer.set(purchase.customer_id, entry);
    });

    const normalizedRows = customers
      .map((customer) => {
        const entry = purchasesByCustomer.get(customer.id) || { count: 0, total: 0 };
        return {
          ...customer,
          purchaseCount: entry.count,
          totalSpent: entry.total,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);

    setRows(normalizedRows);
    setError(null);
    setLoading(false);
    setRefreshing(false);
  }

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return rows;

    return rows.filter((row) => {
      return (
        row.full_name?.toLowerCase().includes(value) ||
        row.email?.toLowerCase().includes(value) ||
        row.phone?.includes(value)
      );
    });
  }, [rows, search]);

  if (loading) {
    return <Screen title={t('nav_users')}><ActivityIndicator color={colors.primary} /></Screen>;
  }

  const totalUsers = rows.length;
  const payingUsers = rows.filter((row) => row.purchaseCount > 0).length;
  const marketingOptIns = rows.filter((row) => row.opted_in_marketing).length;

  return (
    <Screen
      title={t('nav_users')}
      subtitle={t('users_subtitle')}
      right={
        <Pressable style={styles.refreshButton} onPress={() => loadUsers(true)}>
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
        <MetricCard label={t('users_total_users')} value={formatNumber(totalUsers)} />
        <MetricCard label={t('users_paying_users')} value={formatNumber(payingUsers)} />
      </View>
      <View style={styles.metricGrid}>
        <MetricCard label={t('users_marketing_optins')} value={formatNumber(marketingOptIns)} />
        <MetricCard
          label={t('users_average_spend')}
          value={
            totalUsers > 0
              ? formatCurrency(
                  Math.round(rows.reduce((sum, row) => sum + row.totalSpent, 0) / Math.max(totalUsers, 1))
                )
              : formatCurrency(0)
          }
        />
      </View>

      <Card>
        <TextInput
          placeholder={t('users_search_placeholder')}
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('users_customers', { count: filtered.length })}</Text>
        {filtered.length === 0 ? (
          <Text style={styles.muted}>{t('users_no_customers')}</Text>
        ) : (
          filtered.slice(0, 80).map((row) => (
            <View key={row.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.name}>{row.full_name || t('users_unknown_user')}</Text>
                <Text style={styles.sub}>{row.email || row.phone || t('users_no_contact')}</Text>
                <Text style={styles.sub}>{t('users_joined', { date: formatDate(row.created_at) })}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.value}>{t('users_purchases_count', { count: row.purchaseCount })}</Text>
                <Text style={styles.value}>{row.totalSpent > 0 ? formatCurrency(row.totalSpent) : '$0.00'}</Text>
                <Text style={styles.miniPill}>
                  {row.opted_in_marketing ? t('users_opted_in') : t('users_opted_out')}
                </Text>
              </View>
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
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
  },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  sub: {
    color: colors.muted,
    fontSize: 13,
  },
  value: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  miniPill: {
    backgroundColor: colors.primarySoft,
    color: colors.primaryText,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '600',
  },
});
