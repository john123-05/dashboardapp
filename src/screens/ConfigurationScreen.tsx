import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useWide } from '../components/layout';
import { Screen } from '../components/Screen';
import { Button, Card, EmptyState, ErrorNote, Pill, Segmented, Skeleton } from '../components/ui';
import { successHaptic } from '../components/haptics';
import { usePark } from '../contexts/ParkContext';
import { fetchParkEquipment, meldeAusstattungsInteresse, type EquipmentItem } from '../lib/equipment';
import { useData } from '../lib/useData';
import { colors, font, radius, shadow, space } from '../theme';
import { tr } from '../i18n';

const STATUS: Record<EquipmentItem['status'], { label: string; tone: 'ok' | 'info' | 'warn' }> = {
  vorhanden: { get label() { return tr('Vorhanden'); }, tone: 'ok' },
  empfohlen: { get label() { return tr('Empfohlen'); }, tone: 'info' },
  bestellt: { get label() { return tr('Bestellt'); }, tone: 'warn' },
};

// Konfiguration als Shop: alles, was der Park hat oder ergänzen könnte. "Anfragen" legt eine Nachricht
// an Liftpictures an (keine Bestellung), wie im Web.
export function ConfigurationScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { parkId } = usePark();
  const wide = useWide();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<'alle' | 'empfohlen' | 'vorhanden'>('alle');
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const data = useData(parkId ? `equip:${parkId}` : null, () => fetchParkEquipment(parkId!), [parkId]);
  const items = useMemo(() => (data.data ?? []).filter((i) => filter === 'alle' || i.status === filter).sort((a, b) => a.sortierung - b.sortierung), [data.data, filter]);
  const cols = wide ? 3 : 2;
  const cardW = Math.floor((Math.min(width, 1180) - space.lg * 2 - 12 * (cols - 1) - (wide ? 40 : 0)) / cols);

  async function anfragen(target: { itemId: string } | { label: string }, key: string) {
    try {
      await meldeAusstattungsInteresse(parkId!, target);
      successHaptic();
      setAsked((s) => new Set(s).add(key));
      Alert.alert(tr('Anfrage gesendet'), tr('Liftpictures meldet sich bei dir mit einem Angebot.'));
    } catch (e) {
      Alert.alert(tr('Fehler'), e instanceof Error ? e.message : tr('Anfrage fehlgeschlagen'));
    }
  }

  return (
    <Screen page="configuration" sheet title={tr('Konfiguration')} subtitle={tr('Ausstattung und Zubehör für deinen Park')} onBack={navigation.goBack} backLabel={tr('Schließen')} refreshing={data.refreshing} onRefresh={data.reload}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...font.headline, color: colors.ink }}>{tr('Fotopapier nachbestellen')}</Text>
          <Text style={{ ...font.footnote, color: colors.ink2 }}>{tr('Wir schicken dir eine neue Rolle passend zu deinem Drucker.')}</Text>
        </View>
        <View style={{ width: 120 }}>
          <Button title={asked.has('papier') ? tr('Angefragt') : tr('Anfragen')} kind={asked.has('papier') ? 'plain' : 'primary'} onPress={() => anfragen({ label: tr('Fotopapier nachbestellen') }, 'papier')} />
        </View>
      </Card>

      <Segmented value={filter} onChange={setFilter} options={[{ value: 'alle', label: tr('Alles') }, { value: 'empfohlen', label: tr('Empfohlen') }, { value: 'vorhanden', label: tr('Vorhanden') }]} />
      {data.error && !data.data ? <ErrorNote text={data.error} onRetry={data.reload} /> : null}

      {data.loading && !data.data ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width={cardW} height={cardW + 90} radius={16} />
          ))}
        </View>
      ) : items.length > 0 ? (
        <View style={styles.grid}>
          {items.map((it) => {
            const st = STATUS[it.status];
            const done = asked.has(it.id) || it.status === 'bestellt';
            return (
              <View key={it.id} style={[styles.product, { width: cardW }]}>
                <View style={{ height: cardW * 0.75, backgroundColor: colors.subtle }}>
                  {it.image_url ? <Image source={{ uri: it.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
                  <View style={{ position: 'absolute', top: 8, left: 8 }}>
                    <Pill tone={st.tone} text={st.label} />
                  </View>
                </View>
                <View style={{ padding: 12, gap: 4, flex: 1 }}>
                  <Text style={{ ...font.callout, fontWeight: '700', color: colors.ink }} numberOfLines={2}>
                    {it.titel}
                  </Text>
                  {it.beschreibung ? <Text style={{ ...font.caption, color: colors.ink2, fontWeight: '400' }} numberOfLines={3}>{it.beschreibung}</Text> : null}
                  {it.mehrwert_text ? <Text style={{ ...font.footnote, color: colors.ink, fontWeight: '600', marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>{it.mehrwert_text}</Text> : null}
                  <View style={{ flex: 1 }} />
                  {it.status !== 'vorhanden' ? (
                    <Pressable disabled={done} onPress={() => anfragen({ itemId: it.id }, it.id)} style={({ pressed }) => [styles.ask, done && styles.askDone, pressed && { opacity: 0.8 }]}>
                      <Text style={{ ...font.footnote, fontWeight: '700', color: done ? colors.ink2 : '#fff' }}>{done ? (it.status === 'bestellt' ? tr('Bestellt') : tr('Angefragt')) : tr('Anfragen')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Card>
          <EmptyState icon="storefront-outline" title={tr('Noch nichts hinterlegt')} text={tr('Liftpictures stellt hier passende Ausstattung für deinen Park zusammen.')} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  product: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', ...(shadow as object) },
  ask: { marginTop: 8, minHeight: 38, borderRadius: 10, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  askDone: { backgroundColor: colors.fill },
});
