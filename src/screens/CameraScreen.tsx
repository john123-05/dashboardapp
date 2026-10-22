import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image as RNImage, Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, FeColorMatrix, Filter, Image as SvgImage } from 'react-native-svg';
import { CardHead, Notice, PickerSheet, SaveBar, SelectRow, Slider } from '../components/controls';
import { successHaptic, tapHaptic } from '../components/haptics';
import { useWide } from '../components/layout';
import { Screen } from '../components/Screen';
import { Button, Card, EmptyState, ErrorNote, Pill, Segmented, Skeleton } from '../components/ui';
import { usePark } from '../contexts/ParkContext';
import { anzeige, cameraSend, EIGENSCHAFTEN, GRUPPEN, istWert, MAX_OFFLINE_MINUTEN, nameLabel, triggerTestPhoto, vorschauMatrix, wertAus, type Eigenschaft, type KameraAutomat } from '../lib/camera';
import { loadHealth } from '../lib/data';
import { formatTime } from '../lib/format';
import { fetchRecentPhotos } from '../lib/photoBrowser';
import { useData } from '../lib/useData';
import { colors, font, radius, space } from '../theme';

// Kamera wie im Web (/kamera): Regler stehen auf dem, was die Kamera meldet. Verschieben ändert nur
// die Vorschau am letzten Foto; erst „An Kamera senden“ schreibt die Werte (mit Sicherung und Neustart).
export function CameraScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { parkId, timezone, reloadKiosk } = usePark();
  const wide = useWide();
  const { width } = useWindowDimensions();
  const machines = useData(parkId ? `health:${parkId}` : null, () => loadHealth(parkId!) as Promise<KameraAutomat[]>, [parkId], 60000);
  const photos = useData(parkId ? `camphotos:${parkId}` : null, () => fetchRecentPhotos(parkId!, 60), [parkId], 0);
  const mitKamera = (machines.data ?? []).filter((m) => m.camera_settings);
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const automat = mitKamera.find((m) => m.id === gewaehlt) ?? mitKamera[0] ?? null;
  const kamera = automat?.camera_settings ?? null;

  const [entwurf, setEntwurf] = useState<Record<string, number>>({});
  const [offen, setOffen] = useState<Record<string, boolean>>({ exposure: true, color: wide, contrast: wide, sharp: wide });
  const [erklaert, setErklaert] = useState<Record<string, boolean>>({});
  const [original, setOriginal] = useState(false);
  const [technik, setTechnik] = useState(false);
  const [busy, setBusy] = useState<'senden' | 'testfoto' | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [bildUrl, setBildUrl] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);

  // Der Entwurf startet immer bei dem, was die Kamera meldet.
  const startwerte = useMemo(() => {
    const s: Record<string, number> = {};
    for (const e of EIGENSCHAFTEN) {
      const w = wertAus(kamera?.werte, e.schluessel);
      if (w !== null) s[e.schluessel] = w;
    }
    return s;
  }, [kamera]);
  useEffect(() => setEntwurf(startwerte), [startwerte]);

  const bedienbar = useMemo(() => EIGENSCHAFTEN.filter((e) => wertAus(kamera?.werte, e.schluessel) !== null), [kamera]);
  const geaendert = bedienbar.filter((e) => entwurf[e.schluessel] !== undefined && entwurf[e.schluessel] !== wertAus(kamera?.werte, e.schluessel));
  const matrix = kamera ? vorschauMatrix(geaendert, entwurf, kamera.werte) : null;

  const verlauf = (photos.data ?? []).filter((f) => f.isTest && f.imageUrl).slice(0, 8);
  const letztes = (photos.data ?? [])[0] ?? null;
  const bild = bildUrl ? (photos.data ?? []).find((p) => p.imageUrl === bildUrl) ?? letztes : letztes;
  const verbunden = automat?.offline_minutes == null || automat.offline_minutes <= MAX_OFFLINE_MINUTEN;
  const belichtungAuto = wertAus(kamera?.werte, 'Exposure.Auto') === 1 && entwurf['Exposure.Auto'] !== 0;

  const setze = (e: Eigenschaft, wert: number) => {
    const begrenzt = Math.min(e.bis, Math.max(e.von, Number(wert.toFixed(6))));
    setEntwurf((a) => ({ ...a, [e.schluessel]: begrenzt }));
    setOriginal(false);
    setHinweis(null);
  };

  function senden() {
    if (!automat || !parkId || geaendert.length === 0) return;
    const liste = geaendert.map((e) => `${e.titel}: ${anzeige(e, wertAus(kamera!.werte, e.schluessel)!)} → ${anzeige(e, entwurf[e.schluessel])}`).join('\n');
    Alert.alert('Änderungen an die Kamera senden?', `${liste}\n\nDie Kamerasoftware startet danach neu – für einige Sekunden entstehen keine Fotos. Der Automat sichert vorher die alten Werte.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'An Kamera senden',
        onPress: async () => {
          setBusy('senden');
          setFehler(null);
          setHinweis(null);
          try {
            const werte: Record<string, number> = {};
            for (const e of geaendert) werte[e.schluessel] = entwurf[e.schluessel];
            await cameraSend(parkId, automat.id, werte);
            successHaptic();
            setHinweis('Auftrag abgelegt. Der Automat holt ihn sich binnen zwei Minuten, schreibt die Werte und startet die Kamera neu. Das Ergebnis steht danach im Verlauf unter Systemzustand – auch wenn etwas abgelehnt wurde.');
          } catch (e) {
            setFehler(e instanceof Error ? e.message : 'Auftrag fehlgeschlagen.');
          }
          setBusy(null);
        },
      },
    ]);
  }

  function testfoto() {
    if (!automat || !parkId) return;
    Alert.alert('Testfoto auslösen?', 'Der Automat nimmt jetzt ein Foto auf und schickt es durch die ganze Kette. Es erscheint nach etwa einer Minute hier.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Testfoto auslösen',
        onPress: async () => {
          setBusy('testfoto');
          setFehler(null);
          try {
            await triggerTestPhoto(parkId, automat.id);
            successHaptic();
            setHinweis('Testfoto beauftragt. Es dauert bis zu einer Minute – dann auf „Bild neu laden“ tippen oder nach unten ziehen.');
          } catch (e) {
            setFehler(e instanceof Error ? e.message : 'Auftrag fehlgeschlagen.');
          }
          setBusy(null);
        },
      },
    ]);
  }

  const reload = () => {
    machines.reload();
    photos.reload();
    reloadKiosk();
  };

  if (machines.loading && !machines.data) {
    return (
      <Screen page="kamera" title="Kamera" subtitle="Einstellungen und Bildkontrolle" onBack={navigation.goBack}>
        <Skeleton height={240} radius={radius.lg} />
        <Skeleton height={120} radius={radius.lg} />
      </Screen>
    );
  }

  if (!automat || !kamera) {
    return (
      <Screen page="kamera" title="Kamera" subtitle="Einstellungen und Bildkontrolle" onBack={navigation.goBack} refreshing={machines.refreshing} onRefresh={reload}>
        {machines.error ? <ErrorNote text={machines.error} onRetry={machines.reload} /> : null}
        <Card>
          <EmptyState icon="camera-outline" title="Keine Kamera gemeldet" text="Für diesen Park meldet kein Automat eine Kamerasoftware. Die Seite erscheint von selbst, sobald einer es tut." />
        </Card>
      </Screen>
    );
  }

  const zugeordnet = new Set(GRUPPEN.flatMap((g) => g.schluessel));
  const gruppen = GRUPPEN.map((g, i) => ({ ...g, regler: bedienbar.filter((e) => g.schluessel.includes(e.schluessel) || (i === GRUPPEN.length - 1 && !zugeordnet.has(e.schluessel))) })).filter((g) => g.regler.length > 0);
  const untertitel = [kamera.modell, kamera.seriennummer ? `Nr. ${kamera.seriennummer}` : null, kamera.fps ? `${kamera.fps} Bilder/s` : null].filter(Boolean).join(' · ');
  const imgW = wide ? Math.min(760, (width - 256 - 64) * 0.55) : width - space.lg * 2 - space.lg * 2;

  const bildKarte = (
    <Card style={{ gap: space.md }}>
      <CardHead
        title="Letztes Foto"
        sub={bild ? `aufgenommen ${formatTime(bild.capturedAt, timezone)}${bild.isTest ? ' · Testfoto' : ''}` : 'noch keins vorhanden'}
        right={matrix ? <View style={{ width: 170 }}><Segmented<'v' | 'o'> value={original ? 'o' : 'v'} onChange={(v) => setOriginal(v === 'o')} options={[{ value: 'v', label: 'Vorschau' }, { value: 'o', label: 'Original' }]} /></View> : null}
      />
      {bild?.imageUrl ? (
        <PreviewImage uri={bild.imageUrl} width={imgW} matrix={!original ? matrix : null} />
      ) : (
        <View style={styles.noPhoto}>
          <Text style={{ ...font.subhead, color: colors.ink2, textAlign: 'center' }}>Für diesen Park liegt noch kein Foto vor.</Text>
        </View>
      )}
      {verlauf.length > 1 ? (
        <View style={{ gap: 6 }}>
          <Text style={{ ...font.caption, color: colors.ink3 }}>Letzte Testfotos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {verlauf.map((v) => (
              <Pressable key={v.id} onPress={() => { tapHaptic(); setBildUrl(v.imageUrl); }} style={[styles.thumb, bild?.id === v.id && { borderColor: colors.brand, borderWidth: 2 }]}>
                <Image source={{ uri: v.imageUrl! }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="Bild neu laden" icon="refresh" kind="plain" onPress={() => { setBildUrl(null); photos.reload(); }} />
        </View>
        {automat.can_test_photo ? (
          <View style={{ flex: 1 }}>
            <Button title={busy === 'testfoto' ? 'Wird ausgelöst…' : 'Testfoto'} icon="camera-outline" kind="plain" loading={busy === 'testfoto'} onPress={testfoto} />
          </View>
        ) : null}
      </View>
      <Text style={{ ...font.caption, color: colors.ink3, fontWeight: '400' }}>
        Kein Livebild: die Kamera hängt am Automaten, nicht am Internet. Die Vorschau ist eine Annäherung am fertigen Bild, keine Aufnahme mit den neuen Werten.
      </Text>
    </Card>
  );

  const regler = (
    <View style={{ gap: space.md }}>
      {belichtungAuto ? <Notice tone="warn" text="Die Belichtung steht auf automatisch. Die Belichtungszeit von Hand zu setzen bleibt dann wirkungslos – wirksam ist die Ziel-Helligkeit. Oder die Automatik ausschalten." /> : null}
      {gruppen.map((g) => {
        const anzahl = g.regler.filter((e) => geaendert.includes(e)).length;
        const auf = offen[g.id] ?? true;
        return (
          <Card key={g.id} padded={false} style={{ overflow: 'hidden' }}>
            <Pressable onPress={() => { tapHaptic(); setOffen((a) => ({ ...a, [g.id]: !auf })); }} style={({ pressed }) => [styles.groupHead, pressed && { backgroundColor: colors.fill }]} accessibilityState={{ expanded: auf }}>
              <View style={styles.groupIcon}>
                <Ionicons name={g.icon} size={18} color={colors.ink2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...font.headline, color: colors.ink }}>{g.titel}</Text>
                <Text style={{ ...font.footnote, color: colors.ink2 }}>{g.sub}</Text>
              </View>
              {anzahl > 0 ? <Pill tone="warn" text={`${anzahl} geändert`} /> : null}
              <Ionicons name={auf ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink3} />
            </Pressable>
            {auf
              ? g.regler.map((e) => {
                  const alt = wertAus(kamera.werte, e.schluessel)!;
                  const jetzt = entwurf[e.schluessel] ?? alt;
                  const anders = jetzt !== alt;
                  const zeigt = erklaert[e.schluessel] ?? false;
                  return (
                    <View key={e.schluessel} style={styles.prop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ ...font.callout, color: colors.ink, flex: 1 }} numberOfLines={1}>
                          {e.titel}
                        </Text>
                        {!e.vorschau && e.art === 'zahl' ? <Pill text="ohne Vorschau" /> : null}
                        {anders ? (
                          <Pressable onPress={() => { tapHaptic(); setze(e, alt); }} hitSlop={8} accessibilityLabel={`Zurücksetzen: ${e.titel}`}>
                            <Ionicons name="arrow-undo-outline" size={17} color={colors.ink3} />
                          </Pressable>
                        ) : null}
                        <View style={[styles.value, anders && { backgroundColor: colors.brandSoft }]}>
                          <Text style={[styles.valueText, anders && { color: colors.brand, fontWeight: '700' }]}>{anzeige(e, jetzt)}</Text>
                        </View>
                        <Pressable onPress={() => { tapHaptic(); setErklaert((a) => ({ ...a, [e.schluessel]: !zeigt })); }} hitSlop={8} accessibilityLabel={`Erklärung: ${e.titel}`}>
                          <Ionicons name={zeigt ? 'information-circle' : 'information-circle-outline'} size={20} color={zeigt ? colors.ink : colors.ink3} />
                        </Pressable>
                      </View>
                      {e.art === 'schalter' ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                          <Switch value={jetzt === 1} onValueChange={(v) => { tapHaptic(); setze(e, v ? 1 : 0); }} trackColor={{ true: colors.ok, false: undefined }} />
                        </View>
                      ) : (
                        <View style={{ marginTop: 6 }}>
                          <Slider value={jetzt} min={e.von} max={e.bis} step={e.schritt} origin={alt} onChange={(v) => setze(e, v)} />
                        </View>
                      )}
                      {anders ? <Text style={{ ...font.caption, color: colors.ink3, fontWeight: '400' }}>Kamera: {anzeige(e, alt)}</Text> : null}
                      {zeigt ? <Text style={styles.explain}>{e.erklaerung}</Text> : null}
                    </View>
                  );
                })
              : null}
          </Card>
        );
      })}

      <Card padded={false} style={{ overflow: 'hidden' }}>
        <Pressable onPress={() => { tapHaptic(); setTechnik((v) => !v); }} style={({ pressed }) => [styles.groupHead, pressed && { backgroundColor: colors.fill }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...font.headline, color: colors.ink }}>Technische Werte</Text>
            <Text style={{ ...font.footnote, color: colors.ink2 }} numberOfLines={2}>
              Gelesen aus {kamera.quelle ?? '—'}
              {kamera.programm ? `, gesteuert von ${kamera.programm}` : ''}
            </Text>
          </View>
          <Ionicons name={technik ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink3} />
        </Pressable>
        {technik ? (
          <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: 8 }}>
            {Object.keys(kamera.werte ?? {})
              .sort()
              .map((name) => (
                <View key={name} style={styles.techRow}>
                  <Text style={{ ...font.subhead, color: colors.ink2, flex: 1 }}>{nameLabel(name)}</Text>
                  <Text style={{ ...font.footnote, color: colors.ink, fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 1 }}>{istWert(kamera.werte, name)}</Text>
                </View>
              ))}
            <Text style={{ ...font.caption, color: colors.ink3, fontWeight: '400', marginTop: 4 }}>
              Nicht alles, was die Kamera kann, steht hier. Auslöser, Blitzausgang und Netzwerkeinstellungen bleiben bewusst außen vor – sie gehören zur Verkabelung der Anlage, nicht zur Bildgestaltung.
            </Text>
          </View>
        ) : null}
      </Card>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen page="kamera"
        title="Kamera"
        subtitle={untertitel || 'Einstellungen und Bildkontrolle'}
        onBack={navigation.goBack}
        refreshing={machines.refreshing || photos.refreshing}
        onRefresh={reload}
        right={<Pill tone={verbunden ? 'ok' : 'warn'} icon={verbunden ? 'radio-button-on' : 'cloud-offline-outline'} text={verbunden ? 'Verbunden' : `Seit ${Math.round(automat.offline_minutes ?? 0)} Min. getrennt`} />}
      >
        {mitKamera.length > 1 ? <SelectRow label="Automat" value={automat.machine_label || automat.machine_id} onPress={() => setPicker(true)} /> : null}
        {fehler ? <ErrorNote text={fehler} /> : null}
        {hinweis ? <Notice text={hinweis} /> : null}
        {kamera.fehler ? <Notice tone="warn" text={`Die Einstellungen konnten nicht gelesen werden: ${kamera.fehler}`} /> : null}

        <View style={[styles.steps, wide && { flexDirection: 'row' }]}>
          {[
            ['Regler verschieben', 'Die Wirkung siehst du sofort am Foto.'],
            ['Vorher und nachher vergleichen', 'Mit „Original“ wechselst du zurück zum unveränderten Bild.'],
            ['An Kamera senden', 'Erst dann wird die Kamera umgestellt – die alten Werte werden vorher gesichert.'],
          ].map(([t, s], i) => (
            <View key={t} style={[styles.step, wide && { flex: 1 }]}>
              <View style={styles.stepNo}>
                <Text style={{ color: colors.onBrand, fontWeight: '700', fontSize: 12 }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...font.callout, color: colors.ink, fontWeight: '600' }}>{t}</Text>
                <Text style={{ ...font.footnote, color: colors.ink2 }}>{s}</Text>
              </View>
            </View>
          ))}
        </View>

        {wide ? (
          <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' }}>
            <View style={{ flex: 1.2 }}>{bildKarte}</View>
            <View style={{ flex: 1 }}>{regler}</View>
          </View>
        ) : (
          <>
            {bildKarte}
            {regler}
          </>
        )}
        {geaendert.length > 0 ? <View style={{ height: 70 }} /> : null}
      </Screen>
      <SaveBar
        visible={geaendert.length > 0}
        text={`${geaendert.length} ${geaendert.length === 1 ? 'Änderung' : 'Änderungen'} bereit`}
        saveLabel="An Kamera senden"
        busy={busy === 'senden'}
        onSave={senden}
        onDiscard={() => {
          setEntwurf(startwerte);
          setOriginal(false);
        }}
      />
      <PickerSheet
        open={picker}
        title="Automat"
        value={automat.id}
        options={mitKamera.map((m) => ({ value: m.id, label: m.machine_label || m.machine_id, sub: m.camera_settings?.modell ?? undefined }))}
        onPick={(id) => setGewaehlt(id)}
        onClose={() => setPicker(false)}
      />
    </View>
  );
}

/** Foto mit Farbmatrix als Vorschau (react-native-svg feColorMatrix). */
function PreviewImage({ uri, width, matrix }: { uri: string; width: number; matrix: string | null }) {
  const [ratio, setRatio] = useState(4 / 3);
  useEffect(() => {
    RNImage.getSize(uri, (w, h) => w && h && setRatio(w / h), () => undefined);
  }, [uri]);
  const height = Math.round(width / ratio);
  return (
    <View style={{ borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.subtle, width, height, alignSelf: 'center' }}>
      {matrix ? (
        <Svg width={width} height={height}>
          <Defs>
            <Filter id="kamera" x="0" y="0" width="100%" height="100%">
              <FeColorMatrix type="matrix" values={matrix} />
            </Filter>
          </Defs>
          <SvgImage href={{ uri }} x={0} y={0} width={width} height={height} preserveAspectRatio="xMidYMid slice" filter="url(#kamera)" />
        </Svg>
      ) : (
        <Image source={{ uri }} style={{ width, height }} contentFit="cover" transition={120} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  noPhoto: { minHeight: 200, borderRadius: radius.md, backgroundColor: colors.subtle, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  thumb: { width: 92, height: 62, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14, minHeight: 64 },
  groupIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  prop: { paddingHorizontal: space.lg, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineStrong, gap: 4 },
  value: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.fill },
  valueText: { ...font.footnote, color: colors.ink2, fontVariant: ['tabular-nums'] },
  explain: { ...font.footnote, color: colors.ink2, backgroundColor: colors.subtle, borderRadius: 10, padding: 10, marginTop: 4 },
  techRow: { flexDirection: 'row', gap: 10, alignItems: 'baseline', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  steps: { gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: colors.line },
  step: { flexDirection: 'row', gap: 10 },
  stepNo: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
