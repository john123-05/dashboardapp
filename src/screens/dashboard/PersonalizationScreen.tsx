import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { useI18n } from '../../contexts/LanguageContext';
import { usePark } from '../../contexts/ParkContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import { formatRelative } from '../../lib/utils';

interface PhotoRow {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  taken_at: string;
  attraction: { name: string } | null;
}

export function PersonalizationScreen() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { parkId } = usePark();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestPhoto, setLatestPhoto] = useState<PhotoRow | null>(null);
  const [overlayUri, setOverlayUri] = useState<string | null>(null);

  useEffect(() => {
    loadPreview();
  }, [parkId]);

  async function loadPreview(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await invokeEdgeFunction<{ photos: PhotoRow[]; recent?: PhotoRow[] }>('external-photos', {
      query: { park_id: parkId || undefined },
    });

    if (result.error) {
      setError(result.error);
      setLatestPhoto(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const candidates = [...(result.data?.recent ?? []), ...(result.data?.photos ?? [])];
    const latest =
      candidates
        .slice()
        .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime())[0] ?? null;

    setLatestPhoto(latest);
    setError(null);
    setLoading(false);
    setRefreshing(false);
  }

  async function pickOverlay() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (result.canceled || result.assets.length === 0) return;
    setOverlayUri(result.assets[0].uri);
  }

  const previewImageUri = useMemo(
    () => latestPhoto?.image_url || latestPhoto?.thumbnail_url || null,
    [latestPhoto]
  );

  if (loading) {
    return <Screen title={t('nav_personalization')}><ActivityIndicator color={colors.primary} /></Screen>;
  }

  return (
    <Screen
      title={t('nav_personalization')}
      subtitle={t('personalization_subtitle')}
      right={
        <Pressable style={styles.refreshButton} onPress={() => loadPreview(true)}>
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
        <Text style={styles.title}>{t('personalization_preview')}</Text>
        {previewImageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: previewImageUri }} style={styles.baseImage} resizeMode="cover" />
            {overlayUri ? (
              <Image source={{ uri: overlayUri }} style={styles.overlayImage} resizeMode="contain" />
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyText}>{t('personalization_no_photos')}</Text>
          </View>
        )}

        <Text style={styles.previewMeta}>
          {latestPhoto
            ? `${latestPhoto.attraction?.name || t('common_unknown_attraction')} • ${formatRelative(latestPhoto.taken_at)}`
            : t('personalization_latest_unavailable')}
        </Text>
      </Card>

      <Card>
        <Text style={styles.title}>{t('personalization_overlays')}</Text>
        <Pressable style={styles.uploadButton} onPress={pickOverlay}>
          <Text style={styles.uploadButtonText}>{t('personalization_upload_overlay')}</Text>
        </Pressable>
        <Text style={styles.body}>{overlayUri ? t('personalization_overlay_applied') : t('common_none')}</Text>
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
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  previewWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    aspectRatio: 4 / 3,
  },
  baseImage: {
    width: '100%',
    height: '100%',
  },
  overlayImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  emptyPreview: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 16,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
  },
  previewMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
