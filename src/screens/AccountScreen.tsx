import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLook } from '../contexts/AppearanceContext';
import { initialsOf } from '../components/HeaderActions';
import { Screen } from '../components/Screen';
import { Button, Card, ListCard, Row, Section, Segmented } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import { supabase } from '../lib/supabase';
import { canSee } from '../lib/permissions';
import { isSuperAdminEmail, openPage, PAGES } from '../lib/pages';
import { colors, font, space } from '../theme';
import { startCoach } from '../components/coach/Coach';
import { PickerSheet } from '../components/controls';
import { getChosenLanguage, LANGUAGES, setLanguage, tr, useLanguage, type Language } from '../i18n';

export function AccountScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const nav = useNavigation<any>();
  const { fullName, email, isOwner, isStaff, allowedPages, allowedParkIds, signOut } = useAuth();
  const { parkName, setPark } = usePark();
  const viewer = { isOwner, isStaff, allowedPages };
  const canSwitch = isSuperAdminEmail(email) || allowedParkIds.length !== 1;
  const { look, setLook } = useLook();
  const lang = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const chosenLang = getChosenLanguage();
  const links = ['settings', 'team', 'plans', 'tickets'].map((k) => PAGES.find((p) => p.key === k)!).filter((p) => canSee(p.key, viewer));

  return (
    <Screen title={tr('Konto')} onBack={navigation.goBack}>
      <Card style={{ alignItems: 'center', gap: 6 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#2b2b2b', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{initialsOf(fullName, email)}</Text>
        </View>
        <Text style={{ ...font.title, color: colors.ink }} numberOfLines={1}>
          {fullName || email}
        </Text>
        {fullName ? <Text style={{ ...font.subhead, color: colors.ink2 }}>{email}</Text> : null}
        <Text style={{ ...font.caption, color: colors.ink3 }}>{isOwner ? tr('Inhaber') : isStaff ? tr('Mitarbeiter') : tr('Mitglied')}</Text>
      </Card>

      <ListCard>
        <Row icon="location-outline" title={parkName ?? tr('Kein Park')} subtitle={canSwitch ? tr('Park wechseln') : tr('Aktueller Park')} chevron={canSwitch} onPress={canSwitch ? () => nav.navigate('Park') : undefined} last />
      </ListCard>

      <Section title={tr('Einstellungen')}>
        <ListCard>
          {links.map((p, i) => (
            <Row key={p.key} icon={p.icon} title={p.title} subtitle={p.key === 'settings' ? tr('Benachrichtigungen, Öffnungszeiten') : null} chevron onPress={() => openPage(nav, p)} last={i === links.length - 1} />
          ))}
        </ListCard>
      </Section>

      <Section title={tr('Hilfe')}>
        <ListCard>
          <Row icon="help-circle-outline" title={tr('Hilfe-Center')} subtitle={tr('Anleitungen, Fragen, Support')} chevron onPress={() => nav.navigate('Help')} />
          <Row icon="play-circle-outline" title={tr('Rundgang starten')} subtitle={tr('Die App in einer Minute')} chevron onPress={startCoach} last />
        </ListCard>
      </Section>

      <Section title={tr('Erscheinungsbild')}>
        <Segmented
          value={look}
          onChange={setLook}
          options={[{ value: 'light', label: tr('Hell') }, { value: 'dark', label: tr('Dunkel') }, { value: 'system', label: tr('Wie Gerät') }]}
        />
      </Section>

      <Section title={tr('Sprache')}>
        <ListCard>
          <Row
            icon="language-outline"
            title={LANGUAGES.find((l) => l.value === lang)?.label ?? lang}
            subtitle={chosenLang ? null : tr('Wie das Gerät')}
            chevron
            onPress={() => setLangOpen(true)}
            last
          />
        </ListCard>
      </Section>
      <PickerSheet<Language | 'device'>
        open={langOpen}
        title={tr('Sprache')}
        value={chosenLang ?? 'device'}
        options={[{ value: 'device', label: tr('Wie das Gerät') }, ...LANGUAGES]}
        onPick={(v) => {
          setLangOpen(false);
          // erst nach dem Schließen des Blatts umstellen; danach wird die App neu gezeichnet
          setTimeout(() => void setLanguage(v === 'device' ? null : v), 400);
        }}
        onClose={() => setLangOpen(false)}
      />

      <View style={{ gap: space.sm }}>
        <Button
          title={tr('Abmelden')}
          kind="danger"
          icon="log-out-outline"
          onPress={() =>
            Alert.alert(tr('Abmelden'), tr('Möchtest du dich abmelden?'), [
              { text: tr('Abbrechen'), style: 'cancel' },
              { text: tr('Abmelden'), style: 'destructive', onPress: async () => { await setPark(null, null); await signOut(); } },
            ])
          }
        />
        {/* App Store 5.1.1(v): Konto in der App löschen (delete_my_account). Daten des Parks bleiben. */}
        <Button
          title={tr('Konto löschen')}
          kind="plain"
          icon="trash-outline"
          onPress={() =>
            Alert.alert(tr('Konto löschen?'), tr('Dein Zugang ({0}) wird endgültig gelöscht. Die Daten deines Parks bleiben erhalten. Das lässt sich nicht rückgängig machen.', email ?? ''), [
              { text: tr('Abbrechen'), style: 'cancel' },
              {
                text: tr('Endgültig löschen'),
                style: 'destructive',
                onPress: async () => {
                  const { data: ok, error } = await supabase.rpc('delete_my_account');
                  if (error || !ok) return Alert.alert(tr('Fehler'), error?.message ?? tr('Das Konto konnte nicht gelöscht werden.'));
                  await setPark(null, null);
                  await signOut();
                },
              },
            ])
          }
        />
        <Text style={{ ...font.caption, color: colors.ink3, textAlign: 'center' }}>{tr('Liftpictures Dashboard ')}{Constants.expoConfig?.version ?? ''}</Text>
      </View>
    </Screen>
  );
}

