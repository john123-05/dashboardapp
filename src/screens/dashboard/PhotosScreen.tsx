import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { MetricCard } from '../../components/MetricCard';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import { usePark } from '../../contexts/ParkContext';
import { colors } from '../../theme/colors';
import { formatNumber, formatPercent, formatRelative } from '../../lib/utils';

interface PhotoRow {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  status: 'available' | 'purchased' | 'expired' | string;
  taken_at: string;
  attraction: { name: string } | null;
}

export function PhotosScreen() {
  const { parkId } = usePark();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [recent, setRecent] = useState<PhotoRow[]>([]);

  useEffect(() => {
    loadPhotos();
  }, [parkId]);

  async function loadPhotos(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await invokeEdgeFunction<{ photos: PhotoRow[]; recent: PhotoRow[] }>('external-photos', {
      query: { park_id: parkId || undefined },
    });

    if (result.error) {
      setError(result.error);
      setPhotos([]);
      setRecent([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setPhotos(result.data?.photos ?? []);
    setRecent(result.data?.recent ?? []);
    setError(null);
    setLoading(false);
    setRefreshing(false);
  }

  const purchased = photos.filter((item) => item.status === 'purchased').length;
  const available = photos.filter((item) => item.status === 'available').length;
  const expired = photos.filter((item) => item.status === 'expired').length;
  const conversionRate = photos.length > 0 ? (purchased / photos.length) * 100 : 0;

  if (loading) {
    return <Screen title="Photos"><ActivityIndicator color={colors.primary} /></Screen>;
  }

  return (
    <Screen
      title="Photos"
      subtitle="Photo and conversion snapshots"
      right={
        <Pressable style={styles.refreshButton} onPress={() => loadPhotos(true)}>
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
        <MetricCard label="Total Photos" value={formatNumber(photos.length)} />
        <MetricCard label="Purchased" value={formatNumber(purchased)} />
      </View>

      <View style={styles.metricGrid}>
        <MetricCard label="Available" value={formatNumber(available)} />
        <MetricCard label="Conversion" value={formatPercent(conversionRate)} />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Status Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Purchased</Text>
          <Text style={styles.summaryValue}>{formatNumber(purchased)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Available</Text>
          <Text style={styles.summaryValue}>{formatNumber(available)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Expired</Text>
          <Text style={styles.summaryValue}>{formatNumber(expired)}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent Photos</Text>
        {recent.length === 0 ? (
          <Text style={styles.muted}>No recent photos.</Text>
        ) : (
          recent.slice(0, 30).map((item) => (
            <View key={item.id} style={styles.photoRow}>
              <Image
                source={{ uri: item.thumbnail_url || item.image_url }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              <View style={styles.photoMeta}>
                <Text style={styles.photoTitle}>{item.attraction?.name || 'Unknown attraction'}</Text>
                <Text style={styles.photoSub}>{formatRelative(item.taken_at)}</Text>
                <Text style={styles.photoStatus}>{item.status}</Text>
              </View>
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
    marginBottom: 2,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  thumbnail: {
    width: 72,
    height: 54,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  photoMeta: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  photoTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  photoSub: {
    color: colors.muted,
    fontSize: 12,
  },
  photoStatus: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
