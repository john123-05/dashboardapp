import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { Alert, Text, View } from 'react-native';
import { useLook } from '../contexts/AppearanceContext';
import { initialsOf } from '../components/HeaderActions';
import { Screen } from '../components/Screen';
import { Button, Card, ListCard, Row, Section, Segmented } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import { canSee } from '../lib/permissions';
import { isSuperAdminEmail, openPage, PAGES } from '../lib/pages';
import { colors, font, space } from '../theme';
import { startCoach } from '../components/coach/Coach';

export function AccountScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const nav = useNavigation<any>();
  const { fullName, email, isOwner, isStaff, allowedPages, allowedParkIds, signOut } = useAuth();
  const { parkName, setPark } = usePark();
  const viewer = { isOwner, isStaff, allowedPages };
  const canSwitch = isSuperAdminEmail(email) || allowedParkIds.length !== 1;
  const { look, setLook } = useLook();
  const links = ['settings', 'team', 'plans', 'tickets'].map((k) => PAGES.find((p) => p.key === k)!).filter((p) => canSee(p.key, viewer));

  return (
    <Screen title="Konto" onBack={navigation.goBack}>
      <Card style={{ alignItems: 'center', gap: 6 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#2b2b2b', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{initialsOf(fullName, email)}</Text>
        </View>
        <Text style={{ ...font.title, color: colors.ink }} numberOfLines={1}>
          {fullName || email}
        </Text>
        {fullName ? <Text style={{ ...font.subhead, color: colors.ink2 }}>{email}</Text> : null}
        <Text style={{ ...font.caption, color: colors.ink3 }}>{isOwner ? 'Inhaber' : isStaff ? 'Mitarbeiter' : 'Mitglied'}</Text>
      </Card>

      <ListCard>
        <Row icon="location-outline" title={parkName ?? 'Kein Park'} subtitle={canSwitch ? 'Park wechseln' : 'Aktueller Park'} chevron={canSwitch} onPress={canSwitch ? () => nav.navigate('Park') : undefined} last />
      </ListCard>

      <Section title="Einstellungen">
        <ListCard>
          {links.map((p, i) => (
            <Row key={p.key} icon={p.icon} title={p.title} subtitle={p.key === 'settings' ? 'Benachrichtigungen, Öffnungszeiten' : null} chevron onPress={() => openPage(nav, p)} last={i === links.length - 1} />
          ))}
        </ListCard>
      </Section>

      <Section title="Hilfe">
        <ListCard>
          <Row icon="help-circle-outline" title="Hilfe-Center" subtitle="Anleitungen, Fragen, Support" chevron onPress={() => nav.navigate('Help')} />
          <Row icon="play-circle-outline" title="Rundgang starten" subtitle="Die App in einer Minute" chevron onPress={startCoach} last />
        </ListCard>
      </Section>

      <Section title="Erscheinungsbild">
        <Segmented
          value={look}
          onChange={setLook}
          options={[{ value: 'light', label: 'Hell' }, { value: 'dark', label: 'Dunkel' }, { value: 'system', label: 'Wie Gerät' }]}
        />
      </Section>

      <View style={{ gap: space.sm }}>
        <Button
          title="Abmelden"
          kind="danger"
          icon="log-out-outline"
          onPress={() =>
            Alert.alert('Abmelden', 'Möchtest du dich abmelden?', [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Abmelden', style: 'destructive', onPress: async () => { await setPark(null, null); await signOut(); } },
            ])
          }
        />
        <Text style={{ ...font.caption, color: colors.ink3, textAlign: 'center' }}>Liftpictures Dashboard {Constants.expoConfig?.version ?? ''}</Text>
      </View>
    </Screen>
  );
}

