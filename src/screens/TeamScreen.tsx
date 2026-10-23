import { useNavigation } from '@react-navigation/native';
import { Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Card, EmptyState, ErrorNote, ListCard, Pill, Row, Skeleton } from '../components/ui';
import { timeAgo } from '../lib/format';
import { loadStaff } from '../lib/team';
import { useData } from '../lib/useData';
import { colors, font } from '../theme';
import { tr } from '../i18n';

export function TeamScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const nav = useNavigation<any>();
  const data = useData('staff', loadStaff, [], 0);
  const staff = data.data ?? [];
  return (
    <Screen page="team" title={tr('Mitarbeiter-Zugang')} subtitle={tr('Wer darf welche Seiten sehen')} onBack={navigation.goBack} refreshing={data.refreshing} onRefresh={data.reload}>
      <Button title={tr('Mitarbeiter einladen')} icon="person-add-outline" onPress={() => nav.navigate('TeamEdit', { member: null, onSaved: undefined })} />
      {data.error && !data.data ? <ErrorNote text={data.error} onRetry={data.reload} /> : null}
      {data.loading && !data.data ? (
        <Card>
          <Skeleton height={18} width="60%" />
        </Card>
      ) : staff.length > 0 ? (
        <ListCard>
          {staff.map((m, i) => (
            <Row
              key={m.user_id}
              icon="person-outline"
              iconBg={m.disabled_at ? colors.fill : undefined}
              iconColor={m.disabled_at ? colors.ink3 : undefined}
              title={m.full_name || m.email || tr('Mitarbeiter')}
              subtitle={`${m.role_label || tr('Eigene Auswahl')} · ${m.allowed_pages ? tr('{0} Seiten', m.allowed_pages.length) : tr('Standard')} · ${m.last_sign_in_at ? tr('zuletzt {0}', timeAgo(m.last_sign_in_at)) : tr('noch nie angemeldet')}`}
              right={<Pill tone={m.disabled_at ? 'neutral' : 'ok'} text={m.disabled_at ? tr('Deaktiviert') : tr('Aktiv')} />}
              chevron
              onPress={() => nav.navigate('TeamEdit', { member: m })}
              last={i === staff.length - 1}
            />
          ))}
        </ListCard>
      ) : (
        <Card>
          <EmptyState icon="people-outline" title={tr('Noch keine Mitarbeiter')} text={tr('Lade die erste Person ein. Sie sieht nur die Seiten, die du freigibst.')} />
        </Card>
      )}
      <Text style={{ ...font.caption, color: colors.ink3, textAlign: 'center' }}>{tr('Mitarbeiter melden sich mit ihrer E-Mail und ihrem Passwort in der App oder im Web an.')}</Text>
    </Screen>
  );
}
