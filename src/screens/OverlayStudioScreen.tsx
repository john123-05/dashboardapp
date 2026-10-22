import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, PixelRatio, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Choice, Input, MiniButton, Slider, TabStrip } from '../components/controls';
import { successHaptic, tapHaptic } from '../components/haptics';
import { useWide } from '../components/layout';
import { boxOf, OverlaySvg, type Measured } from '../components/overlay/OverlaySvg';
import { ErrorNote } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import { base64ToBytes, pickImage } from '../lib/imagePick';
import {
  DISPLAY_W,
  displayHeight,
  FONTS,
  FORMATS,
  makeEllipse,
  makeFrame,
  makeImage,
  makeLine,
  makeRect,
  makeStar,
  makeText,
  makeTriangle,
  SWATCHES,
  TEMPLATES,
  TEXT_LINE,
  uid,
  type El,
  type Format,
  type TextEl,
} from '../lib/overlayModel';
import { activateOverlay, latestPhotoUrl, uploadOverlay } from '../lib/overlays';
import { PREVIEW } from '../lib/preview';
import { useData } from '../lib/useData';
import { colors, font, HEADER_HEIGHT, radius, space, TAP } from '../theme';

type Tool = 'vorlagen' | 'text' | 'formen' | 'bilder' | 'format' | 'ebenen' | 'auswahl';
const SNAP = 8;

// Overlay-Studio wie im Web (OverlayBuilder): Elemente auf der Fläche ziehen und mit dem Griff
// unten rechts in der Größe ändern, Vorlagen, Text, Formen, eigene Bilder, Ebenen. Gespeichert wird
// als PNG in Formatauflösung in „Gespeicherte Overlays“, auf Wunsch sofort aktiv.
export function OverlayStudioScreen({ navigation, route }: { navigation: { goBack: () => void }; route: { params?: { openUrl?: string } } }) {
  const open = useMemo(() => (route.params?.openUrl ? { url: route.params.openUrl, nonce: 1 } : null), [route.params?.openUrl]);
  return <OverlayStudio openRequest={open} onClose={navigation.goBack} />;
}

/**
 * Das Studio selbst. `embedded`: direkt in der Personalisierung (wie im Web), sonst als Vollbild-Seite.
 * Beide teilen sich den Entwurf auf dem Gerät.
 */
