import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { StatusPill } from '../../components/StatusPill';
import { useI18n } from '../../contexts/LanguageContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import { formatCurrency, formatDateTime } from '../../lib/utils';

interface PurchaseRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  customer_email: string | null;
  description: string | null;
}

export function PurchasesScreen() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<PurchaseRow[]>([]);

  useEffect(() => {
    loadPurchases();
  }, []);

  async function loadPurchases(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await invokeEdgeFunction<{ payments: PurchaseRow[] }>('stripe-payments');

    if (result.error) {
      setError(result.error);
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setRows(result.data?.payments ?? []);
    setError(null);
    setLoading(false);
    setRefreshing(false);
  }

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return rows;

    return rows.filter((row) => {
      return (
        row.id.toLowerCase().includes(value) ||
        row.customer_email?.toLowerCase().includes(value) ||
        row.description?.toLowerCase().includes(value)
      );
    });
  }, [rows, search]);

  if (loading) {
    return <Screen title={t('nav_purchases')}><ActivityIndicator color={colors.primary} /></Screen>;
  }

  return (
    <Screen
      title={t('nav_purchases')}
      subtitle={t('purchases_subtitle')}
      right={
        <Pressable style={styles.refreshButton} onPress={() => loadPurchases(true)}>
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

      <Card>
        <TextInput
          placeholder={t('purchases_search_placeholder')}
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('purchases_list', { count: filtered.length })}</Text>

        {filtered.length === 0 ? (
          <Text style={styles.muted}>{t('purchases_none')}</Text>
        ) : (
          filtered.slice(0, 80).map((row) => (
            <View key={row.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.amount}>{formatCurrency(Math.round(row.amount * 100), row.currency)}</Text>
                <Text style={styles.rowSub}>{row.customer_email || t('purchases_anonymous')}</Text>
                <Text style={styles.rowSub}>{row.description || t('purchases_photo_purchase')}</Text>
                <Text style={styles.rowTime}>{formatDateTime(row.created_at)}</Text>
              </View>
              <StatusPill value={row.status} />
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
    gap: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  rowSub: {
    color: colors.muted,
    fontSize: 13,
  },
  rowTime: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
