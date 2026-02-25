import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { MetricCard } from '../../components/MetricCard';
import { StatusPill } from '../../components/StatusPill';
import { useAuth } from '../../contexts/AuthContext';
import { usePark } from '../../contexts/ParkContext';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import { supabase } from '../../lib/supabase';
import type { AppStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { formatCurrency, formatDateTime, formatNumber, formatRelative } from '../../lib/utils';

type Props = NativeStackScreenProps<AppStackParamList, 'Dashboard'>;

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

export function DashboardScreen({ navigation }: Props) {
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
      invokeEdgeFunction<{ total_revenue: number }>('stripe-revenue'),
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

  if (loading) {
    return <Screen title="Dashboard"><ActivityIndicator color={colors.primary} /></Screen>;
  }

  if (error) {
    return (
      <Screen
        title="Dashboard"
        subtitle={parkName ? `Park: ${parkName}` : undefined}
        right={
          <Pressable style={styles.linkButton} onPress={() => loadDashboard(true)}>
            <Text style={styles.linkButtonText}>Retry</Text>
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
      title="Dashboard"
      subtitle={parkName ? `Park: ${parkName}` : undefined}
      right={
        <Pressable style={styles.linkButton} onPress={() => loadDashboard(true)}>
          <Text style={styles.linkButtonText}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
        </Pressable>
      }
    >
      <Card>
        <Text style={styles.greeting}>Welcome back {profile?.full_name?.split(' ')[0] ?? 'Operator'}</Text>
        <Text style={styles.greetingSub}>Mobile dashboard overview with live Supabase data.</Text>
      </Card>

      <View style={styles.metricGrid}>
        <MetricCard label="Total Revenue" value={formatCurrency(totalRevenue)} />
        <MetricCard label="Purchases" value={formatNumber(totalPurchases)} />
      </View>

      <View style={styles.metricGrid}>
        <MetricCard label="Users" value={formatNumber(totalUsers)} />
        <MetricCard label="Photos" value={formatNumber(totalPhotos)} />
      </View>

      <View style={styles.metricGrid}>
        <MetricCard label="Active Attractions" value={formatNumber(activeAttractions)} />
        <MetricCard label="Health Alerts" value={formatNumber(healthAlerts)} />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <View style={styles.linkGrid}>
          <QuickLink label="Revenue" onPress={() => navigation.navigate('Revenue')} />
          <QuickLink label="Purchases" onPress={() => navigation.navigate('Purchases')} />
          <QuickLink label="Users" onPress={() => navigation.navigate('Users')} />
          <QuickLink label="Photos" onPress={() => navigation.navigate('Photos')} />
          <QuickLink label="Leads" onPress={() => navigation.navigate('Leads')} />
          <QuickLink label="Support" onPress={() => navigation.navigate('Support')} />
          <QuickLink label="System" onPress={() => navigation.navigate('SystemHealth')} />
          <QuickLink label="Settings" onPress={() => navigation.navigate('Settings')} />
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
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {activity.length === 0 ? (
          <Text style={styles.muted}>No recent activity.</Text>
        ) : (
          activity.map((item) => (
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

interface QuickLinkProps {
  label: string;
  onPress: () => void;
}

function QuickLink({ label, onPress }: QuickLinkProps) {
  return (
    <Pressable style={styles.quickLink} onPress={onPress}>
      <Text style={styles.quickLinkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linkButton: {
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  linkButtonText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  greeting: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  greetingSub: {
    color: colors.muted,
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
  linkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickLink: {
    backgroundColor: '#F3F4F6',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
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
    color: '#9CA3AF',
    fontSize: 12,
  },
});
