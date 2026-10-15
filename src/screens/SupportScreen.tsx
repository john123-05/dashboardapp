import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Card, EmptyState, ErrorNote, ListCard, Pill, Row, Segmented, Skeleton } from '../components/ui';
import { usePark } from '../contexts/ParkContext';
import { timeAgo } from '../lib/format';
import { loadTickets, PRIORITY_LABEL, STATUS_LABEL, SUPPORT_PHONE, SUPPORT_PHONE_HREF, type SupportTicket } from '../lib/support';
import { useData } from '../lib/useData';
import { colors, font, space } from '../theme';

const tone = (s: SupportTicket['status']) => (s === 'open' ? 'warn' : s === 'in_progress' ? 'info' : 'ok') as 'warn' | 'info' | 'ok';

export function SupportScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const nav = useNavigation<any>();
  const { parkId } = usePark();
  const [tab, setTab] = useState<'aktiv' | 'archiv'>('aktiv');
  const data = useData(parkId ? `tickets:${parkId}:${tab}` : null, () => loadTickets(parkId!, tab === 'archiv'), [parkId, tab], 60000);
  const tickets = data.data ?? [];

  return (
    <Screen title="Support" subtitle="Anfragen an Liftpictures" onBack={navigation.goBack} refreshing={data.refreshing} onRefresh={data.reload}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button title="Neue Anfrage" icon="add" onPress={() => nav.navigate('NewTicket', { onDone: undefined })} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Anrufen" icon="call-outline" kind="plain" onPress={() => void Linking.openURL(SUPPORT_PHONE_HREF)} />
        </View>
      </View>
      <Text style={{ ...font.caption, color: colors.ink3, textAlign: 'center', marginTop: -6 }}>Telefon {SUPPORT_PHONE}</Text>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'aktiv', label: 'Aktiv' }, { value: 'archiv', label: 'Archiv' }]} />
      {data.error && !data.data ? <ErrorNote text={data.error} onRetry={data.reload} /> : null}
      {data.loading && !data.data ? (
        <Card>
          <Skeleton height={18} width="70%" />
          <Skeleton height={14} width="40%" style={{ marginTop: 10 }} />
        </Card>
      ) : tickets.length > 0 ? (
        <ListCard>
          {tickets.map((t, i) => (
            <Row
              key={t.id}
              icon="chatbubbles-outline"
              title={t.subject}
              subtitle={`${PRIORITY_LABEL[t.priority]} · aktualisiert ${timeAgo(t.updated_at)}`}
              right={<Pill tone={tone(t.status)} text={STATUS_LABEL[t.status]} />}
              chevron
              onPress={() => nav.navigate('SupportThread', { ticket: t })}
              last={i === tickets.length - 1}
            />
          ))}
        </ListCard>
      ) : (
        <Card>
          <EmptyState icon="chatbubbles-outline" title={tab === 'aktiv' ? 'Keine offenen Anfragen' : 'Archiv ist leer'} text={tab === 'aktiv' ? 'Du hast eine Frage oder ein Problem? Schreib uns eine neue Anfrage.' : undefined} />
        </Card>
      )}
    </Screen>
  );
}
