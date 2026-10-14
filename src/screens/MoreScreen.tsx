import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Alert, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Card, ListCard, Row, Section } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import { canSee } from '../lib/permissions';
import { PAGES, isSuperAdminEmail } from '../lib/pages';
import { colors, font, space } from '../theme';

export function MoreScreen() {
  const nav = useNavigation<any>();
  const { fullName, email, isOwner, isStaff, allowedPages, allowedParkIds, signOut } = useAuth();
  const { parkName, setPark } = usePark();
  const viewer = { isOwner, isStaff, allowedPages };
  const visible = PAGES.filter((p) => canSee(p.key, viewer));
  const groups = ['Betrieb', 'Marketing', 'Verwaltung'] as const;
  const initials = (fullName || email || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  const canSwitch = isSuperAdminEmail(email) || allowedParkIds.length !== 1;

  return (
    <Screen tabs title="Mehr">
      <Card padded={false}>
        <Row
          title={fullName || email || 'Konto'}
          subtitle={fullName ? email : null}
          right={
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...font.headline, color: colors.brand }}>{initials}</Text>
            </View>
          }
        />
        <Row icon="location-outline" title={parkName ?? 'Kein Park'} subtitle={canSwitch ? 'Park wechseln' : 'Aktueller Park'} chevron={canSwitch} onPress={canSwitch ? () => nav.navigate('Park') : undefined} last />
      </Card>

      {groups.map((g) => {
        const list = visible.filter((p) => p.group === g);
        if (list.length === 0) return null;
        return (
          <Section key={g} title={g}>
            <ListCard>
              {list.map((p, i) => (
                <Row
                  key={p.key}
                  icon={p.icon}
                  title={p.title}
                  chevron
                  last={i === list.length - 1}
                  onPress={() => (p.native ? nav.navigate(p.native) : nav.navigate('Web', { path: p.path, title: p.title }))}
                />
              ))}
            </ListCard>
          </Section>
        );
      })}

      <Section>
        <Button
          title="Abmelden"
          kind="danger"
          icon="log-out-outline"
          onPress={() =>
            Alert.alert('Abmelden', 'Möchtest du dich abmelden?', [
              { text: 'Abbrechen', style: 'cancel' },
              {
                text: 'Abmelden',
                style: 'destructive',
                onPress: async () => {
                  await setPark(null, null);
                  await signOut();
                },
              },
            ])
          }
        />
        <Text style={{ ...font.caption, color: colors.ink3, textAlign: 'center', marginTop: space.sm }}>
          Liftpictures Dashboard {Constants.expoConfig?.version ? `Version ${Constants.expoConfig.version}` : ''}
        </Text>
      </Section>
    </Screen>
  );
}
