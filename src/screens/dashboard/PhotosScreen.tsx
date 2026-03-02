import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { MetricCard } from '../../components/MetricCard';
import { useI18n } from '../../contexts/LanguageContext';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import { usePark } from '../../contexts/ParkContext';
import { useAppTheme } from '../../contexts/ThemeContext';
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
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
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
    return <Screen title={t('nav_photos')}><ActivityIndicator color={colors.primary} /></Screen>;
  }

  return (
    <Screen
      title={t('nav_photos')}
      subtitle={t('photos_subtitle')}
      right={
        <Pressable style={styles.refreshButton} onPress={() => loadPhotos(true)}>
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
        <MetricCard label={t('photos_total_photos')} value={formatNumber(photos.length)} />
        <MetricCard label={t('photos_purchased')} value={formatNumber(purchased)} />
      </View>

      <View style={styles.metricGrid}>
        <MetricCard label={t('photos_available')} value={formatNumber(available)} />
        <MetricCard label={t('photos_conversion')} value={formatPercent(conversionRate)} />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>{t('photos_status_summary')}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('photos_purchased')}</Text>
          <Text style={styles.summaryValue}>{formatNumber(purchased)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('photos_available')}</Text>
          <Text style={styles.summaryValue}>{formatNumber(available)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('photos_expired')}</Text>
          <Text style={styles.summaryValue}>{formatNumber(expired)}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('photos_recent_photos')}</Text>
        {recent.length === 0 ? (
          <Text style={styles.muted}>{t('photos_none')}</Text>
        ) : (
          recent.slice(0, 30).map((item) => (
            <View key={item.id} style={styles.photoRow}>
              <Image
                source={{ uri: item.thumbnail_url || item.image_url }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              <View style={styles.photoMeta}>
                <Text style={styles.photoTitle}>{item.attraction?.name || t('photos_unknown_attraction')}</Text>
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
    backgroundColor: colors.background,
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
    color: colors.dataBlue,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
