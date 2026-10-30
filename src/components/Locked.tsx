import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, View } from 'react-native';
import { colors, font, space } from '../theme';
import { Button, Card, Pill } from './ui';
import { tr } from '../i18n';
import { NO_IN_APP_COMMERCE } from '../lib/storePolicy';

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
      {NO_IN_APP_COMMERCE
        ? <Text style={{ ...font.footnote, color: colors.ink3 }}>{tr('In deinem Paket nicht enthalten.')}</Text>
        : <Button title={tr('Preise und Pakete ansehen')} onPress={() => nav.navigate('Plans')} />}
    </Card>
  );
}

export const SPEED_OFFER = {
  get badge() { return tr('Noch nicht freigeschaltet'); },
  get title() { return tr('Mach jede Fahrt zum Wettkampf'); },
  get intro() { return tr('Gäste fahren, das Tempo wird gemessen und steht auf dem Foto. Wer es kauft, taucht in der Rangliste auf.'); },
  points: [
    { get title() { return tr('Profil wie im Videospiel'); }, get text() { return tr('Profilbild und Nutzername anlegen, mit anderen messen. Gerade beliebt bei jungen Gästen.'); } },
    { get title() { return tr('Bestzeit toppen'); }, get text() { return tr('Stammgäste jagen Rekorde. Wer überholt wurde, fährt nochmal und kauft ein neues Foto.'); } },
    { get title() { return tr('Tag, Monat, Allzeit'); }, get text() { return tr('Wer war heute, diesen Monat und insgesamt am schnellsten?'); } },
    { get title() { return tr('Nur mit gekauftem Foto'); }, get text() { return tr('Nur freigeschaltete Fotos landen in der Liste. Das motiviert zum Kaufen und Fahren.'); } },
  ],
};
