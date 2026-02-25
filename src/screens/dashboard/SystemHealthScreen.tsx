import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { StatusPill } from '../../components/StatusPill';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import { usePark } from '../../contexts/ParkContext';
import type { HealthEvent } from '../../lib/types';
import { formatRelative } from '../../lib/utils';
import { colors } from '../../theme/colors';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency?: number;
  detail?: string;
}

export function SystemHealthScreen() {
  const { parkId } = usePark();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown>>({});

  useEffect(() => {
    loadHealth();
  }, [parkId]);

  async function loadHealth(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await invokeEdgeFunction<{
      services: ServiceStatus[];
      events: HealthEvent[];
      metrics: Record<string, unknown>;
    }>('system-health', {
      query: { park_id: parkId || undefined },
    });

    if (result.error) {
      setError(result.error);
      setServices([]);
      setEvents([]);
      setMetrics({});
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setServices(result.data?.services ?? []);
    setEvents(result.data?.events ?? []);
    setMetrics(result.data?.metrics ?? {});
    setError(null);
    setLoading(false);
    setRefreshing(false);
  }

  if (loading) {
    return <Screen title="System Health"><ActivityIndicator color={colors.primary} /></Screen>;
  }

  return (
    <Screen
      title="System Health"
      subtitle="Service uptime and recent health events"
      right={
        <Pressable style={styles.refreshButton} onPress={() => loadHealth(true)}>
          <Text style={styles.refreshButtonText}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
        </Pressable>
      }
    >
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Services</Text>
        {services.length === 0 ? (
          <Text style={styles.muted}>No service records available.</Text>
        ) : (
          services.map((service) => (
            <View key={service.name} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>{service.name}</Text>
                <Text style={styles.rowSub}>{service.detail || 'No detail available'}</Text>
                <Text style={styles.rowSub}>{service.latency ? `${service.latency}ms` : 'Latency n/a'}</Text>
              </View>
              <StatusPill value={service.status} />
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Live Metrics</Text>
        {Object.keys(metrics).length === 0 ? (
          <Text style={styles.muted}>No live metrics exposed by function.</Text>
        ) : (
          Object.entries(metrics).map(([key, value]) => (
            <View key={key} style={styles.metricRow}>
              <Text style={styles.metricKey}>{key.replace(/_/g, ' ')}</Text>
              <Text style={styles.metricValue}>{String(value ?? '-')}</Text>
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent Events</Text>
        {events.length === 0 ? (
          <Text style={styles.muted}>No system health events.</Text>
        ) : (
          events.slice(0, 60).map((event) => (
            <View key={event.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>{event.event_type}</Text>
                <Text style={styles.rowSub}>{event.message}</Text>
                <Text style={styles.rowSub}>{formatRelative(event.created_at)}</Text>
              </View>
              <StatusPill value={event.severity} />
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
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  rowSub: {
    color: colors.muted,
    fontSize: 13,
  },
  metricRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricKey: {
    color: colors.muted,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
