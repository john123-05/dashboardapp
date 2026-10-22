import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { CardHead, Input, MiniButton, Notice, PickerSheet, SwitchRow } from '../../components/controls';
import { successHaptic } from '../../components/haptics';
import { Button, Card, EmptyState, ErrorNote, ListCard, Pill, Row, Section, Skeleton } from '../../components/ui';
import { fetchEmailOverview, saveAutomation, saveEmailSettings, sendSeasonStart, type EmailOverview, type EmailSettings, type EmailStatus } from '../../lib/crm';
import { formatNumber } from '../../lib/format';
import { useData } from '../../lib/useData';
import { colors, font, radius, space } from '../../theme';

export const EMAIL_STATUS: Record<EmailStatus, { text: string; tone: 'ok' | 'warn' | 'err' | 'info' | 'neutral' }> = {
  draft: { text: 'Entwurf', tone: 'neutral' },
  scheduled: { text: 'Geplant', tone: 'info' },
  sending: { text: 'Wird gesendet', tone: 'warn' },
  sent: { text: 'Gesendet', tone: 'ok' },
  failed: { text: 'Fehlgeschlagen', tone: 'err' },
};

// E-Mail-Marketing wie EmailManager im Web: Kontingent, Liste, Absender, Automationen.
export function EmailTab({ parkId }: { parkId: string }) {
  const nav = useNavigation<any>();
  const q = useData(`email:${parkId}`, () => fetchEmailOverview(parkId), [parkId], 0);
  const [senderOpen, setSenderOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      q.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
  const data = q.data;
  const usage = data?.usage;
  const percent = usage && usage.quota > 0 ? Math.min(100, Math.round((usage.sent / usage.quota) * 100)) : 0;

  if (q.loading && !data) return <Skeleton height={220} radius={radius.lg} />;
  if (q.error && !data) return <ErrorNote text={q.error} onRetry={q.reload} />;
  if (!data) return null;

  return (
    <>
      {data.migration_pending ? <Notice tone="warn" text="E-Mail-Marketing ist noch nicht eingerichtet (Datenbank-Update steht aus)." /> : null}
      {error ? <ErrorNote text={error} /> : null}
      {usage && usage.quota > 0 ? (
        <Card style={{ gap: 8 }}>
          <Text style={{ ...font.subhead, color: colors.ink }}>
            {formatNumber(usage.sent)} von {formatNumber(usage.quota)} E-Mails in diesem Monat
          </Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: 'hidden' }}>
            <View style={{ width: `${percent}%`, height: 6, borderRadius: 3, backgroundColor: percent >= 80 ? colors.warn : colors.brand }} />
          </View>
          {percent >= 80 ? <Text style={{ ...font.caption, color: colors.ink3, fontWeight: '400' }}>Dein Monatskontingent ist fast aufgebraucht. Mit einem größeren Plan oder Zusatz-E-Mails bekommst du mehr.</Text> : null}
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="Neue E-Mail" icon="add" onPress={() => nav.navigate('EmailEdit', {})} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Absender" icon="person-circle-outline" kind="plain" onPress={() => setSenderOpen((v) => !v)} />
        </View>
      </View>
      {senderOpen ? <SenderForm parkId={parkId} initial={data.settings} onSaved={() => { setSenderOpen(false); q.reload(); }} /> : null}

      <Section title="E-Mails">
        {data.campaigns.length === 0 && !data.migration_pending ? (
          <Card>
            <EmptyState icon="mail-outline" title="Noch keine E-Mails" text="Schreibe die erste Nachricht an Gäste, die der Werbung zugestimmt haben." />
          </Card>
        ) : (
          <ListCard>
            {data.campaigns.map((c, i) => (
              <Row
                key={c.id}
                icon="mail-outline"
                title={c.name}
                subtitle={
                  c.status === 'draft'
                    ? c.subject || '…'
                    : `${c.recipients} Empfänger${c.status === 'sent' && c.recipients > 0 ? ` · ${Math.round((c.opened / c.recipients) * 100)} % geöffnet` : ''}${c.scheduled_at && c.status === 'scheduled' ? ` · ${new Date(c.scheduled_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}` : ''}`
                }
                right={<Pill tone={EMAIL_STATUS[c.status].tone} text={EMAIL_STATUS[c.status].text} />}
                chevron
                onPress={() => nav.navigate('EmailEdit', { id: c.id })}
                last={i === data.campaigns.length - 1}
              />
            ))}
          </ListCard>
        )}
      </Section>

      {!data.migration_pending ? <Automations parkId={parkId} data={data} onReload={q.reload} onError={setError} /> : null}
    </>
  );
}

function SenderForm({ parkId, initial, onSaved }: { parkId: string; initial: EmailSettings | null; onSaved: () => void }) {
  const [s, setS] = useState<EmailSettings>(initial ?? { sender_name: '', reply_to: '', footer_address: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (initial) setS(initial);
  }, [initial]);
  return (
    <Card style={{ gap: space.md }}>
      <CardHead title="Absender-Einstellungen" sub="Diese Angaben stehen in jeder E-Mail (gesetzlich vorgeschrieben)." />
      <Input label="Absendername" value={s.sender_name} onChangeText={(sender_name) => setS({ ...s, sender_name })} />
      <Input label="Antwort-Adresse" value={s.reply_to} onChangeText={(reply_to) => setS({ ...s, reply_to })} keyboardType="email-address" autoCapitalize="none" />
      <Input label="Adresse im Fuß der Mail" value={s.footer_address} onChangeText={(footer_address) => setS({ ...s, footer_address })} multiline />
      {error ? <ErrorNote text={error} /> : null}
      <Button
        title="Speichern"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await saveEmailSettings(parkId, s);
            successHaptic();
            onSaved();
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
          setBusy(false);
        }}
      />
    </Card>
  );
}

