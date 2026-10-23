import { useState } from 'react';
import { Text, View } from 'react-native';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { Button, Card, ErrorNote, Segmented } from '../components/ui';
import { successHaptic } from '../components/haptics';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import { createTicket, type SupportTicket } from '../lib/support';
import { colors, font, space } from '../theme';
import { tr } from '../i18n';

export function NewTicketScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { parkId } = usePark();
  const { email, fullName } = useAuth();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<SupportTicket['priority']>('medium');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function senden() {
    if (!subject.trim() || !description.trim()) return setErr(tr('Bitte Betreff und Beschreibung ausfüllen.'));
    setBusy(true);
    setErr(null);
    try {
      await createTicket(parkId!, { subject: subject.trim(), description: description.trim(), priority, email: email ?? '', name: fullName ?? '' });
      successHaptic();
      navigation.goBack();
    } catch (e) {
      setErr(e instanceof Error ? e.message : tr('Senden fehlgeschlagen'));
    }
    setBusy(false);
  }

  return (
    <Screen sheet title={tr('Neue Anfrage')} onBack={navigation.goBack} backLabel={tr('Abbrechen')}>
      <Card style={{ gap: space.lg }}>
        <Field label={tr('Betreff')} value={subject} onChangeText={setSubject} placeholder={tr('Worum geht es?')} returnKeyType="next" />
        <Field label={tr('Beschreibung')} value={description} onChangeText={setDescription} placeholder={tr('Was ist passiert? Je genauer, desto schneller helfen wir.')} multiline style={{ minHeight: 130, textAlignVertical: 'top' }} />
        <View style={{ gap: 6 }}>
          <Text style={{ ...font.footnote, color: colors.ink2, fontWeight: '600' }}>{tr('Dringlichkeit')}</Text>
          <Segmented value={priority} onChange={setPriority} options={[{ value: 'low', label: tr('Niedrig') }, { value: 'medium', label: tr('Normal') }, { value: 'high', label: tr('Hoch') }, { value: 'critical', label: tr('Dringend') }]} />
        </View>
        {err ? <ErrorNote text={err} /> : null}
        <Button title={tr('Anfrage senden')} icon="send" onPress={senden} loading={busy} />
      </Card>
    </Screen>
  );
}
