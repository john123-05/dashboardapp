import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, View } from 'react-native';
import { colors, font, space } from '../theme';
import { Button, Card, Pill } from './ui';

// Nicht freigeschaltete Funktion: dieselbe Upgrade-Ansicht wie im Web (UpgradeHero).
export function Locked({ badge = 'Upgrade', title, intro, points }: { badge?: string; title: string; intro: string; points?: { title: string; text: string }[] }) {
  const nav = useNavigation<any>();
  return (
    <Card style={{ gap: space.md }}>
      <Pill tone="warn" icon="lock-closed" text={badge} />
      <Text style={{ ...font.title, color: colors.ink }}>{title}</Text>
      <Text style={{ ...font.subhead, color: colors.ink2 }}>{intro}</Text>
      {points?.map((p) => (
        <View key={p.title} style={{ flexDirection: 'row', gap: 10 }}>
          <Ionicons name="checkmark-circle" size={20} color={colors.ok} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...font.callout, color: colors.ink, fontWeight: '600' }}>{p.title}</Text>
            <Text style={{ ...font.footnote, color: colors.ink2 }}>{p.text}</Text>
          </View>
        </View>
      ))}
      <Button title="Preise und Pakete ansehen" onPress={() => nav.navigate('Web', { path: '/plaene', title: 'Preise und Pakete' })} />
    </Card>
  );
}

export const SPEED_OFFER = {
  badge: 'Noch nicht freigeschaltet',
  title: 'Mach jede Fahrt zum Wettkampf',
  intro: 'Gäste fahren, das Tempo wird gemessen und steht auf dem Foto. Wer es kauft, taucht in der Rangliste auf.',
  points: [
    { title: 'Profil wie im Videospiel', text: 'Profilbild und Nutzername anlegen, mit anderen messen. Gerade beliebt bei jungen Gästen.' },
    { title: 'Bestzeit toppen', text: 'Stammgäste jagen Rekorde. Wer überholt wurde, fährt nochmal und kauft ein neues Foto.' },
    { title: 'Tag, Monat, Allzeit', text: 'Wer war heute, diesen Monat und insgesamt am schnellsten?' },
    { title: 'Nur mit gekauftem Foto', text: 'Nur freigeschaltete Fotos landen in der Liste. Das motiviert zum Kaufen und Fahren.' },
  ],
};