function Automations({ parkId, data, onReload, onError }: { parkId: string; data: EmailOverview; onReload: () => void; onError: (m: string | null) => void }) {
  const nav = useNavigation<any>();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [delayPicker, setDelayPicker] = useState(false);
  const allowed = data.automations_allowed === true;
  const welcome = data.automations?.find((a) => a.type === 'welcome');
  const season = data.automations?.find((a) => a.type === 'season_start');

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    onError(null);
    setNotice(null);
    try {
      await fn();
      onReload();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  }

  return (
    <Section title="Automationen">
      {!allowed ? (
        <Card style={{ gap: 10 }}>
          <Pill tone="warn" icon="lock-closed" text="Marketing Pro" />
          <Text style={{ ...font.subhead, color: colors.ink2 }}>Automationen gehören zu Marketing Pro.</Text>
          <Button title="Preise und Pakete ansehen" kind="plain" onPress={() => nav.navigate('Plans', { group: 'plan' })} />
        </Card>
      ) : null}
      {notice ? <Notice text={notice} /> : null}
      <Card padded={false} style={{ overflow: 'hidden', opacity: allowed ? 1 : 0.55 }}>
        <View style={{ padding: space.lg, gap: 4 }}>
          <CardHead title="Willkommens-Mail" sub="Geht automatisch an jeden Gast, der sein Foto freischaltet und der Werbung zugestimmt hat." right={<MiniButton title={welcome?.campaign_id ? 'Bearbeiten' : 'Schreiben'} disabled={!allowed} onPress={() => nav.navigate('EmailEdit', { id: welcome?.campaign_id ?? undefined, template: 'welcome' })} />} />
        </View>
        <SwitchRow title={welcome?.enabled ? 'Aktiv' : 'Aus'} subtitle={!welcome?.campaign_id ? 'Zuerst die Mail schreiben' : null} value={welcome?.enabled === true} disabled={!allowed || busy !== null || !welcome?.campaign_id} onChange={(v) => void run('welcome', () => saveAutomation(parkId, 'welcome', v, welcome?.delay_hours ?? 0))} />
        <Row title="Versand" right={<Text style={{ ...font.callout, color: colors.ink2 }}>{!welcome?.delay_hours ? 'Sofort' : `${welcome.delay_hours} Stunden danach`}</Text>} chevron onPress={allowed ? () => setDelayPicker(true) : undefined} last />
      </Card>
      <Card style={{ gap: 10, opacity: allowed ? 1 : 0.55 }}>
        <CardHead title="Saisonstart-Mail" sub="Eine Vorlage, die du mit einem Tipp an alle Gäste mit Einwilligung schickst." right={<MiniButton title={season?.campaign_id ? 'Bearbeiten' : 'Schreiben'} disabled={!allowed} onPress={() => nav.navigate('EmailEdit', { id: season?.campaign_id ?? undefined, template: 'season_start' })} />} />
        <Button
          title="Jetzt an alle senden"
          icon="paper-plane-outline"
          loading={busy === 'season'}
          kind={allowed && season?.campaign_id ? 'primary' : 'plain'}
          onPress={() => {
            if (!allowed || !season?.campaign_id) return;
            Alert.alert('Saisonstart-Mail senden?', 'Die Mail geht jetzt an alle Gäste mit Einwilligung. Das lässt sich nicht zurücknehmen.', [
              { text: 'Abbrechen', style: 'cancel' },
              {
                text: 'Senden',
                style: 'destructive',
                onPress: () =>
                  void run('season', async () => {
                    const r = await sendSeasonStart(parkId);
                    successHaptic();
                    setNotice(`Die Saisonstart-Mail ist eingereiht (${r.recipients} Empfänger).`);
                  }),
              },
            ]);
          }}
        />
      </Card>
      <Card style={{ opacity: 0.55 }}>
        <Text style={{ ...font.headline, color: colors.ink }}>„Dein Foto wartet noch“</Text>
        <Text style={{ ...font.footnote, color: colors.ink2 }}>Kommt mit dem Online-Shop.</Text>
      </Card>
      <PickerSheet
        open={delayPicker}
        title="Versand der Willkommens-Mail"
        value={String(welcome?.delay_hours ?? 0)}
        options={[0, 1, 24, 72].map((h) => ({ value: String(h), label: h === 0 ? 'Sofort' : `${h} Stunden danach` }))}
        onPick={(v) => void run('welcome', () => saveAutomation(parkId, 'welcome', welcome?.enabled === true, Number(v)))}
        onClose={() => setDelayPicker(false)}
      />
    </Section>
  );
}
