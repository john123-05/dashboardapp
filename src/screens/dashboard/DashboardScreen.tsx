import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { MetricCard } from '../../components/MetricCard';
import { RevenueLineChart } from '../../components/RevenueLineChart';
import { StatusPill } from '../../components/StatusPill';
import { WalkthroughAnchor } from '../../components/WalkthroughAnchor';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/LanguageContext';
import { usePark } from '../../contexts/ParkContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatNumber, formatPercent, formatRelative } from '../../lib/utils';

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

export function DashboardScreen() {
  const { profile } = useAuth();
  const { t, language } = useI18n();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { parkId } = usePark();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<RevenueByDayRow[]>([]);
  const [dismissedActivityIds, setDismissedActivityIds] = useState<string[]>([]);

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
      healthResult.error
    ) {
      setError(
        revenueResult.error ||
          paymentsResult.error ||
          usersResult.error ||
          photosResult.error ||
          healthResult.error ||
          t('common_failed_load_dashboard')
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
        label: t('dashboard_health_prefix', { type: event.event_type }),
        message: event.message || t('dashboard_system_event'),
        created_at: event.created_at,
        status: event.severity,
      })),
      ...supportRows.slice(0, 6).map((ticket) => ({
        id: `support-${ticket.id}`,
        label: t('dashboard_support_ticket'),
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
    setTotalUsers((usersResult.data?.customers ?? []).length);
    setTotalPhotos((photosResult.data?.photos ?? []).length);
    setActivity(mergedActivity);
    setDismissedActivityIds([]);

    setError(null);
    setLoading(false);
    setRefreshing(false);
  }

  const trendRows = useMemo(() => {
    const sliced = revenueByDay.slice(-7);
    const max = sliced.reduce((highest, row) => Math.max(highest, row.amount), 0);

    return sliced.map((row) => ({
      key: row.date,
      label: row.date,
      amountCents: Math.round(row.amount * 100),
      widthPercent: max > 0 ? Math.max((row.amount / max) * 100, 8) : 8,
    }));
  }, [revenueByDay]);

  const conversionRate = totalPhotos > 0 ? (totalPurchases / totalPhotos) * 100 : 0;
  const visibleActivity = useMemo(
    () => activity.filter((item) => !dismissedActivityIds.includes(item.id)).slice(0, 5),
    [activity, dismissedActivityIds]
  );

  if (loading) {
    return (
      <Screen title={t('nav_overview')}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen
        title={t('nav_overview')}
        right={
          <Pressable style={styles.actionButton} onPress={() => loadDashboard(true)}>
            <Text style={styles.actionButtonText}>{t('common_retry')}</Text>
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
      title={t('nav_overview')}
      right={
        <Pressable style={styles.actionButton} onPress={() => loadDashboard(true)}>
          <Text style={styles.actionButtonText}>
            {refreshing ? t('common_refreshing') : t('common_refresh')}
          </Text>
        </Pressable>
      }
    >
      <WalkthroughAnchor id="overview-hero">
        <Card style={styles.heroCard}>
          <Text style={styles.heroGreeting}>
            {t('dashboard_greeting', {
              part: t(dayPartKey()),
              name: profile?.full_name?.split(' ')[0] ?? t('common_operator'),
            })}
          </Text>
          <Text style={styles.heroSub}>{t('dashboard_subtitle')}</Text>
        </Card>
      </WalkthroughAnchor>

      <WalkthroughAnchor id="overview-metrics">
        <View style={styles.metricsWrap}>
          <View style={styles.metricGrid}>
            <MetricCard
              label={t('dashboard_total_revenue')}
              value={formatCurrency(totalRevenue)}
              footnote={t('common_all_time')}
            />
            <MetricCard
              label={t('dashboard_purchases')}
              value={formatNumber(totalPurchases)}
              footnote={t('common_completed')}
            />
          </View>

          <View style={styles.metricGrid}>
            <MetricCard
              label={t('dashboard_users')}
              value={formatNumber(totalUsers)}
              footnote={t('common_active_records')}
            />
            <MetricCard
              label={t('dashboard_conversion')}
              value={formatPercent(conversionRate)}
              footnote={t('common_purchases_per_photos')}
            />
          </View>
        </View>
      </WalkthroughAnchor>

      <WalkthroughAnchor id="overview-daily-chart">
        <Card>
          <Text style={styles.sectionTitle}>{t('dashboard_daily_revenue_30')}</Text>
          <RevenueLineChart rows={revenueByDay} />
        </Card>
      </WalkthroughAnchor>

      <WalkthroughAnchor id="overview-trend">
        <Card>
          <Text style={styles.sectionTitle}>{t('dashboard_revenue_trend_7')}</Text>
          {trendRows.length === 0 ? (
            <Text style={styles.muted}>{t('dashboard_no_trend_data')}</Text>
          ) : (
            trendRows.map((row) => (
              <View key={row.key} style={styles.trendRow}>
                <Text style={styles.trendLabel}>{formatShortDay(row.label, language)}</Text>
                <View style={styles.trendTrack}>
                  <View style={[styles.trendFill, { width: `${row.widthPercent}%` }]} />
                </View>
                <Text style={styles.trendValue}>{formatCurrency(row.amountCents)}</Text>
              </View>
            ))
          )}
        </Card>
      </WalkthroughAnchor>

      <WalkthroughAnchor id="overview-activity">
        <Card>
          <Text style={styles.sectionTitle}>{t('dashboard_news_activity')}</Text>
          {visibleActivity.length === 0 ? (
            <Text style={styles.muted}>{t('dashboard_no_activity')}</Text>
          ) : (
            visibleActivity.map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>{item.label}</Text>
                  <Text style={styles.rowSub}>{item.message}</Text>
                  <Text style={styles.rowTime}>{formatRelative(item.created_at)}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Pressable
                    style={styles.dismissButton}
                    onPress={() =>
                      setDismissedActivityIds((current) =>
                        current.includes(item.id) ? current : [...current, item.id]
                      )
                    }
                  >
                    <Text style={styles.dismissButtonText}>X</Text>
                  </Pressable>
                  <StatusPill value={item.status} />
                </View>
              </View>
            ))
          )}
        </Card>
      </WalkthroughAnchor>
    </Screen>
  );
}

function dayPartKey(): 'dashboard_part_morning' | 'dashboard_part_afternoon' | 'dashboard_part_evening' {
  const hours = new Date().getHours();
  if (hours < 12) return 'dashboard_part_morning';
  if (hours < 18) return 'dashboard_part_afternoon';
  return 'dashboard_part_evening';
}

function formatShortDay(value: string, language: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language, { weekday: 'short' }).format(parsed);
}

const createStyles = (colors: {
  primarySoft: string;
  primaryBorder: string;
  primaryText: string;
  danger: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  dataBlue: string;
  dataBlueSoft: string;
}) =>
  StyleSheet.create({
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
      backgroundColor: colors.card,
    },
    heroGreeting: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    heroSub: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 18,
    },
    metricGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    metricsWrap: {
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
      backgroundColor: colors.dataBlueSoft,
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
      color: colors.muted,
      fontSize: 12,
    },
    rowRight: {
      alignItems: 'flex-end',
      gap: 8,
    },
    dismissButton: {
      width: 22,
      height: 22,
      borderRadius: 999,
      backgroundColor: colors.dataBlueSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dismissButtonText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '700',
    },
  });
