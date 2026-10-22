import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Input, Notice, PickerSheet, SaveBar, SelectRow } from '../components/controls';
import { successHaptic, tapHaptic } from '../components/haptics';
import { useWide } from '../components/layout';
import { Screen } from '../components/Screen';
import { Button, Card, ErrorNote, Pill, Section, Skeleton } from '../components/ui';
import { usePark } from '../contexts/ParkContext';
import { pickImage } from '../lib/imagePick';
import { centsToInput, fetchShopOverview, NEW_PRODUCTS, PRODUCT_ICON, priceToCents, saveShopSettings, SHOP_COLORS, SHOP_FONTS, uploadShopLogo, type ShopSettings } from '../lib/shop';
import { useData } from '../lib/useData';
import { colors, font, radius, space } from '../theme';
import { productDesc, productLabel, ShopPreview } from './ShopScreen';

type Product = { key: string; label: string; description: string; enabled: boolean; price: string };

// Shop-Editor wie im Web (/shop/bearbeiten): Design, Texte, Produkte & Preise. Speichern aktualisiert
// die Vorschau darunter.
export function ShopEditScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const wide = useWide();
  const { parkId, parkName, priceCents } = usePark();
  const shop = useData(parkId ? `shop:${parkId}` : null, () => fetchShopOverview(parkId!), [parkId], 0);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [name, setName] = useState('');
  const [welcome, setWelcome] = useState('');
  const [color, setColor] = useState('#C6A233');
  const [hex, setHex] = useState('#C6A233');
  const [fontKey, setFontKey] = useState('system');
  const [products, setProducts] = useState<Product[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [fontPicker, setFontPicker] = useState(false);
  const [version, setVersion] = useState(0);

  function apply(s: ShopSettings) {
    setSettings(s);
    setName(s.shop_name ?? '');
    setWelcome(s.welcome_text ?? '');
    setColor(s.accent_color);
    setHex(s.accent_color.toUpperCase());
    setFontKey(s.font_family ?? 'system');
    setProducts(s.products.map((p) => ({ key: p.key, label: p.label, description: p.description, enabled: p.enabled, price: centsToInput(p.price_cents) })));
    setDirty(false);
  }
  useEffect(() => {
    if (shop.data && !dirty) apply(shop.data.settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.data]);

  const touch = () => {
    setDirty(true);
    setStatus(null);
  };

  async function save() {
    if (!parkId) return;
    const bad = products.find((p) => p.enabled && (!Number.isFinite(priceToCents(p.price)) || priceToCents(p.price) <= 0));
    if (bad) {
      setError(`Bitte einen gültigen Preis für „${productLabel(bad)}“ eingeben.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await saveShopSettings(parkId, {
        shop_name: name.trim() || null,
        welcome_text: welcome.trim() || null,
        accent_color: color,
        font_family: fontKey,
        products: products.map((p) => ({ key: p.key, enabled: p.enabled, price_cents: Number.isFinite(priceToCents(p.price)) ? priceToCents(p.price) : 0 })),
      });
      apply(updated);
      setVersion((v) => v + 1);
      successHaptic();
      setStatus('Gespeichert – die Vorschau ist aktualisiert.');
      shop.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
    }
    setSaving(false);
  }

  async function changeLogo() {
    if (!parkId) return;
    setError(null);
    try {
      const img = await pickImage('library');
      if (!img) return;
      setLogoBusy(true);
      const updated = await uploadShopLogo(parkId, img);
      setSettings(updated);
      setVersion((v) => v + 1);
      successHaptic();
      setStatus('Logo gespeichert.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Logo konnte nicht hochgeladen werden.');
    }
    setLogoBusy(false);
  }

  if (shop.loading && !settings) {
    return (
      <Screen title="Shop bearbeiten" onBack={navigation.goBack} backLabel="Shop">
        <Skeleton height={200} radius={radius.lg} />
      </Screen>
    );
  }

  const editor = (
    <View style={{ gap: space.lg }}>
      <Section title="Design">
        <Card style={{ gap: space.md }}>
          <Text style={styles.label}>Akzentfarbe</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {SHOP_COLORS.map((c) => {
              const on = c.toLowerCase() === color.toLowerCase();
              return (
                <Pressable key={c} onPress={() => { tapHaptic(); setColor(c); setHex(c); touch(); }} style={[styles.color, { backgroundColor: c }, on && styles.colorOn]} accessibilityLabel={`Farbe ${c}`}>
                  {on ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.color, { backgroundColor: /^#[0-9a-f]{6}$/i.test(hex) ? hex : color }]} />
            <TextInput
              value={hex}
              onChangeText={(t) => {
                const v = t.startsWith('#') ? t : `#${t}`;
                setHex(v.toUpperCase());
                if (/^#[0-9a-f]{6}$/i.test(v)) {
                  setColor(v);
                  touch();
                }
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
              style={[styles.input, { flex: 1 }]}
              placeholder="#C6A233"
              placeholderTextColor={colors.ink3}
            />
          </View>
          <View style={styles.divider} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.logo}>{settings?.logo_url ? <Image source={{ uri: settings.logo_url }} style={StyleSheet.absoluteFill} contentFit="contain" /> : <Ionicons name="image-outline" size={22} color={colors.ink3} />}</View>
            <View style={{ flex: 1 }}>
              <Button title={logoBusy ? 'Wird hochgeladen…' : 'Logo hochladen'} icon="cloud-upload-outline" kind="plain" loading={logoBusy} onPress={() => void changeLogo()} />
            </View>
          </View>
          <SelectRow label="Schriftart" value={SHOP_FONTS.find((f) => f.key === fontKey)?.label ?? fontKey} onPress={() => setFontPicker(true)} />
        </Card>
      </Section>

      <Section title="Texte">
        <Card style={{ gap: space.md }}>
          <Input label="Shop-Name" value={name} maxLength={60} placeholder={parkName ?? 'Foto-Shop'} onChangeText={(t) => { setName(t); touch(); }} />
          <Input label="Begrüßungstext" value={welcome} maxLength={240} multiline placeholder="Hol dir dein Foto von heute – als Download, Abzug oder auf Tasse, T-Shirt und mehr." onChangeText={(t) => { setWelcome(t); touch(); }} />
        </Card>
      </Section>

      <Section title={`Produkte & Preise · ${products.filter((p) => p.enabled).length} aktiv`}>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {products.map((p, i) => (
            <View key={p.key} style={[styles.product, i < products.length - 1 && styles.productLine]}>
              <View style={[styles.productIcon, { backgroundColor: colors.fill }]}>
                <Ionicons name={(PRODUCT_ICON[p.key] as any) ?? 'pricetag-outline'} size={18} color={p.enabled ? color : colors.ink3} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ ...font.callout, color: p.enabled ? colors.ink : colors.ink3, flexShrink: 1 }} numberOfLines={1}>{productLabel(p)}</Text>
                  {NEW_PRODUCTS.includes(p.key) ? <Pill tone="warn" text="Neu" /> : null}
                </View>
                <Text style={{ ...font.caption, color: colors.ink3, fontWeight: '400' }} numberOfLines={1}>{productDesc(p)}</Text>
              </View>
              <View style={[styles.priceBox, !p.enabled && { opacity: 0.4 }]}>
                <TextInput
                  value={p.price}
                  editable={p.enabled}
                  keyboardType="decimal-pad"
                  onChangeText={(t) => { setProducts((list) => list.map((x, k) => (k === i ? { ...x, price: t } : x))); touch(); }}
                  style={styles.price}
                  selectTextOnFocus
                />
                <Text style={{ ...font.callout, color: colors.ink2 }}>€</Text>
              </View>
              <Switch value={p.enabled} onValueChange={(v) => { tapHaptic(); setProducts((list) => list.map((x, k) => (k === i ? { ...x, enabled: v } : x))); touch(); }} trackColor={{ true: colors.ok, false: undefined }} />
            </View>
          ))}
        </Card>
        <Text style={styles.hint}>
          Merchandise wird nach der Aktivierung über einen Druckpartner produziert und direkt an deine Gäste verschickt{priceCents ? ` – zum Vergleich: am Automaten kostet ein Foto ${(priceCents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}` : ''}.
        </Text>
      </Section>

      <Section title="Zahlungen">
        <Card>
          <Text style={{ ...font.subhead, color: colors.ink2 }}>Dein Shop läuft im Testmodus: Gäste können alles ausprobieren, es wird nichts berechnet. Echte Zahlungen schalten wir mit der Freischaltung ein.</Text>
        </Card>
      </Section>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen title="Shop bearbeiten" subtitle="Ändern, speichern, Vorschau prüfen" onBack={navigation.goBack} backLabel="Shop">
        {error ? <ErrorNote text={error} /> : null}
        {status && !dirty ? <Notice text={status} /> : null}
        {shop.error && !settings ? <ErrorNote text={shop.error} onRetry={shop.reload} /> : null}
        {wide ? (
          <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>{editor}</View>
            <View style={{ width: 420 }}>{settings ? <ShopPreview settings={settings} version={version} /> : null}</View>
          </View>
        ) : (
          <>
            {editor}
            {settings ? <ShopPreview settings={settings} version={version} /> : null}
          </>
        )}
        {dirty ? <View style={{ height: 70 }} /> : null}
      </Screen>
      <SaveBar visible={dirty} text="Nicht gespeicherte Änderungen" saveLabel="Speichern" busy={saving} onSave={() => void save()} onDiscard={() => shop.data && apply(shop.data.settings)} />
      <PickerSheet open={fontPicker} title="Schriftart" value={fontKey} options={SHOP_FONTS.map((f) => ({ value: f.key, label: f.label }))} onPick={(k) => { setFontKey(k); touch(); }} onClose={() => setFontPicker(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...font.footnote, color: colors.ink2, fontWeight: '600', marginLeft: 2 },
  hint: { ...font.caption, color: colors.ink3, fontWeight: '400' },
  color: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  colorOn: { borderWidth: 3, borderColor: colors.ink },
  input: { minHeight: 46, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: space.md, ...font.body, color: colors.ink },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  logo: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.subtle, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  product: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg, paddingVertical: 12, minHeight: 64 },
  productLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineStrong },
  productIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  priceBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { width: 68, minHeight: 38, borderRadius: 9, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.subtle, textAlign: 'right', paddingHorizontal: 8, ...font.callout, color: colors.ink, fontVariant: ['tabular-nums'] },
});
