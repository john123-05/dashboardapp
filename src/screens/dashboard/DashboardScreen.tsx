import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { MetricCard } from '../../components/MetricCard';
import { StatusPill } from '../../components/StatusPill';
import { useAuth } from '../../contexts/AuthContext';
import { usePark } from '../../contexts/ParkContext';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import { supabase } from '../../lib/supabase';
import type { DashboardDrawerParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { formatCurrency, formatDateTime, formatNumber, formatPercent, formatRelative } from '../../lib/utils';

interface PurchaseItem {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface ActivityItem {
  id: string;
  label: string;
  message: string;
  created_at: string;
  status: string;
}

interface RevenueByDayRow {
  date: string;
  amount: number;
}

interface QuickLink {
  label: string;
  route: keyof DashboardDrawerParamList;
}

const quickLinks: QuickLink[] = [
  { label: 'Revenue', route: 'Revenue' },
  { label: 'Purchases', route: 'Purchases' },
  { label: 'Users', route: 'Users' },
  { label: 'Photos', route: 'Photos' },
  { label: 'Leads', route: 'Leads' },
  { label: 'Support', route: 'Support' },
];

export function DashboardScreen() {
  const navigation = useNavigation<NavigationProp<DashboardDrawerParamList>>();
  const { profile } = useAuth();
  const { parkId, parkName } = usePark();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeAttractions, setActiveAttractions] = useState(0);
  const [healthAlerts, setHealthAlerts] = useState(0);
  const [recentPurchases, setRecentPurchases] = useState<PurchaseItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<RevenueByDayRow[]>([]);

  useEffect(() => {
    loadDashboard();
  }, [parkId]);

  async function loadDashboard(isRefresh = false) {
    if (!parkId) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const [
      revenueResult,
      paymentsResult,
      usersResult,
      photosResult,
      attractionsResult,
      healthResult,
      supportResult,
    ] = await Promise.all([
      invokeEdgeFunction<{ total_revenue: number; revenue_by_day?: RevenueByDayRow[] }>('stripe-revenue'),
      invokeEdgeFunction<{ payments: PurchaseItem[] }>('stripe-payments'),
      invokeEdgeFunction<{ customers: Array<{ id: string }> }>('external-users', {
        query: { park_id: parkId },
      }),
      invokeEdgeFunction<{ photos: Array<{ id: string }> }>('external-photos', {
        query: { park_id: parkId },
      }),
      invokeEdgeFunction<{ attractions: Array<{ id: string; is_active?: boolean }> }>(
        'external-attractions',
        {
          query: { park_id: parkId },
        }
      ),
      invokeEdgeFunction<{
        events: Array<{
          id: string;
          event_type: string;
          message: string;
          created_at: string;
          severity: string;
        }>;
      }>('system-health', {
        query: { park_id: parkId },
      }),
      supabase
        .from('support_tickets')
        .select('id, subject, status, updated_at, created_at')
        .order('updated_at', { ascending: false })
        .limit(6),
    ]);

    if (
      revenueResult.error ||
      paymentsResult.error ||
      usersResult.error ||
      photosResult.error ||
      attractionsResult.error ||
      healthResult.error
    ) {
      setError(
        revenueResult.error ||
          paymentsResult.error ||
          usersResult.error ||
          photosResult.error ||
          attractionsResult.error ||
          healthResult.error ||
          'Failed to load dashboard data.'
      );
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const payments = (paymentsResult.data?.payments ?? []).filter(
      (item) => item.status === 'succeeded' || item.status === 'completed'
    );

    const healthEvents = healthResult.data?.events ?? [];
    const supportRows = supportResult.data ?? [];

    const mergedActivity: ActivityItem[] = [
      ...healthEvents.slice(0, 6).map((event) => ({
        id: `health-${event.id}`,
        label: `Health: ${event.event_type}`,
        message: event.message || 'System event',
        created_at: event.created_at,
        status: event.severity,
      })),
      ...supportRows.slice(0, 6).map((ticket) => ({
        id: `support-${ticket.id}`,
        label: 'Support ticket',
        message: `${ticket.subject} (${ticket.status.replace('_', ' ')})`,
        created_at: ticket.updated_at || ticket.created_at,
        status: ticket.status,
      })),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    setTotalRevenue(Math.round((revenueResult.data?.total_revenue ?? 0) * 100));
    setRevenueByDay(revenueResult.data?.revenue_by_day ?? []);
    setTotalPurchases(payments.length);
    setRecentPurchases(payments.slice(0, 5));
    setTotalUsers((usersResult.data?.customers ?? []).length);
    setTotalPhotos((photosResult.data?.photos ?? []).length);
    setActiveAttractions(
      (attractionsResult.data?.attractions ?? []).filter((item) => item.is_active !== false).length
    );
    setHealthAlerts(
      healthEvents.filter((event) => event.severity === 'critical' || event.severity === 'error').length
    );
    setActivity(mergedActivity);

    setError(null);
    setLoading(false);
    setRefreshing(false);
  }

  const trendRows = useMemo(() => {
    const sliced = revenueByDay.slice(-7);
    const max = sliced.reduce((highest, row) => Math.max(highest, row.amount), 0);

    return sliced.map((row) => ({
      key: row.date,
      label: formatShortDay(row.date),
      amountCents: Math.round(row.amount * 100),
      widthPercent: max > 0 ? Math.max((row.amount / max) * 100, 8) : 8,
    }));
  }, [revenueByDay]);

  const conversionRate = totalPhotos > 0 ? (totalPurchases / totalPhotos) * 100 : 0;

  if (loading) {
    return (
      <Screen title="Overview">
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen
        title="Overview"
        subtitle={parkName ? `Park: ${parkName}` : undefined}
        right={
          <Pressable style={styles.actionButton} onPress={() => loadDashboard(true)}>
            <Text style={styles.actionButtonText}>Retry</Text>
          </Pressable>
        }
      >
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Overview"
      subtitle={parkName ? `Park: ${parkName}` : undefined}
      right={
        <Pressable style={styles.actionButton} onPress={() => loadDashboard(true)}>
          <Text style={styles.actionButtonText}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
        </Pressable>
      }
    >
      <Card style={styles.heroCard}>
        <Text style={styles.heroGreeting}>
          {`Good ${dayPart()}, ${profile?.full_name?.split(' ')[0] ?? 'Operator'}`}
        </Text>
        <Text style={styles.heroSub}>Your mobile operations snapshot, synced with live dashboard data.</Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatPill}>
            <Text style={styles.heroStatLabel}>Attractions</Text>
            <Text style={styles.heroStatValue}>{formatNumber(activeAttractions)}</Text>
          </View>
          <View style={styles.heroStatPill}>
            <Text style={styles.heroStatLabel}>Health Alerts</Text>
            <Text style={styles.heroStatValue}>{formatNumber(healthAlerts)}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.metricGrid}>
        <MetricCard label="Total Revenue" value={formatCurrency(totalRevenue)} footnote="All-time" />
        <MetricCard label="Purchases" value={formatNumber(totalPurchases)} footnote="Completed" />
      </View>

      <View style={styles.metricGrid}>
        <MetricCard label="Users" value={formatNumber(totalUsers)} footnote="Active records" />
        <MetricCard
          label="Conversion"
          value={formatPercent(conversionRate)}
          footnote="Purchases / photos"
        />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Revenue Trend (Last 7 Days)</Text>
        {trendRows.length === 0 ? (
          <Text style={styles.muted}>No revenue trend data available.</Text>
        ) : (
          trendRows.map((row) => (
            <View key={row.key} style={styles.trendRow}>
              <Text style={styles.trendLabel}>{row.label}</Text>
              <View style={styles.trendTrack}>
                <View style={[styles.trendFill, { width: `${row.widthPercent}%` }]} />
              </View>
              <Text style={styles.trendValue}>{formatCurrency(row.amountCents)}</Text>
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Quick Navigation</Text>
        <View style={styles.quickGrid}>
          {quickLinks.map((link) => (
            <Pressable
              key={link.route}
              style={styles.quickLink}
              onPress={() => navigation.navigate(link.route)}
            >
              <Text style={styles.quickLinkText}>{link.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent Purchases</Text>
        {recentPurchases.length === 0 ? (
          <Text style={styles.muted}>No recent purchases.</Text>
        ) : (
          recentPurchases.map((purchase) => (
            <View key={purchase.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>{formatCurrency(Math.round(purchase.amount * 100))}</Text>
                <Text style={styles.rowSub}>{formatDateTime(purchase.created_at)}</Text>
              </View>
              <StatusPill value={purchase.status} />
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>News & Activity</Text>
        {activity.length === 0 ? (
          <Text style={styles.muted}>No recent activity.</Text>
        ) : (
          activity.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>{item.label}</Text>
                <Text style={styles.rowSub}>{item.message}</Text>
                <Text style={styles.rowTime}>{formatRelative(item.created_at)}</Text>
              </View>
              <StatusPill value={item.status} />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

function dayPart() {
  const hours = new Date().getHours();
  if (hours < 12) return 'morning';
  if (hours < 18) return 'afternoon';
  return 'evening';
}

function formatShortDay(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(parsed);
}

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  heroCard: {
    backgroundColor: '#F8FAFD',
  },
  heroGreeting: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  heroSub: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  heroStatPill: {
    flex: 1,
    backgroundColor: '#EFF3F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  heroStatLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  heroStatValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
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
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: 8,
  },
  trendLabel: {
    width: 34,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  trendTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E6EEF7',
    borderRadius: 999,
    overflow: 'hidden',
  },
  trendFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.dataBlue,
  },
  trendValue: {
    width: 70,
    textAlign: 'right',
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickLink: {
    backgroundColor: '#F4F7FC',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 100,
  },
  quickLinkText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowSub: {
    color: colors.muted,
    fontSize: 13,
  },
  rowTime: {
    color: '#94A3B8',
    fontSize: 12,
  },
});
