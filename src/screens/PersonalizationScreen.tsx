import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CardHead, Input, MiniButton, Notice, PickerSheet, SelectRow, SwitchRow } from '../components/controls';
import { successHaptic, tapHaptic } from '../components/haptics';
import { useWide } from '../components/layout';
import { Screen } from '../components/Screen';
import { Button, Card, ErrorNote, ListCard, Pill, Row, Section, Segmented, Skeleton } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import { formatBytes, pickImage, type PickedImage } from '../lib/imagePick';
import {
  activateOverlay,
  activeCampaign,
  basename,
  deleteOverlay,
  displayFor,
  generateOverlays,
  latestPhotoUrl,
  loadBranding,
  loadOverlays,
  pickedToUpload,
  requestRestart,
  sendToSlot,
  SLOTS,
  uploadCurrentRef,
  uploadOverlay,
  type OverlayAsset,
  type SlotId,
} from '../lib/overlays';
import { useData } from '../lib/useData';
import { colors, font, radius, space } from '../theme';

const CHECKER = colors.subtle;

// Personalisierung wie im Web (/personalization): oben, was gerade am Automaten zu sehen ist und wie
// man es ändert; darunter die gespeicherten Overlays (antippen = verwenden) und die KI.
export function PersonalizationScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const nav = useNavigation<any>();
  const wide = useWide();
  const { width } = useWindowDimensions();
  const { parkId } = usePark();
  const { user } = useAuth();
  const branding = useData(parkId ? `branding:${parkId}` : null, () => loadBranding(parkId!), [parkId], 60000);
  const overlays = useData(parkId ? `overlays:${parkId}` : null, () => loadOverlays(parkId!), [parkId], 0);
  const base = useData(parkId ? `basephoto:${parkId}` : null, () => latestPhotoUrl(parkId!), [parkId], 0);

  const [machineId, setMachineId] = useState<string | null>(null);
  const [machinePicker, setMachinePicker] = useState(false);
  const [editing, setEditing] = useState<SlotId | null>(null);
  const [source, setSource] = useState<'gallery' | 'upload'>('gallery');
  const [galleryPick, setGalleryPick] = useState<string | null>(null);
  const [file, setFile] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [autoApply, setAutoApply] = useState(true);
  const [message, setMessage] = useState('');
  const [prompt, setPrompt] = useState('');

  const machines = branding.data?.machines ?? [];
  const machine = machines.find((m) => m.id === machineId) ?? machines[0] ?? null;
  const assets = overlays.data?.assets ?? [];
  const campaign = overlays.data ? activeCampaign(overlays.data.campaigns) : null;
  const activeIds = new Set((campaign?.layers ?? []).map((l) => l.asset_id));
  const activeLayers = useMemo(() => [...(campaign?.layers ?? [])].sort((a, b) => a.z_index - b.z_index), [campaign]);
  const minutes = machine?.last_seen_at ? (Date.now() - new Date(machine.last_seen_at).getTime()) / 60000 : null;
  const online = minutes !== null && minutes < 5;
  const slot = SLOTS.find((s) => s.id === editing) ?? null;
  const chosenOverlay = assets.find((a) => a.id === (galleryPick ?? assets[0]?.id)) ?? null;

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    setStatus(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  }

  /** Mediathek oder Kamera, auf dem iPhone als Aktionsblatt. */
  function chooseSource(then: (src: 'library' | 'camera') => void) {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: ['Abbrechen', 'Aus Fotos wählen', 'Foto aufnehmen'], cancelButtonIndex: 0 }, (i) => {
        if (i === 1) then('library');
        if (i === 2) then('camera');
      });
    } else then('library');
  }

  const pick = (src: 'library' | 'camera', base64 = false) => pickImage(src, { base64 });

  function sendNow() {
    if (!machine || !parkId || !slot) return;
    void run('send', async () => {
      if (source === 'upload') {
        if (!file) throw new Error('Bitte wähle zuerst ein Bild.');
        await sendToSlot(parkId, machine.id, slot.id, { picked: file });
      } else {
        if (!chosenOverlay) throw new Error('Bitte wähle ein gespeichertes Overlay aus.');
        await sendToSlot(parkId, machine.id, slot.id, { overlay: chosenOverlay });
      }
      successHaptic();
      setFile(null);
      setStatus(`„${slot.label}“ wurde an ${machine.machine_label || machine.machine_id} übergeben. Damit es sichtbar wird, jetzt noch das Verkaufsprogramm neu starten.`);
      branding.reload();
    });
  }

  function restart(mode: 'now' | 'tonight' | 'cancel') {
    if (!machine || !parkId) return;
    const go = () =>
      run('restart', async () => {
        await requestRestart(parkId, machine.id, mode);
        successHaptic();
        setStatus(mode === 'cancel' ? 'Neustart zurückgenommen.' : mode === 'now' ? 'Neustart beauftragt. Der Automat führt ihn innerhalb der nächsten Minute aus.' : 'Neustart für heute Nacht vorgemerkt. Der Automat führt ihn in der Ruhezeit aus.');
        if (mode !== 'cancel') setEditing(null);
        branding.reload();
      });
    if (mode === 'now') {
      Alert.alert('Verkaufsprogramm neu starten?', 'Das Verkaufsprogramm wird sofort beendet und neu gestartet. Etwa 15 Sekunden lang kann kein Foto verkauft werden. Nur ausführen, wenn gerade niemand am Automaten steht.', [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Jetzt neu starten', style: 'destructive', onPress: () => void go() },
      ]);
    } else void go();
  }

  function storeReference(slotId: SlotId) {
    if (!machine || !parkId) return;
    chooseSource((src) =>
      void run(`ref:${slotId}`, async () => {
        const img = await pick(src, true);
        if (!img) return;
        await uploadCurrentRef(parkId, machine.machine_id, slotId, img);
        successHaptic();
        setStatus(`„${SLOTS.find((s) => s.id === slotId)?.label}“ hinterlegt. Am Automaten hat sich nichts geändert.`);
        branding.reload();
      }),
    );
  }

  function uploadReady() {
    if (!parkId || !user) return;
    chooseSource((src) =>
      void run('upload', async () => {
        const img = await pick(src, true);
        if (!img) return;
        const asset = await uploadOverlay(parkId, user.id, pickedToUpload(img));
        if (autoApply) await activateOverlay(parkId, asset);
        successHaptic();
        setStatus(autoApply ? 'Overlay hochgeladen und aktiviert.' : 'Overlay hochgeladen.');
        overlays.reload();
      }),
    );
  }

  function activate(a: OverlayAsset) {
    if (!parkId || activeIds.has(a.id)) return;
    void run(`act:${a.id}`, async () => {
      await activateOverlay(parkId, a);
      successHaptic();
      setStatus('Overlay ist jetzt aktiv.');
      overlays.reload();
    });
  }

  function remove(a: OverlayAsset) {
    Alert.alert('Overlay löschen?', `${basename(a.path)} wird endgültig entfernt.`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => void run(`del:${a.id}`, async () => { await deleteOverlay(a); overlays.reload(); }) },
    ]);
  }

  function generate() {
    if (!parkId || !user) return;
    if (!message.trim() && !prompt.trim()) {
      setError('Bitte gib eine Nachricht oder eine Beschreibung ein.');
      return;
    }
    void run('ai', async () => {
      const asset = await generateOverlays(parkId, user.id, message.trim(), prompt.trim(), base.data ?? null);
      if (!asset) throw new Error('Die KI hat kein Overlay geliefert. Bitte mit einer anderen Beschreibung erneut versuchen.');
      if (autoApply) await activateOverlay(parkId, asset);
      successHaptic();
      setStatus(autoApply ? 'KI-Overlay erstellt und aktiviert.' : 'KI-Overlay erstellt und gespeichert.');
      overlays.reload();
    });
  }

  const contentW = wide ? Math.min(1100, width - 256 - 64) : width - space.lg * 2;
  const tileW = wide ? Math.floor((contentW - 2 * space.md) / 3) : Math.round(contentW * 0.78);
  const gridCols = wide ? 5 : 3;
  const gridTile = Math.floor((contentW - space.lg * 2 - (gridCols - 1) * 8) / gridCols);
  const previewW = wide ? Math.min(560, contentW * 0.5) : contentW - space.lg * 2;

  return (
    <Screen page="personalization"
      title="Personalisierung"
      subtitle="Overlays und Bilder am Automaten"
      onBack={navigation.goBack}
      refreshing={branding.refreshing || overlays.refreshing}
      onRefresh={() => {
        branding.reload();
        overlays.reload();
        base.reload();
      }}
    >
      {error ? <ErrorNote text={error} /> : null}
      {status ? <Notice text={status} /> : null}

      {/* ---------------------------------------------------------- Am Automaten */}
      <Section title="Overlays ändern">
        <Text style={styles.lead}>Was gerade auf dem Automaten zu sehen ist – und wie du es änderst.</Text>
        {branding.loading && !branding.data ? (
          <Skeleton height={220} radius={radius.lg} />
        ) : branding.error && !branding.data ? (
          <ErrorNote text={branding.error} onRetry={branding.reload} />
        ) : branding.data?.notDeployed ? (
          <Notice tone="warn" text="Diese Funktion ist auf dem Server noch nicht freigeschaltet (operator-liftpic-assets)." />
        ) : !machine ? (
          <Card>
            <Text style={{ ...font.subhead, color: colors.ink2 }}>Für deinen Park ist derzeit kein Automat eingerichtet.</Text>
          </Card>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {machines.length > 1 ? (
                <View style={{ flex: 1, minWidth: 220 }}>
                  <SelectRow label="Automat" value={machine.machine_label || machine.machine_id} onPress={() => setMachinePicker(true)} />
                </View>
              ) : null}
              <Pill tone={online ? 'ok' : 'neutral'} icon="desktop-outline" text={`${machines.length === 1 ? `${machine.machine_label || machine.machine_id} · ` : ''}${online ? 'Verbunden' : minutes === null ? 'noch nie gesehen' : `zuletzt vor ${Math.round(minutes)} Min.`}`} />
            </View>

            <SlotRow wide={wide}>
              {SLOTS.map((s) => {
                const shown = displayFor(s.id, machine, branding.data!.assets, branding.data!.refs);
                const on = editing === s.id;
                return (
                  <View key={s.id} style={[styles.slot, wide ? { flex: 1 } : { width: tileW }, on && { borderColor: colors.brand, borderWidth: 2 }]}>
                    <View style={styles.slotImg}>
                      {shown ? <Image source={{ uri: shown.url }} style={StyleSheet.absoluteFill} contentFit="contain" transition={120} /> : <Ionicons name="image-outline" size={26} color={colors.ink3} />}
                      {shown ? (
                        <View style={{ position: 'absolute', left: 8, top: 8 }}>
                          <Pill tone={shown.kind === 'sent' ? 'ok' : 'neutral'} text={shown.kind === 'sent' ? 'Gesendet' : 'Hinterlegt'} />
                        </View>
                      ) : null}
                    </View>
                    <View style={{ padding: space.md, gap: 4, flex: 1 }}>
                      <Text style={{ ...font.headline, color: colors.ink }}>{s.label}</Text>
                      <Text style={{ ...font.footnote, color: colors.ink2 }}>{s.desc}</Text>
                      <Text style={{ ...font.caption, color: colors.ink3, fontWeight: '400' }}>
                        {shown ? (shown.when ? `Zuletzt geändert: ${new Date(shown.when).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}` : 'Aktualisiert') : 'Noch nichts hochgeladen'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <MiniButton title="Ändern" tone="brand" icon="swap-horizontal" onPress={() => { setEditing(s.id); setSource(assets.length ? 'gallery' : 'upload'); setFile(null); setStatus(null); }} />
                        <MiniButton title="Stand hinterlegen" icon="time-outline" busy={busy === `ref:${s.id}`} onPress={() => storeReference(s.id)} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </SlotRow>
            <Text style={styles.hint}>„Stand hinterlegen“ lädt das Bild hoch, das gerade auf dem Automaten ist – nur zum Anzeigen. Es wird nicht an den Automaten gesendet, kein Neustart.</Text>

            {slot ? (
              <Card style={{ gap: space.md }}>
                <CardHead title={`${slot.label} ändern`} sub={slot.tip} right={<MiniButton icon="close" onPress={() => setEditing(null)} />} />
                <Segmented<'gallery' | 'upload'> value={source} onChange={setSource} options={[{ value: 'gallery', label: `Meine Overlays (${assets.length})` }, { value: 'upload', label: 'Neues Bild' }]} />
                {source === 'gallery' ? (
                  assets.length === 0 ? (
                    <Text style={styles.hint}>Du hast noch keine Overlays gespeichert. Lade unten eines hoch oder lass es von der KI erstellen.</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                      {assets.map((a) => {
                        const sel = a.id === (galleryPick ?? assets[0]?.id);
                        return (
                          <Pressable key={a.id} onPress={() => { tapHaptic(); setGalleryPick(a.id); }} style={[styles.pickTile, sel && { borderColor: colors.brand, borderWidth: 2 }]}>
                            <View style={styles.pickImg}>{a.preview_url ? <Image source={{ uri: a.preview_url }} style={StyleSheet.absoluteFill} contentFit="contain" /> : null}</View>
                            <Text style={{ ...font.caption, color: colors.ink2 }} numberOfLines={1}>{a.width && a.height ? `${a.width} × ${a.height}` : 'Größe unbekannt'}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )
                ) : (
                  <View style={{ gap: 10 }}>
                    <Button title={file ? 'Anderes Bild wählen' : 'Bild wählen'} icon="image-outline" kind="plain" onPress={() => chooseSource((src) => void run('pick', async () => { const img = await pick(src); if (img) setFile(img); }))} />
                    {file ? (
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <View style={[styles.pickImg, { width: 120, height: 90 }]}>
                          <Image source={{ uri: file.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ ...font.callout, color: colors.ink }} numberOfLines={1}>{file.name}</Text>
                          <Text style={{ ...font.footnote, color: colors.ink2 }}>{[formatBytes(file.size), `${file.width} × ${file.height} px`].filter(Boolean).join(' · ')}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                )}
                <Button title={busy === 'send' ? 'Wird übertragen…' : 'Jetzt ändern'} icon="checkmark-circle-outline" loading={busy === 'send'} onPress={sendNow} />
                <View style={styles.divider} />
                <Text style={{ ...font.footnote, color: colors.ink2 }}>Danach live schalten – nötig, damit z. B. ein neuer Hintergrund erscheint.</Text>
                {machine.pending_restart ? (
                  <View style={styles.pending}>
                    <Ionicons name="sync" size={18} color={colors.warn} />
                    <Text style={{ ...font.footnote, color: colors.ink, flex: 1 }}>{machine.pending_restart.mode === 'tonight' ? 'Neustart für heute Nacht vorgemerkt.' : 'Neustart wird gleich ausgeführt.'}</Text>
                    <MiniButton title="Zurücknehmen" onPress={() => restart('cancel')} busy={busy === 'restart'} />
                  </View>
                ) : (
                  <View style={{ flexDirection: wide ? 'row' : 'column', gap: 10 }}>
                    <View style={{ flex: wide ? 1 : undefined }}>
                      <Button title="Verkaufsprogramm jetzt neu starten" icon="refresh-circle-outline" kind="plain" loading={busy === 'restart'} onPress={() => restart('now')} />
                    </View>
                    <View style={{ flex: wide ? 1 : undefined }}>
                      <Button title="Heute Nacht" icon="moon-outline" kind="plain" onPress={() => restart('tonight')} />
                    </View>
                  </View>
                )}
                {machine.last_restart_at ? <Text style={styles.hint}>Zuletzt neu gestartet: {new Date(machine.last_restart_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}.</Text> : null}
              </Card>
            ) : null}
          </>
        )}
      </Section>

      {/* ---------------------------------------------------------- Gespeicherte Overlays */}
      <Section title="Gespeicherte Overlays" action="Hochladen" onAction={uploadReady}>
        <Card style={{ gap: space.md }}>
          <CardHead title="Vorschau" sub="So sieht dein aktuelles Foto mit Overlay aus." right={<MiniButton icon="refresh" onPress={() => base.reload()} />} />
          <View style={[styles.preview, { width: previewW, height: Math.round((previewW * 3) / 4) }]}>
            {base.data ? <Image source={{ uri: base.data }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : <Text style={{ ...font.subhead, color: colors.ink3 }}>Kein aktuelles Foto</Text>}
            {activeLayers.map((l) => {
              const a = assets.find((x) => x.id === l.asset_id);
              if (!a?.preview_url) return null;
              return <Image key={l.id} source={{ uri: a.preview_url }} style={[StyleSheet.absoluteFill, { opacity: l.opacity, transform: [{ scale: l.scale }] }]} contentFit={l.fit === 'contain' ? 'contain' : l.fit === 'cover' ? 'cover' : 'fill'} />;
            })}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ ...font.footnote, color: colors.ink2, flex: 1 }}>Antippen zum Anwenden · lange drücken zum Löschen</Text>
            <Pill text={String(assets.length)} />
          </View>
          {overlays.loading && !overlays.data ? (
            <Skeleton height={gridTile} radius={10} />
          ) : overlays.error && !overlays.data ? (
            <ErrorNote text={overlays.error} onRetry={overlays.reload} />
          ) : assets.length === 0 ? (
            <Text style={styles.hint}>Noch keine Overlays gespeichert. Lade eine fertige Datei hoch oder lass die KI eines erstellen.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {assets.map((a) => {
                const on = activeIds.has(a.id);
                const working = busy === `act:${a.id}` || busy === `del:${a.id}`;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => { tapHaptic(); activate(a); }}
                    onLongPress={() => { tapHaptic(); remove(a); }}
                    style={({ pressed }) => [styles.gridTile, { width: gridTile, height: Math.round(gridTile * 0.75) }, on && { borderColor: colors.brand, borderWidth: 2 }, pressed && { opacity: 0.8 }]}
                    accessibilityLabel={on ? 'Aktives Overlay' : 'Overlay anwenden'}
                  >
                    {a.preview_url ? <Image source={{ uri: a.preview_url }} style={StyleSheet.absoluteFill} contentFit="contain" /> : null}
                    {on || working ? (
                      <View style={styles.activeBadge}>
                        <Ionicons name={working ? 'hourglass-outline' : 'checkmark'} size={11} color={colors.onBrand} />
                        <Text style={{ color: colors.onBrand, fontSize: 10, fontWeight: '700' }}>{working ? '…' : 'Aktiv'}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>
        <ListCard>
          <SwitchRow title="Beim Speichern sofort verwenden" subtitle="Gilt für hochgeladene und von der KI erstellte Overlays." value={autoApply} onChange={setAutoApply} />
          <Row icon="cloud-upload-outline" title={busy === 'upload' ? 'Wird hochgeladen…' : 'Fertige Datei hochladen'} subtitle="PNG mit transparentem Hintergrund, 4:3" chevron onPress={uploadReady} last />
        </ListCard>
      </Section>

      {/* ---------------------------------------------------------- KI */}
      <Section title="Overlay von der KI">
        <Card style={{ gap: space.md }}>
          <Text style={{ ...font.footnote, color: colors.ink2 }}>Beschreibe kurz, was auf dem Foto stehen soll. Die KI baut daraus ein Overlay passend zu deinem neuesten Foto.</Text>
          <Input label="Nachricht auf dem Foto" value={message} onChangeText={setMessage} placeholder="z. B. Frohe Herbstferien!" />
          <Input label="Gestaltung (optional)" value={prompt} onChangeText={setPrompt} placeholder="z. B. Herbstlaub am Rand, unser Logo unten rechts" multiline />
          <Button title={busy === 'ai' ? 'Wird erstellt…' : 'Overlay erstellen'} icon="sparkles-outline" loading={busy === 'ai'} onPress={generate} />
        </Card>
      </Section>

      <ListCard>
        <Row icon="brush-outline" title="Overlay-Studio" subtitle="Element für Element gestalten (großer Editor)" chevron onPress={() => nav.navigate('Web', { path: '/personalization', title: 'Overlay-Studio' })} last />
      </ListCard>

      <PickerSheet open={machinePicker} title="Automat" value={machine?.id} options={machines.map((m) => ({ value: m.id, label: m.machine_label || m.machine_id }))} onPick={(id) => { setMachineId(id); setEditing(null); }} onClose={() => setMachinePicker(false)} />
    </Screen>
  );
}

/** Handy: seitlich wischen. Breit: drei Plätze nebeneinander. */
function SlotRow({ wide, children }: { wide: boolean; children: React.ReactNode }) {
  if (wide) return <View style={{ flexDirection: 'row', gap: space.md }}>{children}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingRight: space.lg }} style={{ marginRight: -space.lg }}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  lead: { ...font.subhead, color: colors.ink2, marginTop: -4 },
  hint: { ...font.caption, color: colors.ink3, fontWeight: '400' },
  slot: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  slotImg: { height: 150, backgroundColor: CHECKER, alignItems: 'center', justifyContent: 'center' },
  pickTile: { width: 132, padding: 6, gap: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  pickImg: { height: 78, borderRadius: 8, overflow: 'hidden', backgroundColor: CHECKER },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.warnSoft, borderRadius: radius.md, padding: space.md },
  preview: { alignSelf: 'center', borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.subtle, alignItems: 'center', justifyContent: 'center' },
  gridTile: { borderRadius: 10, overflow: 'hidden', backgroundColor: CHECKER, borderWidth: 1, borderColor: colors.line },
  activeBadge: { position: 'absolute', left: 5, top: 5, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.brand, borderRadius: 9, paddingHorizontal: 6, paddingVertical: 2 },
});
