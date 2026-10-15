import { Image } from 'expo-image';
import { Linking, Share, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Card, ListCard, Pill, Row } from '../components/ui';
import { usePark } from '../contexts/ParkContext';
import { formatDayLong, formatTime } from '../lib/format';
import { claimLinkFor, type BrowsablePhoto } from '../lib/photoBrowser';
import { colors, font, radius, space } from '../theme';

export function PhotoDetailScreen({ route, navigation }: { route: { params: { photo: BrowsablePhoto } }; navigation: { goBack: () => void } }) {
  const p = route.params.photo;
  const { parkId, timezone } = usePark();
  const link = claimLinkFor(parkId, p.externalCode);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(p.capturedAt));
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
        <Card style={{ gap: space.sm }}>
          <Text style={{ ...font.footnote, color: colors.ink2 }}>Mit diesem Link kann ein Gast sein Foto abholen, auch wenn der QR-Code nicht funktioniert.</Text>
          <Button title="Abhol-Link teilen" icon="share-outline" onPress={() => void Share.share({ message: link, url: link })} />
          <Button title="Im Browser öffnen" icon="open-outline" kind="plain" onPress={() => void Linking.openURL(link)} />
        </Card>
      ) : null}
    </Screen>
  );
}
