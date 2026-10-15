import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useWide } from '../components/layout';
import { Screen } from '../components/Screen';
import { Card, EmptyState, ErrorNote, Kpi, KpiGrid, Segmented, Skeleton } from '../components/ui';
import { tapHaptic } from '../components/haptics';
import { usePark } from '../contexts/ParkContext';
import { loadKioskSales } from '../lib/data';
import { formatNumber, formatPercent, formatTime } from '../lib/format';
import { aggregateByDate, todayInTimezone } from '../lib/kioskSales';
import { fetchRecentPhotos, searchPhotosByCode, searchPhotosByDateTime, type BrowsablePhoto } from '../lib/photoBrowser';
import { useData } from '../lib/useData';
import { colors, font, radius, space } from '../theme';

type Mode = 'neu' | 'code' | 'zeit';

export function PhotosScreen() {
  const nav = useNavigation<any>();
  const wide = useWide();
  const { width } = useWindowDimensions();
  const { parkId, timezone } = usePark();
  const [mode, setMode] = useState<Mode>('neu');
  const [code, setCode] = useState('');
  const [time, setTime] = useState('');
  const [results, setResults] = useState<BrowsablePhoto[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const recent = useData(parkId ? `photos:${parkId}` : null, () => fetchRecentPhotos(parkId!, 60), [parkId], 60000);
  const sales = useData(parkId ? `sales:${parkId}` : null, () => loadKioskSales(parkId!), [parkId], 120000);
  const today = useMemo(() => {
    if (!sales.data) return null;
    return aggregateByDate(sales.data.days, sales.data.priceCents ?? 0).find((d) => d.businessDate === todayInTimezone(timezone)) ?? null;
  }, [sales.data, timezone]);

  async function suchen() {
    if (!parkId) return;
    setSearchError(null);
    setSearching(true);
    try {
      if (mode === 'code') setResults(await searchPhotosByCode(parkId, code));
      else {
        const m = time.match(/^(\d{1,2})[:.]?(\d{2})$/);
        if (!m) throw new Error('Bitte eine Uhrzeit wie 14:30 eingeben.');
        const day = todayInTimezone(timezone);
        const iso = new Date(`${day}T${m[1].padStart(2, '0')}:${m[2]}:00`).toISOString();
        setResults(await searchPhotosByDateTime(parkId, iso, { windowMinutes: 10, limit: 12 }));
      }
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Suche fehlgeschlagen');
    }
    setSearching(false);
  }

  const cols = wide ? 5 : 3;
  const gap = 6;
  const contentW = Math.min(wide ? width - 256 - 56 : width - space.lg * 2, 1180 - 56);
  const tile = Math.floor((contentW - gap * (cols - 1)) / cols);
  const list = mode === 'neu' ? recent.data ?? [] : results ?? [];

  return (
    <Screen tabs actions title="Fotos" refreshing={recent.refreshing} onRefresh={recent.reload}>
      <KpiGrid>
        <Kpi icon="camera-outline" label="Fotos heute" value={formatNumber(today?.expectedCount ?? null)} />
        <Kpi icon="bag-check-outline" label="Verkauft heute" value={formatNumber(today?.soldCount ?? null)} sub={today?.conversionRate != null ? `${formatPercent(today.conversionRate)} Kaufquote` : null} />
      </KpiGrid>

      <Segmented<Mode>
        value={mode}
        onChange={(m) => {
          setMode(m);
          setResults(null);
          setSearchError(null);
        }}
        options={[{ value: 'neu', label: 'Neueste' }, { value: 'code', label: 'Bildnummer' }, { value: 'zeit', label: 'Uhrzeit' }]}
      />

      {mode !== 'neu' ? (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.ink3} />
          <TextInput
            value={mode === 'code' ? code : time}
            onChangeText={mode === 'code' ? setCode : setTime}
            placeholder={mode === 'code' ? 'Bildnummer, z. B. 0412' : 'Uhrzeit heute, z. B. 14:30'}
            placeholderTextColor={colors.ink3}
            keyboardType={mode === 'code' ? 'number-pad' : 'numbers-and-punctuation'}
            returnKeyType="search"
            onSubmitEditing={suchen}
            style={styles.searchInput}
          />
          <Pressable onPress={suchen} style={styles.searchBtn} accessibilityRole="button">
            <Text style={{ ...font.callout, color: '#fff', fontWeight: '600' }}>{searching ? '…' : 'Suchen'}</Text>
          </Pressable>
        </View>
      ) : null}
      {searchError ? <ErrorNote text={searchError} /> : null}
      {recent.error && mode === 'neu' && !recent.data ? <ErrorNote text={recent.error} onRetry={recent.reload} /> : null}

      {mode === 'neu' && recent.loading && !recent.data ? (
        <View style={[styles.grid, { gap }]}>
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} width={tile} height={tile} radius={10} />
          ))}
        </View>
      ) : list.length > 0 ? (
        <View style={[styles.grid, { gap }]}>
          {list.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                tapHaptic();
                nav.navigate('PhotoDetail', { photo: p });
              }}
              style={({ pressed }) => [{ width: tile, height: tile, borderRadius: 10, overflow: 'hidden', opacity: pressed ? 0.85 : 1 }]}
            >
              <Image source={p.imageUrl ? { uri: p.imageUrl } : undefined} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} recyclingKey={p.id} />
              <View style={styles.tileFoot}>
                <Text style={styles.tileTime}>{formatTime(p.capturedAt, timezone)}</Text>
                {p.speedKmh ? <Text style={styles.tileTime}>{Math.round(p.speedKmh)} km/h</Text> : null}
              </View>
              {p.isPaid ? (
                <View style={styles.paid}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : (
        <Card>
          <EmptyState icon="images-outline" title={mode === 'neu' ? 'Noch keine Fotos' : results ? 'Nichts gefunden' : 'Suche starten'} text={mode === 'neu' ? 'Sobald der Automat Fotos hochlädt, erscheinen sie hier.' : undefined} />
        </Card>
      )}
      {list.length > 0 ? <Text style={{ ...font.caption, color: colors.ink3, textAlign: 'center' }}>Grüner Haken: Foto wurde gekauft. Fotos werden nach etwa 30 Tagen gelöscht.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tileFoot: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.35)' },
  tileTime: { color: '#fff', fontSize: 10.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  paid: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.ok, alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: radius.md, paddingLeft: space.md, paddingRight: 6, minHeight: 52, borderWidth: 1, borderColor: colors.lineStrong },
  searchInput: { flex: 1, ...font.body, fontSize: 17, color: colors.ink, paddingVertical: 10 },
  searchBtn: { backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
});
