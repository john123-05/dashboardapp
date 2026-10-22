import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Linking, Share, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { CardHead, MiniButton } from '../components/controls';
import { useWide } from '../components/layout';
import { QrCode } from '../components/QrCode';
import { Screen } from '../components/Screen';
import { Button, Card, ErrorNote, Kpi, KpiGrid, ListCard, Pill, Row, Section, Segmented, Skeleton } from '../components/ui';
import { usePark } from '../contexts/ParkContext';
import { loadKioskSales } from '../lib/data';
import { useEntitlements } from '../lib/entitlements';
import { formatCents, formatNumber } from '../lib/format';
import { aggregateByDate } from '../lib/kioskSales';
import { demoShopUrl, fetchShopOverview, NEW_PRODUCTS, PRODUCT_ICON, PRODUCT_TEXT, type ShopSettings } from '../lib/shop';
import { useData } from '../lib/useData';
import { colors, font, radius, space } from '../theme';
import { DASHBOARD_URL } from './WebPageScreen';
import { CoachTarget } from '../components/coach/Coach';

const POTENTIAL_DAYS = 30;

export const productLabel = (p: { key: string; label: string }) => PRODUCT_TEXT[p.key]?.[0] ?? p.label;
export const productDesc = (p: { key: string; description: string }) => PRODUCT_TEXT[p.key]?.[1] ?? p.description;

