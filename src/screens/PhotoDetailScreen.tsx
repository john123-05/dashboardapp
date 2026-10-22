import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, Modal, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { successHaptic, tapHaptic } from '../components/haptics';
import { QrCode } from '../components/QrCode';
import { Screen } from '../components/Screen';
import { Button, Card, ListCard, Pill, Row } from '../components/ui';
import { usePark } from '../contexts/ParkContext';
import { formatDayLong, formatTime } from '../lib/format';
import { claimLinkFor, type BrowsablePhoto } from '../lib/photoBrowser';
import { colors, font, radius, space } from '../theme';

export function PhotoDetailScreen({ route, navigation }: { route: { params: { photo: BrowsablePhoto } }; navigation: { goBack: () => void } }) {
  const p = route.params.photo;
  const { parkId, timezone } = usePark();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [big, setBig] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = claimLinkFor(parkId, p.externalCode);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(p.capturedAt));
  const bigSize = Math.min(width, height) - 64;

  return (
    <Screen sheet title="Foto" onBack={navigation.goBack} backLabel="Schließen">
      <View style={{ borderRadius: radius.lg, overflow: 'hidden', aspectRatio: 4 / 3, backgroundColor: colors.subtle }}>
        {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={{ flex: 1 }} contentFit="cover" transition={150} /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pill tone={p.isPaid ? 'ok' : 'neutral'} icon={p.isPaid ? 'checkmark' : 'time-outline'} text={p.isPaid ? 'Gekauft' : 'Nicht gekauft'} />
        {p.isTest ? <Pill tone="info" text="Testfoto" /> : null}
      </View>
      <ListCard>
        <Row title="Aufgenommen" right={<Text style={{ ...font.callout, color: colors.ink }}>{formatDayLong(day)}, {formatTime(p.capturedAt, timezone)}</Text>} />
        <Row title="Bildnummer" right={<Text style={{ ...font.callout, color: colors.ink, fontVariant: ['tabular-nums'] }}>{p.externalCode ?? '–'}</Text>} />
        <Row title="Geschwindigkeit" right={<Text style={{ ...font.callout, color: colors.ink }}>{p.speedKmh ? `${p.speedKmh.toFixed(1).replace('.', ',')} km/h` : '–'}</Text>} last />
      </ListCard>
      {link ? (
        <Card style={{ gap: space.md }}>
          <Text style={{ ...font.headline, color: colors.ink }}>Abhol-Link</Text>
          <Text style={{ ...font.footnote, color: colors.ink2 }}>Der Gast scannt den QR-Code mit seinem Handy und holt sich sein Foto ab – auch wenn der gedruckte Code nicht funktioniert.</Text>
          <Pressable
            onPress={() => {
              tapHaptic();
              setBig(true);
            }}
            style={({ pressed }) => [styles.qrCard, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="QR-Code groß zeigen"
          >
            <QrCode value={link} size={196} />
            <View style={styles.enlarge}>
              <Ionicons name="expand-outline" size={14} color="#475467" />
              <Text style={{ ...font.caption, color: '#475467' }}>Antippen zum Vergrößern</Text>
            </View>
          </Pressable>
          <Button title="QR-Code groß zeigen" icon="qr-code-outline" onPress={() => setBig(true)} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="Teilen" icon="share-outline" kind="plain" onPress={() => void Share.share({ message: link, url: link })} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={copied ? 'Kopiert' : 'Kopieren'}
                icon={copied ? 'checkmark' : 'copy-outline'}
                kind="plain"
                onPress={() => {
                  void Clipboard.setStringAsync(link).then(() => {
                    successHaptic();
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  });
                }}
              />
            </View>
          </View>
          <Button title="Im Browser öffnen" icon="open-outline" kind="plain" onPress={() => void Linking.openURL(link)} />
        </Card>
      ) : null}

      {/* Bildschirmfüllend und immer weiß, damit jede Handykamera den Code sofort liest. */}
      <Modal visible={big} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setBig(false)} supportedOrientations={['portrait', 'landscape']}>
        <Pressable style={[styles.full, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]} onPress={() => setBig(false)} accessibilityLabel="Schließen">
          <View style={styles.fullHead}>
            <Text style={styles.fullTitle}>Foto abholen</Text>
            <Ionicons name="close-circle" size={30} color="#98A2B3" />
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            {link ? <QrCode value={link} size={bigSize} margin={3} /> : null}
            <Text style={styles.fullCode}>Bildnummer {p.externalCode}</Text>
            <Text style={styles.fullHint}>Mit der Handykamera scannen · Antippen zum Schließen</Text>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  qrCard: { alignSelf: 'center', alignItems: 'center', gap: 8, padding: 14, borderRadius: radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line },
  enlarge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  full: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24 },
  fullHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fullTitle: { fontSize: 22, fontWeight: '700', color: '#101828' },
  fullCode: { fontSize: 17, fontWeight: '600', color: '#101828', fontVariant: ['tabular-nums'] },
  fullHint: { fontSize: 15, color: '#475467', textAlign: 'center' },
});
