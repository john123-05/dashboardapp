import { useNavigation } from '@react-navigation/native';
import { Text } from 'react-native';
import { Screen } from '../components/Screen';
import { ListCard, Pill, Row, Section } from '../components/ui';
import { usePark } from '../contexts/ParkContext';
import { formatCents } from '../lib/format';
import { normalizeOpeningHoursConfig } from '../lib/kioskSales';
import { colors, font } from '../theme';
import { N_, tr } from '../i18n';

const TAGE: [string, string][] = [['mon', N_('Montag')], ['tue', N_('Dienstag')], ['wed', N_('Mittwoch')], ['thu', N_('Donnerstag')], ['fri', N_('Freitag')], ['sat', N_('Samstag')], ['sun', N_('Sonntag')]];

export function SettingsScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const nav = useNavigation<any>();
  const { parkId, parkName, priceCents, openingHours, openingHoursConfig } = usePark();
  const cfg = normalizeOpeningHoursConfig(openingHoursConfig, openingHours);

  return (
    <Screen page="settings" title={tr('Einstellungen')} subtitle={parkName} onBack={navigation.goBack}>
      <Section title={tr('Benachrichtigungen')}>
        <ListCard>
          <Row icon="notifications-outline" title={tr('Benachrichtigungen einstellen')} subtitle={tr('Systemzustand, Papier, Support, Updates und mehr')} chevron onPress={() => nav.navigate('Notifications')} last />
        </ListCard>
      </Section>

      <Section title={tr('Öffnungszeiten')} action={tr('Bearbeiten')} onAction={() => nav.navigate('Web', { path: '/settings', title: tr('Öffnungszeiten') })}>
        <ListCard>
          {TAGE.map(([k, name], i) => {
            const d = cfg.weekdays[k as keyof typeof cfg.weekdays];
            return <Row key={k} title={tr(name)} right={<Text style={{ ...font.callout, color: d?.enabled ? colors.ink : colors.ink3, fontVariant: ['tabular-nums'] }}>{d?.enabled ? tr('{0} bis {1}', d.open, d.close) : tr('geschlossen')}</Text>} last={i === TAGE.length - 1} />;
          })}
        </ListCard>
        {cfg.season_start || cfg.season_end ? <Pill tone="neutral" icon="calendar-outline" text={tr('Saison {0} bis {1}{2}', cfg.season_start ?? '…', cfg.season_end ?? '…', cfg.exceptions.length ? tr(' · {0} Ausnahmen', cfg.exceptions.length) : '')} /> : null}
      </Section>

      {priceCents !== null ? (
        <Section title={tr('Automat')}>
          <ListCard>
            <Row title={tr('Preis pro Foto')} right={<Text style={{ ...font.callout, color: colors.ink }}>{formatCents(priceCents)}</Text>} last />
          </ListCard>
        </Section>
      ) : null}
    </Screen>
  );
}