export function OverlayStudio({ embedded = false, openRequest, onClose, onSaved, onDragChange, onFullscreen }: {
  embedded?: boolean;
  openRequest?: { url: string; nonce: number } | null;
  onClose?: () => void;
  onSaved?: () => void;
  onDragChange?: (dragging: boolean) => void;
  onFullscreen?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const { width: winW, height: winH } = useWindowDimensions();
  const { parkId, parkName } = usePark();
  const { user } = useAuth();
  const draftKey = `lp-overlay-draft:${parkId ?? 'x'}`;
  const photo = useData(parkId ? `basephoto:${parkId}` : null, () => latestPhotoUrl(parkId!), [parkId], 0);

  const [format, setFormat] = useState<Format>(FORMATS[0]);
  const [els, setEls] = useState<El[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('vorlagen');
  const [measured, setMeasured] = useState<Measured>({});
  const [showPhoto, setShowPhoto] = useState(true);
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [title, setTitle] = useState(parkName ?? 'Mein Park');
  const [tagline, setTagline] = useState('Danke für deinen Besuch!');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const past = useRef<El[][]>([]);
  const future = useRef<El[][]>([]);
  const svgRef = useRef<any>(null);

  const dh = displayHeight(format);
  // Fläche: Handy volle Breite, breit links neben den Werkzeugen. Nie höher als gut die Hälfte des Bildschirms.
  const panelW = wide ? (embedded ? 340 : 380) : 0;
  // Eingebettet: innerhalb der Karte der Personalisierung (Seitenrand + Innenabstand der Karte).
  const maxW = embedded
    ? wide
      ? Math.min(900, winW - 256 - 64 - space.lg * 2 - panelW - space.xl)
      : winW - space.lg * 4
    : wide
      ? Math.min(980, winW - 256 - panelW - 64)
      : winW - space.lg * 2;
  const maxH = embedded ? (wide ? 620 : winH * 0.6) : wide ? winH - insets.top - HEADER_HEIGHT - 120 : winH * 0.42;
  const canvasW = Math.min(maxW, (maxH * DISPLAY_W) / dh);
  const scale = canvasW / DISPLAY_W;
  const canvasH = dh * scale;

  // Änderungen mit Verlauf (Rückgängig / Wiederholen).
  const commit = useCallback((next: El[] | ((cur: El[]) => El[])) => {
    setEls((cur) => {
      const value = typeof next === 'function' ? next(cur) : next;
      past.current = [...past.current.slice(-40), cur];
      future.current = [];
      return value;
    });
  }, []);
  // Entwurf laden (oder ein gespeichertes Overlay zum Bearbeiten öffnen) und laufend sichern.
  const loadDraft = useCallback(
    () =>
      AsyncStorage.getItem(draftKey)
        .then((raw) => {
          if (!raw) return;
          const d = JSON.parse(raw) as { formatId: string; els: El[] };
          setFormat(FORMATS.find((f) => f.id === d.formatId) ?? FORMATS[0]);
          setEls(d.els ?? []);
        })
        .catch(() => undefined)
        .finally(() => setLoaded(true)),
    [draftKey],
  );
  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);
  // Ein gespeichertes Overlay zum Bearbeiten öffnen (ersetzt den Entwurf, „Rückgängig“ holt ihn zurück).
  useEffect(() => {
    if (!openRequest) return;
    commit([makeImage(0, 0, DISPLAY_W, displayHeight(FORMATS[0]), openRequest.url)]);
    setFormat(FORMATS[0]);
    setSel(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest?.nonce, openRequest?.url]);
  // Eingebettet: nach der Vollbild-Ansicht den dort weitergeführten Entwurf übernehmen.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (!embedded) return;
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void loadDraft();
    }, [embedded, loadDraft]),
  );
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => void AsyncStorage.setItem(draftKey, JSON.stringify({ formatId: format.id, els })).catch(() => undefined), 600);
    return () => clearTimeout(t);
  }, [els, format, loaded, draftKey]);

  const patch = useCallback((id: string, p: Partial<El>, history = true) => {
    const apply = (cur: El[]) => cur.map((e) => (e.id === id ? ({ ...e, ...p } as El) : e));
    if (history) commit(apply);
    else setEls(apply);
  }, [commit]);
  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    tapHaptic();
    future.current.push(els);
    setEls(prev);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    tapHaptic();
    past.current.push(els);
    setEls(next);
  };

  const add = (el: El) => {
    tapHaptic();
    commit((cur) => [...cur, el]);
    setSel(el.id);
    setTool('auswahl');
  };
  const selected = els.find((e) => e.id === sel) ?? null;

  // Vorlagen-Texte mit x als Mitte/rechte Kante: nach dem Messen auf die linke Kante umrechnen.
  useEffect(() => {
    const todo = els.filter((e): e is TextEl => e.type === 'text' && !!e.autoAnchor && !!measured[e.id]);
    if (!todo.length) return;
    setEls((cur) =>
      cur.map((e) => {
        if (e.type !== 'text' || !e.autoAnchor || !measured[e.id]) return e;
        const w = boxOf(e, measured).w;
        return { ...e, x: e.autoAnchor === 'center' ? e.x - w / 2 : e.x - w, autoAnchor: undefined };
      }),
    );
  }, [measured, els]);

  // ---------------------------------------------------------------- Gesten

  const drag = useRef<{ id: string; x: number; y: number; w: number; h: number; fs: number } | null>(null);
  const snapped = useRef({ v: false, h: false });
  const begin = (el: El) => {
    const b = boxOf(el, measured);
    drag.current = { id: el.id, x: el.x, y: el.y, w: b.w, h: b.h, fs: el.type === 'text' ? el.fontSize : 0 };
    past.current = [...past.current.slice(-40), els];
    future.current = [];
    onDragChange?.(true);
  };
  const moveBy = (tx: number, ty: number) => {
    const d = drag.current;
    if (!d) return;
    let nx = d.x + tx / scale;
    let ny = d.y + ty / scale;
    // An den Mittellinien einrasten (mit Haptik beim Einrasten).
    const cx = nx + d.w / 2;
    const cy = ny + d.h / 2;
    const v = Math.abs(cx - DISPLAY_W / 2) < SNAP;
    const h = Math.abs(cy - dh / 2) < SNAP;
    if (v) nx = DISPLAY_W / 2 - d.w / 2;
    if (h) ny = dh / 2 - d.h / 2;
    if ((v && !snapped.current.v) || (h && !snapped.current.h)) tapHaptic();
    snapped.current = { v, h };
    setGuides({ v, h });
    patch(d.id, { x: Math.round(nx), y: Math.round(ny) }, false);
  };
  const resizeBy = (tx: number, ty: number, el: El) => {
    const d = drag.current;
    if (!d) return;
    if (el.type === 'text') {
      const f = Math.max(8, Math.min(320, d.fs * (1 + tx / scale / Math.max(40, d.w))));
      patch(d.id, { fontSize: Math.round(f) }, false);
    } else if (el.type === 'line') {
      patch(d.id, { width: Math.max(10, Math.round(d.w + tx / scale)) }, false);
    } else {
      patch(d.id, { width: Math.max(10, Math.round(d.w + tx / scale)), height: Math.max(10, Math.round(d.h + ty / scale)) } as Partial<El>, false);
    }
  };
  const end = () => {
    if (drag.current) onDragChange?.(false);
    drag.current = null;
    snapped.current = { v: false, h: false };
    setGuides({ v: false, h: false });
  };

  // ---------------------------------------------------------------- Speichern

  async function save(use: boolean) {
    if (!parkId || !user) return;
    if (els.filter((e) => !e.hidden).length === 0) {
      setError('Das Overlay ist noch leer.');
      return;
    }
    setSaving(true);
    setError(null);
    setSel(null);
    try {
      if (PREVIEW || !svgRef.current?.toDataURL) throw new Error('Speichern geht nur in der App auf dem iPhone oder iPad.');
      // Kurz warten, bis die Auswahl-Markierung weg ist (sie liegt ohnehin außerhalb der SVG-Fläche).
      await new Promise((r) => setTimeout(r, 80));
      // iOS zeichnet in Bildschirm-Auflösung (2x/3x): durch den Pixel-Faktor teilen, damit das PNG genau
      // die Formatgröße hat (2362 × 1772 für den Automaten) und nicht ein Vielfaches davon.
      const ratio = PixelRatio.get();
      const b64 = await new Promise<string | undefined>((resolve) => svgRef.current.toDataURL((data?: string) => resolve(data), { width: Math.round(format.w / ratio), height: Math.round(format.h / ratio) }));
      if (!b64) throw new Error('Das Bild konnte nicht erzeugt werden. Bitte erneut versuchen.');
      const asset = await uploadOverlay(parkId, user.id, { bytes: base64ToBytes(b64), type: 'image/png', name: `studio-${Date.now()}.png`, width: format.w, height: format.h });
      if (use) await activateOverlay(parkId, asset);
      successHaptic();
      onSaved?.();
      const text = use ? 'Es liegt ab jetzt auf den neuen Fotos. Du findest es unter „Gespeicherte Overlays“.' : 'Du findest es unter „Gespeicherte Overlays“ und kannst es dort jederzeit verwenden.';
      Alert.alert(use ? 'Overlay ist aktiv' : 'Overlay gespeichert', text, onClose ? [{ text: 'Weiter gestalten', style: 'cancel' }, { text: 'Zur Personalisierung', onPress: onClose }] : [{ text: 'OK' }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
    }
    setSaving(false);
  }

  function askSave() {
    Alert.alert('Overlay speichern', `Als PNG in ${format.w} × ${format.h} px.`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Nur speichern', onPress: () => void save(false) },
      { text: 'Speichern & verwenden', style: 'default', onPress: () => void save(true) },
    ]);
  }

  async function addPicture() {
    try {
      const img = await pickImage('library', { base64: true });
      if (!img?.base64) return;
      const ratio = img.width && img.height ? img.width / img.height : 1;
      const w = Math.min(320, DISPLAY_W * 0.4);
      const h = Math.round(w / ratio);
      add(makeImage(Math.round((DISPLAY_W - w) / 2), Math.round((dh - h) / 2), Math.round(w), h, `data:${img.type};base64,${img.base64}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // ---------------------------------------------------------------- Oberfläche

  const visibleEls = els.filter((e) => !e.hidden);
  const canvas = (
    <View style={{ width: canvasW, height: canvasH, alignSelf: 'center' }}>
      <View style={[StyleSheet.absoluteFill, styles.canvasBg]}>
        {showPhoto && photo.data ? <Image source={{ uri: photo.data }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Checker w={canvasW} h={canvasH} />}
      </View>
      <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="none">
        <OverlaySvg ref={svgRef} els={els} measured={measured} width={canvasW} height={canvasH} designHeight={dh} />
      </View>
      {/* Antippen auf freier Fläche hebt die Auswahl auf. */}
      <Pressable style={[StyleSheet.absoluteFill, { zIndex: 2 }]} onPress={() => setSel(null)} />
      {visibleEls.map((el) => (
        <ElementBox
          key={el.id}
          el={el}
          box={boxOf(el, measured)}
          scale={scale}
          on={el.id === sel}
          onSelect={() => {
            setSel(el.id);
            setTool('auswahl');
          }}
          onBegin={() => {
            setSel(el.id);
            begin(el);
          }}
          onMove={moveBy}
          onResize={(tx, ty) => resizeBy(tx, ty, el)}
          onEnd={end}
        />
      ))}
      {guides.v ? <View pointerEvents="none" style={[styles.guide, { left: canvasW / 2 - 0.5, top: 0, bottom: 0, width: 1 }]} /> : null}
      {guides.h ? <View pointerEvents="none" style={[styles.guide, { top: canvasH / 2 - 0.5, left: 0, right: 0, height: 1 }]} /> : null}
      {/* Messung der Texte im Entwurfsraster (unsichtbar). */}
      <View style={styles.measure} pointerEvents="none">
        {els.map((el) =>
          el.type === 'text' ? (
            <Text
              key={`${el.id}-${el.text}-${el.fontSize}-${el.fontFamily}-${el.fontWeight}-${el.letterSpacing}-${el.italic}`}
              style={{ position: 'absolute', fontSize: el.fontSize, lineHeight: el.fontSize * TEXT_LINE, fontFamily: el.fontFamily, fontWeight: String(el.fontWeight) as '400', fontStyle: el.italic ? 'italic' : 'normal', letterSpacing: el.letterSpacing }}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setMeasured((m) => (m[el.id]?.w === width && m[el.id]?.h === height ? m : { ...m, [el.id]: { w: Math.ceil(width), h: Math.ceil(height) } }));
              }}
            >
              {el.text || ' '}
            </Text>
          ) : null,
        )}
      </View>
    </View>
  );

  const tabs: { value: Tool; label: string; icon: any }[] = [
    ...(selected ? [{ value: 'auswahl' as Tool, label: 'Auswahl', icon: 'options-outline' }] : []),
    { value: 'vorlagen', label: 'Vorlagen', icon: 'albums-outline' },
    { value: 'text', label: 'Text', icon: 'text-outline' },
    { value: 'formen', label: 'Formen', icon: 'shapes-outline' },
    { value: 'bilder', label: 'Bilder', icon: 'image-outline' },
    { value: 'ebenen', label: 'Ebenen', icon: 'layers-outline' },
    { value: 'format', label: 'Format', icon: 'crop-outline' },
  ];
  const current = tool === 'auswahl' && !selected ? 'vorlagen' : tool;

  const panel = (
    <View style={{ gap: space.md }}>
      <TabStrip tabs={tabs} value={current} onChange={setTool} />
      {error ? <ErrorNote text={error} /> : null}

      {current === 'vorlagen' ? (
        <View style={{ gap: space.md }}>
          <Input label="Titel" value={title} onChangeText={setTitle} />
          <Input label="Unterzeile" value={tagline} onChangeText={setTagline} />
          <View style={styles.grid}>
            {TEMPLATES.map((t) => {
              const tw = wide ? (panelW - 10) / 2 : (winW - space.lg * (embedded ? 4 : 2) - 10) / 2;
              const preview = t.build(dh, title || ' ', tagline || ' ');
              return (
                <Pressable
                  key={t.id}
                  onPress={() => {
                    const apply = () => {
                      tapHaptic();
                      commit(t.build(dh, title || ' ', tagline || ' '));
                      setSel(null);
                    };
                    if (els.length) Alert.alert('Vorlage verwenden?', 'Die aktuelle Gestaltung wird ersetzt. Mit „Rückgängig“ kommst du zurück.', [{ text: 'Abbrechen', style: 'cancel' }, { text: 'Ersetzen', onPress: apply }]);
                    else apply();
                  }}
                  style={({ pressed }) => [styles.tpl, { width: tw }, pressed && { opacity: 0.8 }]}
                >
                  <View style={{ width: tw - 12, height: ((tw - 12) * dh) / DISPLAY_W, borderRadius: 8, overflow: 'hidden', backgroundColor: '#4b5563' }}>
                    {photo.data ? <Image source={{ uri: photo.data }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                    <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
                      <OverlaySvg els={preview} measured={{}} width={tw - 12} height={((tw - 12) * dh) / DISPLAY_W} designHeight={dh} />
                    </View>
                  </View>
                  <Text style={{ ...font.footnote, color: colors.ink, fontWeight: '600' }}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {current === 'text' ? (
        <View style={{ gap: 10 }}>
          <AddRow icon="text" label="Überschrift" sub="Groß und fett" onPress={() => add(makeText(60, 60, title || 'Überschrift', 56, { fontWeight: 900 }))} />
          <AddRow icon="reorder-three-outline" label="Text" sub="Normale Zeile" onPress={() => add(makeText(60, 140, tagline || 'Dein Text', 30, { fontWeight: 400 }))} />
          <AddRow icon="pricetag-outline" label="Etikett" sub="Text auf Farbfläche" onPress={() => add(makeText(40, 40, 'NEU', 26, { bgColor: '#c2410c', shadow: false }))} />
          <AddRow icon="calendar-outline" label="Datum" sub="Heutiges Datum" onPress={() => add(makeText(40, dh - 80, new Date().toLocaleDateString('de-DE'), 24, { fontWeight: 400 }))} />
        </View>
      ) : null}

      {current === 'formen' ? (
        <View style={styles.grid}>
          {[
            { icon: 'square-outline', label: 'Rechteck', make: () => makeRect(DISPLAY_W / 2 - 120, dh / 2 - 60, 240, 120) },
            { icon: 'ellipse-outline', label: 'Kreis', make: () => makeEllipse(DISPLAY_W / 2 - 80, dh / 2 - 80, 160) },
            { icon: 'triangle-outline', label: 'Dreieck', make: () => makeTriangle(DISPLAY_W / 2 - 80, dh / 2 - 70, 160) },
            { icon: 'star-outline', label: 'Stern', make: () => makeStar(DISPLAY_W / 2 - 80, dh / 2 - 80, 160) },
            { icon: 'remove-outline', label: 'Linie', make: () => makeLine(DISPLAY_W / 2 - 150, dh / 2, 300) },
            { icon: 'scan-outline', label: 'Rahmen', make: () => makeFrame(24, DISPLAY_W, dh) },
            { icon: 'contrast-outline', label: 'Verlauf unten', make: () => makeRect(0, dh - 200, DISPLAY_W, 200, { fill: 'rgba(0,0,0,0)', gradientTo: '#000000', radius: 0, opacity: 0.85 }) },
          ].map((s) => (
            <Pressable key={s.label} onPress={() => add(s.make())} style={({ pressed }) => [styles.shape, pressed && { opacity: 0.75 }]}>
              <Ionicons name={s.icon as any} size={24} color={colors.ink} />
              <Text style={{ ...font.caption, color: colors.ink2 }}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {current === 'bilder' ? (
        <View style={{ gap: 10 }}>
          <AddRow icon="image-outline" label="Logo oder Bild" sub="Aus deinen Fotos, PNG mit Transparenz am besten" onPress={() => void addPicture()} />
          <Text style={styles.hint}>Bilder bleiben im Entwurf auf diesem Gerät gespeichert, bis du das Overlay speicherst.</Text>
        </View>
      ) : null}

      {current === 'format' ? (
        <View style={{ gap: space.md }}>
          <Choice
            label="Format"
            options={FORMATS.map((f) => ({ value: f.id, label: f.label }))}
            value={format.id}
            onChange={(id) => {
              const next = FORMATS.find((f) => f.id === id)!;
              setFormat(next);
            }}
          />
          <Text style={styles.hint}>
            {format.w} × {format.h} px. Für den Automaten ist „Foto-Overlay 4:3“ richtig.
          </Text>
          <View style={styles.switchRow}>
            <Text style={{ ...font.body, color: colors.ink, flex: 1 }}>Letztes Foto als Hintergrund</Text>
            <Switch value={showPhoto} onValueChange={(v) => { tapHaptic(); setShowPhoto(v); }} trackColor={{ true: colors.ok, false: undefined }} />
          </View>
          <Text style={styles.hint}>Nur zur Vorschau – gespeichert wird das Overlay mit transparentem Hintergrund.</Text>
          <MiniButton title="Alles leeren" icon="trash-outline" tone="danger" disabled={!els.length} onPress={() => Alert.alert('Alles leeren?', 'Alle Elemente werden entfernt. Mit „Rückgängig“ kommst du zurück.', [{ text: 'Abbrechen', style: 'cancel' }, { text: 'Leeren', style: 'destructive', onPress: () => { commit([]); setSel(null); } }])} />
        </View>
      ) : null}

      {current === 'ebenen' ? (
        els.length === 0 ? (
          <Text style={styles.hint}>Noch keine Elemente. Starte mit einer Vorlage oder füge Text hinzu.</Text>
        ) : (
          <View style={styles.layers}>
            {[...els].reverse().map((el, k, arr) => (
              <Pressable key={el.id} onPress={() => { tapHaptic(); setSel(el.id); setTool('auswahl'); }} style={[styles.layer, k < arr.length - 1 && styles.layerLine, el.id === sel && { backgroundColor: colors.brandSoft }]}>
                <Ionicons name={LAYER_ICON[el.type] as any} size={18} color={colors.ink2} />
                <Text style={{ ...font.callout, color: el.hidden ? colors.ink3 : colors.ink, flex: 1 }} numberOfLines={1}>
                  {el.type === 'text' ? el.text.split('\n')[0] || 'Text' : LAYER_NAME[el.type]}
                </Text>
                <Pressable onPress={() => patch(el.id, { hidden: !el.hidden })} hitSlop={8}>
                  <Ionicons name={el.hidden ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.ink3} />
                </Pressable>
                <Pressable onPress={() => patch(el.id, { locked: !el.locked })} hitSlop={8}>
                  <Ionicons name={el.locked ? 'lock-closed' : 'lock-open-outline'} size={18} color={colors.ink3} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )
      ) : null}

      {current === 'auswahl' && selected ? <Properties el={selected} patch={(p, h) => patch(selected.id, p, h)} commit={commit} onDone={() => setSel(null)} measured={measured} /> : null}
    </View>
  );

  const actions = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Pressable onPress={undo} disabled={!past.current.length} hitSlop={6} style={styles.icon} accessibilityLabel="Rückgängig">
        <Ionicons name="arrow-undo" size={20} color={past.current.length ? colors.ink : colors.ink3} />
      </Pressable>
      <Pressable onPress={redo} disabled={!future.current.length} hitSlop={6} style={styles.icon} accessibilityLabel="Wiederholen">
        <Ionicons name="arrow-redo" size={20} color={future.current.length ? colors.ink : colors.ink3} />
      </Pressable>
      {embedded && onFullscreen ? (
        <Pressable onPress={() => { tapHaptic(); onFullscreen(); }} hitSlop={6} style={styles.icon} accessibilityLabel="Vollbild">
          <Ionicons name="expand-outline" size={20} color={colors.ink} />
        </Pressable>
      ) : null}
      <Pressable onPress={askSave} disabled={saving} style={styles.save} accessibilityLabel="Speichern">
        {saving ? <ActivityIndicator color={colors.onBrand} size="small" /> : <Text style={{ ...font.callout, color: colors.onBrand, fontWeight: '700' }}>Speichern</Text>}
      </Pressable>
    </View>
  );

  if (embedded) {
    return (
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ ...font.headline, color: colors.ink }}>Overlay erstellen</Text>
            <Text style={{ ...font.footnote, color: colors.ink2 }} numberOfLines={2}>Element für Element bauen – ziehen, vergrößern, speichern.</Text>
          </View>
          {actions}
        </View>
        {wide ? (
          <View style={{ flexDirection: 'row', gap: space.xl, alignItems: 'flex-start' }}>
            <View style={{ flex: 1, alignItems: 'center' }}>{canvas}</View>
            <View style={{ width: panelW }}>{panel}</View>
          </View>
        ) : (
          <>
            {canvas}
            {panel}
          </>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT }]}>
        <BlurView intensity={70} tint="systemChromeMaterial" style={StyleSheet.absoluteFill} />
        <Pressable onPress={onClose} hitSlop={8} style={styles.headBtn} accessibilityLabel="Zurück">
          <Ionicons name="chevron-back" size={26} color={colors.brand} />
          <Text style={{ ...font.body, color: colors.brand }}>Zurück</Text>
        </Pressable>
        <Text style={{ ...font.headline, color: colors.ink, flex: 1, textAlign: 'center' }} numberOfLines={1}>
          Overlay-Studio
        </Text>
        {actions}
      </View>

      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingTop: insets.top + HEADER_HEIGHT + space.lg, paddingHorizontal: space.xl, gap: space.xl }}>
          <View style={{ flex: 1, alignItems: 'center' }}>{canvas}</View>
          <ScrollView style={{ width: panelW, flexGrow: 0 }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
            {panel}
          </ScrollView>
        </View>
      ) : (
        <View style={{ flex: 1, paddingTop: insets.top + HEADER_HEIGHT + space.md }}>
          {canvas}
          <ScrollView style={{ flex: 1, marginTop: space.md }} contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            {panel}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

/**
 * Rahmen eines Elements auf der Fläche. Die Gesten werden nur einmal angelegt (sonst bricht eine
 * Neuzeichnung mitten im Ziehen die Geste ab); die aktuellen Aktionen kommen über eine Referenz.
 */
function ElementBox({ el, box, scale, on, onSelect, onBegin, onMove, onResize, onEnd }: {
  el: El;
  box: { w: number; h: number };
  scale: number;
  on: boolean;
  onSelect: () => void;
  onBegin: () => void;
  onMove: (tx: number, ty: number) => void;
  onResize: (tx: number, ty: number) => void;
  onEnd: () => void;
}) {
  const h = useRef({ onSelect, onBegin, onMove, onResize, onEnd, locked: !!el.locked });
  h.current = { onSelect, onBegin, onMove, onResize, onEnd, locked: !!el.locked };
  const gestures = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(3)
      .onStart(() => !h.current.locked && h.current.onBegin())
      .onUpdate((e) => !h.current.locked && h.current.onMove(e.translationX, e.translationY))
      .onFinalize(() => h.current.onEnd());
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd(() => {
        tapHaptic();
        h.current.onSelect();
      });
    const resize = Gesture.Pan()
      .runOnJS(true)
      .minDistance(1)
      .onStart(() => h.current.onBegin())
      .onUpdate((e) => h.current.onResize(e.translationX, e.translationY))
      .onFinalize(() => h.current.onEnd());
    return { body: Gesture.Exclusive(pan, tap), resize };
  }, []);
  return (
    <GestureDetector gesture={gestures.body}>
      <View
        style={[
          styles.box,
          { left: el.x * scale, top: el.y * scale, width: Math.max(18, box.w * scale), height: Math.max(18, box.h * scale), transform: [{ rotate: `${el.rotation || 0}deg` }] },
          on && styles.boxOn,
        ]}
      >
        {on && !el.locked ? (
          <GestureDetector gesture={gestures.resize}>
            <View style={styles.handle} hitSlop={14}>
              <Ionicons name="resize" size={11} color="#fff" />
            </View>
          </GestureDetector>
        ) : null}
        {on && el.locked ? (
          <View style={[styles.handle, { backgroundColor: colors.ink3 }]}>
            <Ionicons name="lock-closed" size={10} color="#fff" />
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const LAYER_ICON: Record<El['type'], string> = { text: 'text-outline', image: 'image-outline', rect: 'square-outline', ellipse: 'ellipse-outline', triangle: 'triangle-outline', star: 'star-outline', line: 'remove-outline', frame: 'scan-outline' };
const LAYER_NAME: Record<El['type'], string> = { text: 'Text', image: 'Bild', rect: 'Rechteck', ellipse: 'Kreis', triangle: 'Dreieck', star: 'Stern', line: 'Linie', frame: 'Rahmen' };

function AddRow({ icon, label, sub, onPress }: { icon: any; label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.8 }]}>
      <View style={styles.addIcon}>
        <Ionicons name={icon} size={20} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...font.headline, color: colors.ink }}>{label}</Text>
        <Text style={{ ...font.footnote, color: colors.ink2 }}>{sub}</Text>
      </View>
      <Ionicons name="add-circle" size={24} color={colors.brand} />
    </Pressable>
  );
}

function Swatches({ value, onChange, allowNone }: { value: string | null; onChange: (c: string | null) => void; allowNone?: boolean }) {
  const [hex, setHex] = useState(value ?? '');
  useEffect(() => setHex(value ?? ''), [value]);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {allowNone ? (
          <Pressable onPress={() => { tapHaptic(); onChange(null); }} style={[styles.swatch, { backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, value === null && styles.swatchOn]}>
            <Ionicons name="close" size={16} color={colors.ink3} />
          </Pressable>
        ) : null}
        {SWATCHES.map((c) => (
          <Pressable key={c} onPress={() => { tapHaptic(); onChange(c); }} style={[styles.swatch, { backgroundColor: c }, value?.toLowerCase() === c && styles.swatchOn]} accessibilityLabel={`Farbe ${c}`} />
        ))}
      </View>
      <TextInput
        value={hex}
        onChangeText={(t) => {
          const v = t.startsWith('#') ? t : `#${t}`;
          setHex(v);
          if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v);
        }}
        placeholder="#FFFFFF"
        placeholderTextColor={colors.ink3}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={7}
        style={styles.hex}
      />
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

/** Eigenschaften des ausgewählten Elements. Regler ändern live, ein Verlaufsschritt je Element-Wechsel. */
function Properties({ el, patch, commit, onDone, measured }: { el: El; patch: (p: Partial<El>, history?: boolean) => void; commit: (f: (cur: El[]) => El[]) => void; onDone: () => void; measured: Measured }) {
  const live = (p: Partial<El>) => patch(p, false);
  // Ein Verlaufsschritt je ausgewähltem Element: „Rückgängig“ holt den Stand vor dem Bearbeiten zurück.
  useEffect(() => {
    patch({}, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.id]);
  const move = (dir: 1 | -1) =>
    commit((cur) => {
      const i = cur.findIndex((e) => e.id === el.id);
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const list = [...cur];
      [list[i], list[j]] = [list[j], list[i]];
      return list;
    });
  const box = boxOf(el, measured);
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <MiniButton title="Kopie" icon="copy-outline" onPress={() => commit((cur) => [...cur, { ...el, id: uid(), x: el.x + 24, y: el.y + 24 } as El])} />
        <MiniButton title="Nach vorn" icon="arrow-up" onPress={() => move(1)} />
        <MiniButton title="Nach hinten" icon="arrow-down" onPress={() => move(-1)} />
        <MiniButton title="Mitte" icon="locate-outline" onPress={() => patch({ x: Math.round((DISPLAY_W - box.w) / 2) })} />
        <MiniButton title={el.locked ? 'Entsperren' : 'Sperren'} icon={el.locked ? 'lock-open-outline' : 'lock-closed-outline'} onPress={() => patch({ locked: !el.locked })} />
        <MiniButton title="Löschen" icon="trash-outline" tone="danger" onPress={() => { commit((cur) => cur.filter((e) => e.id !== el.id)); onDone(); }} />
      </View>

      {el.type === 'text' ? (
        <>
          <Input label="Text" value={el.text} onChangeText={(text) => live({ text })} multiline />
          <Field label={`Größe · ${el.fontSize}`}>
            <Slider value={el.fontSize} min={8} max={240} step={1} onChange={(fontSize) => live({ fontSize })} />
          </Field>
          <Field label="Schrift">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {FONTS.map((f) => (
                <Pressable key={f} onPress={() => { tapHaptic(); patch({ fontFamily: f }); }} style={[styles.fontChip, el.fontFamily === f && styles.fontChipOn]}>
                  <Text style={{ fontFamily: f, fontSize: 15, color: el.fontFamily === f ? colors.brand : colors.ink }}>{f}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Field>
          <Choice label="Stärke" options={[{ value: '400', label: 'Normal' }, { value: '700', label: 'Fett' }, { value: '900', label: 'Extra' }]} value={String(el.fontWeight)} onChange={(v) => patch({ fontWeight: Number(v) as 400 })} />
          <Choice label="Ausrichtung" options={[{ value: 'left', label: 'Links' }, { value: 'center', label: 'Mitte' }, { value: 'right', label: 'Rechts' }]} value={el.align} onChange={(align) => patch({ align })} />
          <Field label="Farbe">
            <Swatches value={el.fill} onChange={(c) => patch({ fill: c ?? '#ffffff' })} />
          </Field>
          <Field label="Farbfläche dahinter">
            <Swatches value={el.bgColor} onChange={(bgColor) => patch({ bgColor })} allowNone />
          </Field>
          <Field label={`Abstand der Buchstaben · ${el.letterSpacing}`}>
            <Slider value={el.letterSpacing} min={0} max={20} step={1} onChange={(letterSpacing) => live({ letterSpacing })} />
          </Field>
          <Field label={`Kontur · ${el.strokeWidth}`}>
            <Slider value={el.strokeWidth} min={0} max={12} step={1} onChange={(strokeWidth) => live({ strokeWidth })} />
          </Field>
          {el.strokeWidth > 0 ? <Swatches value={el.strokeColor} onChange={(c) => patch({ strokeColor: c ?? '#000000' })} /> : null}
          <View style={styles.switchRow}>
            <Text style={{ ...font.body, color: colors.ink, flex: 1 }}>Schatten</Text>
            <Switch value={el.shadow} onValueChange={(shadow) => { tapHaptic(); patch({ shadow }); }} trackColor={{ true: colors.ok, false: undefined }} />
          </View>
          <View style={styles.switchRow}>
            <Text style={{ ...font.body, color: colors.ink, flex: 1 }}>Kursiv</Text>
            <Switch value={el.italic} onValueChange={(italic) => { tapHaptic(); patch({ italic }); }} trackColor={{ true: colors.ok, false: undefined }} />
          </View>
        </>
      ) : null}

      {el.type === 'rect' || el.type === 'ellipse' || el.type === 'triangle' || el.type === 'star' ? (
        <Field label="Füllung">
          <Swatches value={el.fill} onChange={(c) => patch({ fill: c ?? 'rgba(0,0,0,0)' })} allowNone={el.type === 'rect'} />
        </Field>
      ) : null}
      {el.type === 'rect' ? (
        <>
          <Field label="Verlauf nach">
            <Swatches value={el.gradientTo} onChange={(gradientTo) => patch({ gradientTo })} allowNone />
          </Field>
          {el.gradientTo ? <Choice label="Richtung" options={[{ value: 'down', label: 'Nach unten' }, { value: 'up', label: 'Nach oben' }, { value: 'right', label: 'Nach rechts' }, { value: 'left', label: 'Nach links' }]} value={el.gradientDir} onChange={(gradientDir) => patch({ gradientDir })} /> : null}
          <Field label={`Ecken · ${el.radius}`}>
            <Slider value={el.radius} min={0} max={120} step={1} onChange={(r) => live({ radius: r })} />
          </Field>
        </>
      ) : null}
      {el.type === 'rect' || el.type === 'ellipse' || el.type === 'frame' || el.type === 'line' ? (
        <>
          <Field label={`${el.type === 'line' ? 'Stärke' : 'Rand'} · ${el.strokeWidth}`}>
            <Slider value={el.strokeWidth} min={el.type === 'line' || el.type === 'frame' ? 1 : 0} max={60} step={1} onChange={(strokeWidth) => live({ strokeWidth })} />
          </Field>
          <Field label={el.type === 'line' ? 'Farbe' : 'Randfarbe'}>
            <Swatches value={el.stroke} onChange={(c) => patch({ stroke: c ?? '#ffffff' })} />
          </Field>
        </>
      ) : null}
      {el.type === 'frame' ? (
        <Field label={`Ecken · ${el.radius}`}>
          <Slider value={el.radius} min={0} max={120} step={1} onChange={(r) => live({ radius: r })} />
        </Field>
      ) : null}
      {el.type === 'image' ? (
        <>
          <Field label={`Ecken · ${el.radius}`}>
            <Slider value={el.radius} min={0} max={200} step={1} onChange={(r) => live({ radius: r })} />
          </Field>
          <View style={styles.switchRow}>
            <Text style={{ ...font.body, color: colors.ink, flex: 1 }}>Spiegeln</Text>
            <Switch value={el.flipX} onValueChange={(flipX) => { tapHaptic(); patch({ flipX }); }} trackColor={{ true: colors.ok, false: undefined }} />
          </View>
        </>
      ) : null}

      <Field label={`Deckkraft · ${Math.round(el.opacity * 100)} %`}>
        <Slider value={Math.round(el.opacity * 100)} min={5} max={100} step={1} onChange={(v) => live({ opacity: v / 100 })} />
      </Field>
      <Field label={`Drehung · ${el.rotation || 0}°`}>
        <Slider value={el.rotation || 0} min={-180} max={180} step={1} origin={0} onChange={(rotation) => live({ rotation })} />
      </Field>
      <Text style={styles.hint}>Auf der Fläche ziehen zum Verschieben, Griff unten rechts zum Vergrößern. In der Mitte rastet das Element ein.</Text>
    </View>
  );
}

/** Schachbrett als Hinweis auf Transparenz. */
function Checker({ w, h }: { w: number; h: number }) {
  const size = 14;
  const cols = Math.ceil(w / size);
  const rows = Math.ceil(h / size);
  return useMemo(
    () => (
      <View style={{ width: w, height: h, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#ffffff' }}>
        {Array.from({ length: cols * rows }, (_, k) => {
          const r = Math.floor(k / cols);
          const c = k % cols;
          return <View key={k} style={{ width: size, height: size, backgroundColor: (r + c) % 2 ? '#e5e9f0' : '#ffffff' }} />;
        })}
      </View>
    ),
    [w, h, cols, rows],
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineStrong },
  headBtn: { flexDirection: 'row', alignItems: 'center', minHeight: TAP, width: 96 },
  icon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  save: { minHeight: 34, minWidth: 92, borderRadius: 10, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  canvasBg: { borderRadius: 6, overflow: 'hidden', backgroundColor: '#ffffff' },
  box: { position: 'absolute', zIndex: 3 },
  boxOn: { borderWidth: 1.5, borderColor: colors.brand, borderStyle: 'dashed', borderRadius: 2 },
  handle: { position: 'absolute', right: -11, bottom: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  guide: { position: 'absolute', backgroundColor: '#E5392D', zIndex: 4 },
  measure: { position: 'absolute', left: -10000, top: 0, width: 5000, opacity: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tpl: { padding: 6, gap: 6, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  shape: { width: 92, height: 80, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', gap: 6 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: colors.line },
  addIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  hint: { ...font.caption, color: colors.ink3, fontWeight: '400' },
  label: { ...font.footnote, color: colors.ink2, fontWeight: '600', marginLeft: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 50, borderWidth: 1, borderColor: colors.line },
  layers: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  layer: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: space.md },
  layerLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineStrong },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.lineStrong },
  swatchOn: { borderWidth: 3, borderColor: colors.brand },
  hex: { minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.white, paddingHorizontal: 12, ...font.callout, color: colors.ink, width: 130 },
  fontChip: { minHeight: 38, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.lineStrong, justifyContent: 'center', backgroundColor: colors.white },
  fontChipOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
});