// Online-Shop wie im Web (/shop): wie viele Bilder nie verkauft wurden, der eigene Shop, Live-Vorschau
// mit QR-Code zum Selbst-Ausprobieren. Bearbeiten öffnet den Editor (ShopEdit).
export function ShopScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const nav = useNavigation<any>();
  const wide = useWide();
  const { parkId, parkName, isKioskPark, priceCents } = usePark();
  const ent = useEntitlements(parkId);
  const shop = useData(parkId ? `shop:${parkId}` : null, () => fetchShopOverview(parkId!), [parkId], 60000);
  const sales = useData(parkId && isKioskPark ? `sales:${parkId}` : null, () => loadKioskSales(parkId!), [parkId, isKioskPark], 60000);
  const s = shop.data?.settings ?? null;
  const redemptions = shop.data?.redemptions ?? null;
  const revenue = shop.data?.revenue ?? null;

  const potential = useMemo(() => {
    if (!sales.data) return null;
    const days = aggregateByDate(sales.data.days, sales.data.priceCents ?? 0);
    const cutoff = new Date(Date.now() - POTENTIAL_DAYS * 86400000).toISOString().slice(0, 10);
    const recent = days.filter((d) => d.businessDate > cutoff);
    // Nur Tage, an denen Fahrten UND Verkäufe plausibel gezählt sind (wie im Web).
    const withRides = recent.filter((d) => d.expectedCount !== null && d.expectedCount > 0 && d.soldCount > 0 && d.soldCount <= d.expectedCount);
    const rides = withRides.reduce((a, d) => a + (d.expectedCount ?? 0), 0);
    const soldOnRideDays = withRides.reduce((a, d) => a + d.soldCount, 0);
    const sold = recent.reduce((a, d) => a + d.soldCount, 0);
    const soldPercent = rides > 0 ? Math.round((soldOnRideDays / rides) * 100) : 0;
    return { sold, unsold: Math.max(0, rides - soldOnRideDays), reliable: withRides.length >= 3, soldPercent, unsoldPercent: rides > 0 ? 100 - soldPercent : 0 };
  }, [sales.data]);

  const requestedAt = s?.activation_requested_at ? new Date(s.activation_requested_at) : null;
  const active = (s?.products ?? []).filter((p) => p.enabled);
  const hasSales = (revenue?.salesCount ?? 0) > 0;

  return (
    <Screen page="shop"
      title="Online-Shop"
      subtitle={s?.shop_name || parkName}
      onBack={navigation.goBack}
      refreshing={shop.refreshing}
      onRefresh={() => { shop.reload(); sales.reload(); }}
      right={<Pill tone={requestedAt ? 'ok' : 'warn'} text={requestedAt ? 'Aktivierung angefragt' : 'Testmodus'} />}
    >
      {shop.error && !shop.data ? <ErrorNote text={shop.error} onRetry={shop.reload} /> : null}

      {isKioskPark ? (
        <Card style={{ gap: space.md }}>
          {!ent.loading && !ent.has('online_shop') && !requestedAt ? <Pill tone="warn" icon="lock-closed" text="Upgrade" /> : null}
          {!potential ? (
            <Skeleton height={90} />
          ) : potential.reliable ? (
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: space.lg }}>
              <Fact value={`${potential.soldPercent} %`} text="deiner Besucher kaufen ihr Bild sofort am Automaten." note={`${formatNumber(potential.sold)} Bilder in den letzten ${POTENTIAL_DAYS} Tagen`} />
              <Fact value={`${potential.unsoldPercent} %`} green text="deiner Bilder sind vorhanden – wurden aber nie wieder zum Kauf angeboten." note={`${formatNumber(potential.unsold)} unverkaufte Bilder`} />
              {redemptions && redemptions.total >= 10 ? (
                <Fact value={`${Math.round((redemptions.delayed / redemptions.total) * 100)} %`} text="lösen ihr Bild erst am nächsten Tag oder nach Parkschluss digital ein." note={`${formatNumber(redemptions.delayed)} von ${formatNumber(redemptions.total)} Einlösungen`} />
              ) : null}
            </View>
          ) : (
            <Text style={{ ...font.subhead, color: colors.ink2 }}>Sobald die Fahrtenzählung deines Parks läuft, siehst du hier live, wie viele deiner Bilder nie verkauft wurden.</Text>
          )}
          {potential ? (
            <>
              <View style={styles.divider} />
              <Text style={{ fontSize: 19, lineHeight: 26, fontWeight: '300', color: colors.ink }}>
                {potential.reliable
                  ? `Biete ${formatNumber(potential.unsold)} unverkaufte Bilder deinen Kunden erneut zum Kauf an – als Download oder personalisiert auf Tasse, T-Shirt & Co.`
                  : 'Biete deine unverkauften Bilder deinen Kunden erneut zum Kauf an – als Download oder auf Tasse, T-Shirt & Co.'}
              </Text>
              {requestedAt ? (
                <Pill tone="ok" icon="checkmark-circle" text={`Angefragt am ${requestedAt.toLocaleDateString('de-DE')}`} />
              ) : (
                <Button title="Preise ansehen" icon="pricetags-outline" onPress={() => nav.navigate('Plans', { group: 'shop' })} />
              )}
            </>
          ) : null}
        </Card>
      ) : null}

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: space.lg, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: space.lg, alignSelf: 'stretch' }}>
          <CoachTarget id="shop.own">
          <Section title="Dein Shop" action="Bearbeiten" onAction={() => nav.navigate('ShopEdit')}>
            {shop.loading && !s ? (
              <Skeleton height={160} radius={radius.lg} />
            ) : s ? (
              <Card style={{ gap: space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.logo}>{s.logo_url ? <Image source={{ uri: s.logo_url }} style={StyleSheet.absoluteFill} contentFit="contain" /> : <Ionicons name="image-outline" size={20} color={colors.ink3} />}</View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ ...font.headline, color: colors.ink }} numberOfLines={1}>{s.shop_name || parkName || 'Foto-Shop'}</Text>
                    <Text style={{ ...font.footnote, color: colors.ink2 }} numberOfLines={2}>{s.welcome_text || 'Hol dir dein Foto von heute – als Download, Abzug oder auf Tasse, T-Shirt und mehr.'}</Text>
                  </View>
                  <View style={[styles.swatch, { backgroundColor: s.accent_color }]} />
                </View>
                <Text style={{ ...font.footnote, color: colors.ink3 }}>{active.length} Produkte aktiv</Text>
              </Card>
            ) : null}
            {s ? (
              <ListCard>
                {active.map((p, i) => (
                  <Row
                    key={p.key}
                    icon={(PRODUCT_ICON[p.key] as any) ?? 'pricetag-outline'}
                    iconColor={s.accent_color}
                    iconBg={colors.fill}
                    title={productLabel(p)}
                    badge={NEW_PRODUCTS.includes(p.key) ? 'Neu' : null}
                    right={<Text style={{ ...font.callout, color: colors.ink, fontVariant: ['tabular-nums'] }}>{formatCents(p.price_cents)}</Text>}
                    last={i === active.length - 1}
                  />
                ))}
                {active.length === 0 ? <Row title="Noch kein Produkt aktiv" subtitle="Im Editor einschalten" onPress={() => nav.navigate('ShopEdit')} chevron last /> : null}
              </ListCard>
            ) : null}
            {priceCents ? <Text style={styles.hint}>Zum Vergleich: am Automaten kostet ein Foto {formatCents(priceCents)}.</Text> : null}
          </Section>
          </CoachTarget>

          <Section title="Auswertung">
            <KpiGrid>
              <Kpi icon="cart-outline" label="Bestellungen" value={hasSales ? formatNumber(revenue?.salesCount ?? 0) : '–'} sub={hasSales ? 'nur Testkäufe' : 'kommt mit der Freischaltung'} />
              <Kpi icon="cash-outline" label="Umsatz" value={hasSales ? formatCents(revenue?.totalCents ?? 0) : '–'} sub={hasSales ? 'nur Testkäufe' : 'kommt mit der Freischaltung'} />
            </KpiGrid>
          </Section>

          <ListCard>
            <Row icon="pricetags-outline" title="Preise und Pakete ansehen" subtitle="Drei Wege, den Shop freizuschalten" chevron onPress={() => nav.navigate('Plans', { group: 'shop' })} />
            <Row icon="create-outline" title="Shop bearbeiten" subtitle="Design, Texte, Produkte und Preise" chevron onPress={() => nav.navigate('ShopEdit')} last />
          </ListCard>
        </View>

        <View style={{ width: wide ? 420 : '100%' }}>{s ? <ShopPreview settings={s} /> : null}</View>
      </View>
    </Screen>
  );
}

/** Live-Vorschau des Demo-Shops plus QR-Code, damit man ihn am eigenen Handy ausprobiert. */
export function ShopPreview({ settings, version = 0 }: { settings: ShopSettings; version?: number }) {
  const [mode, setMode] = useState<'phone' | 'qr'>('phone');
  const url = demoShopUrl(settings);
  return (
    <Section title="Live-Vorschau">
      <Card style={{ gap: space.md }}>
        <CardHead title="So sehen deine Gäste den Shop" right={<MiniButton icon="share-outline" onPress={() => void Share.share({ message: url, url })} />} />
        <Segmented<'phone' | 'qr'> value={mode} onChange={setMode} options={[{ value: 'phone', label: 'Handy' }, { value: 'qr', label: 'QR-Code' }]} />
        {mode === 'phone' ? (
          <View style={styles.frame}>
            <WebView key={`${settings.demo_token}-${version}`} source={{ uri: `${DASHBOARD_URL}/demo-shop/${settings.demo_token}?embed=1` }} style={{ flex: 1, backgroundColor: '#fff' }} applicationNameForUserAgent="LiftpicturesDashboardApp/1.5" nestedScrollEnabled />
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            <View style={styles.qrBox}>
              <QrCode value={url} size={220} />
            </View>
            <Text style={{ ...font.footnote, color: colors.ink2, textAlign: 'center' }}>Mit einem anderen Handy scannen und den Shop selbst ausprobieren – inklusive Test-Checkout mit der Karte 4242 4242 4242 4242.</Text>
          </View>
        )}
        <Button title="Demo im Browser öffnen" icon="open-outline" kind="plain" onPress={() => void Linking.openURL(url)} />
      </Card>
    </Section>
  );
}

function Fact({ value, text, note, green }: { value: string; text: string; note?: string; green?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ fontSize: 40, lineHeight: 44, fontWeight: '300', letterSpacing: -0.8, color: green ? colors.brand : colors.ink, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ ...font.callout, color: colors.ink, fontWeight: '600' }}>{text}</Text>
      {note ? <Text style={{ ...font.footnote, color: colors.ink3 }}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  hint: { ...font.caption, color: colors.ink3, fontWeight: '400' },
  logo: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.subtle, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.line },
  frame: { height: 600, borderRadius: 28, overflow: 'hidden', borderWidth: 6, borderColor: '#101828', backgroundColor: '#fff' },
  qrBox: { padding: 14, backgroundColor: '#FFFFFF', borderRadius: radius.lg },
});
