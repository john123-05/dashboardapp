import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { DateTimeInput, Input, MiniButton, Notice, PickerSheet, SelectRow } from '../../components/controls';
import { successHaptic } from '../../components/haptics';
import { Screen } from '../../components/Screen';
import { Button, Card, ErrorNote, Pill, Section, Segmented, Skeleton } from '../../components/ui';
import { usePark } from '../../contexts/ParkContext';
import {
  blocksToHtml,
  deleteEmailCampaign,
  fetchEmailCampaign,
  fetchSegments,
  previewAudience,
  saveEmailCampaign,
  sendEmailCampaign,
  sendTestEmail,
  type AutomationType,
  type ContactSegment,
  type EmailBlock,
  type EmailDraft,
} from '../../lib/crm';
import { colors, font, radius, space } from '../../theme';
import { EMAIL_STATUS } from './EmailTab';
import { tr, localeTag } from '../../i18n';

const LANGS = ['de', 'en', 'es', 'fr', 'it', 'nl', 'lv', 'pl', 'cs', 'pt', 'tr'];
const BLOCK_LABEL: Record<EmailBlock['type'], string> = { get heading() { return tr('Überschrift'); }, get text() { return tr('Text'); }, get image() { return tr('Bild'); }, get button() { return tr('Button'); }, get divider() { return tr('Trennlinie'); } };
const NEW: EmailDraft = { name: '', subject: '', preheader: '', language: null, segment: {}, html: '', body_json: [{ type: 'heading', text: '' }, { type: 'text', text: '' }] };

function emptyBlock(type: EmailBlock['type']): EmailBlock {
  if (type === 'heading' || type === 'text') return { type, text: '' };
  if (type === 'image') return { type, url: '', alt: '' };
  if (type === 'button') return { type, label: '', url: '' };
  return { type: 'divider' };
}

// E-Mail schreiben wie der Editor im Web: Blöcke, Live-Vorschau, Empfänger prüfen, Test an mich,
// Senden oder Planen. Gesendete E-Mails sind nur noch lesbar.
export function EmailEditScreen({ navigation, route }: { navigation: { goBack: () => void }; route: { params?: { id?: string; template?: AutomationType } } }) {
  const { parkId, parkName } = usePark();
  const template = route.params?.template;
  const [draft, setDraft] = useState<EmailDraft | null>(route.params?.id ? null : { ...NEW, name: template === 'welcome' ? tr('Willkommens-Mail') : template === 'season_start' ? tr('Saisonstart-Mail') : '', template_for: template });
  const [id, setId] = useState<string | undefined>(route.params?.id);
  const [status, setStatus] = useState<keyof typeof EMAIL_STATUS>('draft');
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [segments, setSegments] = useState<ContactSegment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [audience, setAudience] = useState<number | null>(null);
  const [scheduled, setScheduled] = useState<string | null>(null);
  const [picker, setPicker] = useState<'lang' | 'segment' | 'block' | null>(null);

  useEffect(() => {
    if (!parkId) return;
    fetchSegments(parkId).then(setSegments).catch(() => setSegments([]));
    if (!route.params?.id) return;
    fetchEmailCampaign(parkId, route.params.id)
      .then(({ campaign: c }) => {
        setStatus(c.status);
        setDraft({ id: c.id, template_for: template, name: c.name, subject: c.subject, preheader: c.preheader, language: c.language, body_json: c.body_json ?? [], html: c.html, segment: c.segment ?? {} });
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [parkId, route.params?.id, template]);

  const html = useMemo(() => (draft ? blocksToHtml(draft.body_json) : ''), [draft]);
  const previewHtml = useMemo(
    () => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">${html.split('{{name}}').join('Alex').split('{{park}}').join(parkName ?? '')}</body></html>`,
    [html, parkName],
  );

  if (!draft) {
    return (
      <Screen title={tr('E-Mail')} onBack={navigation.goBack} backLabel={tr('CRM')}>
        {error ? <ErrorNote text={error} /> : <Skeleton height={260} radius={radius.lg} />}
      </Screen>
    );
  }

  const locked = status !== 'draft' && !template;
  const isTemplate = Boolean(template);
  const patch = (p: Partial<EmailDraft>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setAudience(null);
    setNotice(null);
  };
  const setBlock = (i: number, b: EmailBlock) => patch({ body_json: draft.body_json.map((x, k) => (k === i ? b : x)) });
  const move = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= draft.body_json.length) return;
    const list = [...draft.body_json];
    [list[i], list[t]] = [list[t], list[i]];
    patch({ body_json: list });
  };

  async function run<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  }
  const persist = async () => {
    if (!parkId || !draft) return null;
    const res = await saveEmailCampaign(parkId, { ...draft, id, html, template_for: id ? undefined : draft.template_for });
    setId(res.id);
    return res.id;
  };
  const nameMissing = !draft.name.trim();

  function send() {
    if (!parkId) return;
    void run('send', async () => {
      const { count } = await previewAudience(parkId, draft!.language, draft!.segment);
      setAudience(count);
      return count;
    }).then((count) => {
      if (count === null) return;
      const question = scheduled
        ? tr('Am {0} an {1} Empfänger senden? Das lässt sich nicht zurücknehmen.', new Date(scheduled).toLocaleString(localeTag(), { dateStyle: 'medium', timeStyle: 'short' }), count)
        : tr('Jetzt an {0} Empfänger senden? Das lässt sich nicht zurücknehmen.', count);
      Alert.alert(scheduled ? tr('E-Mail planen?') : tr('Jetzt senden?'), question, [
        { text: tr('Abbrechen'), style: 'cancel' },
        {
          text: scheduled ? tr('Planen') : tr('Senden'),
          style: 'destructive',
          onPress: () =>
            void run('send', async () => {
              const saved = await persist();
              if (!saved) return;
              await sendEmailCampaign(parkId, saved, scheduled ?? undefined);
              successHaptic();
              setNotice(tr('Die E-Mail ist eingereiht und geht in den nächsten Minuten raus.'));
              setTimeout(navigation.goBack, 1400);
            }),
        },
      ]);
    });
  }

  const editor = (
    <>
      {locked ? <Notice tone="info" text={tr('Diese E-Mail ist {0} und nicht mehr bearbeitbar.', EMAIL_STATUS[status].text.toLowerCase())} /> : null}
      {isTemplate ? <Notice tone="info" text={tr('Das ist die Vorlage dieser Automation. Sie wird nie als Ganzes verschickt.')} /> : null}
      <View pointerEvents={locked ? 'none' : 'auto'} style={{ gap: space.lg, opacity: locked ? 0.7 : 1 }}>
        <Card style={{ gap: space.md }}>
          <Input label={tr('Interner Name')} value={draft.name} onChangeText={(name) => patch({ name })} />
          <Input label={tr('Betreff')} value={draft.subject} onChangeText={(subject) => patch({ subject })} />
          <Input label={tr('Vorschautext (erscheint neben dem Betreff)')} value={draft.preheader} onChangeText={(preheader) => patch({ preheader })} />
        </Card>
        {!isTemplate ? (
          <Section title={tr('Empfänger')}>
            <Card style={{ gap: space.md }}>
              {segments.length ? <SelectRow label={tr('Nur Segment')} value={segments.find((s) => s.id === draft.segment.segment_id)?.name ?? 'Kein Segment'} onPress={() => setPicker('segment')} /> : null}
              <SelectRow label={tr('Sprache der Empfänger')} value={draft.language ? draft.language.toUpperCase() : 'Alle Sprachen'} onPress={() => setPicker('lang')} />
              <DateTimeInput label={tr('Nur Gäste seit')} value={draft.segment.since ?? null} onChange={(since) => patch({ segment: { ...draft.segment, since: since ?? undefined } })} />
              <Input
                label={tr('Nur Länder (z. B. DE, AT)')}
                value={(draft.segment.countries ?? []).join(', ')}
                autoCapitalize="characters"
                onChangeText={(t) => patch({ segment: { ...draft.segment, countries: t.split(/[ ,;]+/).map((c) => c.trim().toUpperCase()).filter(Boolean) } })}
              />
              {audience !== null ? <Notice tone="info" text={tr('{0} Gäste würden diese E-Mail bekommen (nur mit Einwilligung).', audience)} /> : null}
              <Button title={tr('Empfänger prüfen')} icon="people-outline" kind="plain" loading={busy === 'audience'} onPress={() => void run('audience', async () => parkId && setAudience((await previewAudience(parkId, draft.language, draft.segment)).count))} />
            </Card>
          </Section>
        ) : null}
        <Section title={tr('Inhalt')}>
          <Text style={styles.hint}>{tr('Platzhalter: ')}{'{{name}}'} {tr('= Vorname des Gastes, ')}{'{{park}}'} {tr('= Name deines Parks.')}</Text>
          {draft.body_json.map((b, i) => (
            <Card key={i} style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ ...font.footnote, color: colors.ink3, fontWeight: '700', flex: 1 }}>{BLOCK_LABEL[b.type].toUpperCase()}</Text>
                <MiniButton icon="arrow-up" onPress={() => move(i, -1)} disabled={i === 0} />
                <MiniButton icon="arrow-down" onPress={() => move(i, 1)} disabled={i === draft.body_json.length - 1} />
                <MiniButton icon="trash-outline" tone="danger" onPress={() => patch({ body_json: draft.body_json.filter((_, k) => k !== i) })} />
              </View>
              {b.type === 'heading' ? <Input value={b.text} onChangeText={(text) => setBlock(i, { ...b, text })} placeholder={tr('Überschrift')} /> : null}
              {b.type === 'text' ? <Input value={b.text} onChangeText={(text) => setBlock(i, { ...b, text })} placeholder={tr('Text')} multiline /> : null}
              {b.type === 'image' ? (
                <>
                  <Input value={b.url} onChangeText={(url) => setBlock(i, { ...b, url })} placeholder={tr('Bild-Adresse (https://…)')} autoCapitalize="none" keyboardType="url" />
                  <Input value={b.alt} onChangeText={(alt) => setBlock(i, { ...b, alt })} placeholder={tr('Beschreibung des Bildes')} />
                </>
              ) : null}
              {b.type === 'button' ? (
                <>
                  <Input value={b.label} onChangeText={(label) => setBlock(i, { ...b, label })} placeholder={tr('Beschriftung')} />
                  <Input value={b.url} onChangeText={(url) => setBlock(i, { ...b, url })} placeholder={tr('Link (https://…)')} autoCapitalize="none" keyboardType="url" />
                </>
              ) : null}
              {b.type === 'divider' ? <View style={{ height: 1, backgroundColor: colors.lineStrong }} /> : null}
            </Card>
          ))}
          <Button title={tr('Block hinzufügen')} icon="add" kind="plain" onPress={() => setPicker('block')} />
        </Section>
      </View>
    </>
  );

  return (
    <Screen title={draft.name || tr('Neue E-Mail')} subtitle={draft.subject || undefined} onBack={navigation.goBack} backLabel={tr('CRM')} right={<Pill tone={EMAIL_STATUS[status].tone} text={EMAIL_STATUS[status].text} />}>
      <Segmented value={view} onChange={setView} options={[{ value: 'edit', label: tr('Bearbeiten') }, { value: 'preview', label: tr('Vorschau') }]} />
      {error ? <ErrorNote text={error} /> : null}
      {notice ? <Notice text={notice} /> : null}

      {view === 'edit' ? (
        editor
      ) : (
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <View style={{ padding: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineStrong }}>
            <Text style={{ ...font.headline, color: colors.ink }} numberOfLines={1}>{draft.subject || '…'}</Text>
            {draft.preheader ? <Text style={{ ...font.footnote, color: colors.ink2 }} numberOfLines={1}>{draft.preheader}</Text> : null}
          </View>
          <WebView originWhitelist={['*']} source={{ html: previewHtml }} style={{ height: 560, backgroundColor: '#f4f5f7' }} scrollEnabled nestedScrollEnabled />
        </Card>
      )}

      <Text style={styles.hint}>{tr('Angeschrieben werden nur Gäste, die der Werbung zugestimmt haben. Jede E-Mail enthält einen Abmelde-Link.')}</Text>
      {!locked ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title={tr('Speichern')} kind="plain" loading={busy === 'save'} onPress={() => (nameMissing ? setError(tr('Bitte gib einen internen Namen ein.')) : void run('save', async () => { await persist(); successHaptic(); setNotice(tr('Gespeichert.')); }))} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={tr('Test an mich')}
                kind="plain"
                icon="flask-outline"
                loading={busy === 'test'}
                onPress={() =>
                  nameMissing
                    ? setError(tr('Bitte gib einen internen Namen ein.'))
                    : void run('test', async () => {
                        const saved = await persist();
                        if (saved && parkId) setNotice(tr('Test gesendet an {0}.', (await sendTestEmail(parkId, saved)).to));
                      })
                }
              />
            </View>
          </View>
          {!isTemplate ? (
            <Card style={{ gap: space.md }}>
              <DateTimeInput label={tr('Senden am (leer = sofort)')} value={scheduled} onChange={setScheduled} quick={[{ label: tr('Sofort'), iso: null }, { label: tr('Morgen 10:00'), iso: tomorrowAt(10) }, { label: tr('Morgen 18:00'), iso: tomorrowAt(18) }]} />
              <Button title={scheduled ? tr('Senden planen') : tr('Jetzt senden')} icon="paper-plane-outline" loading={busy === 'send'} onPress={() => (nameMissing ? setError(tr('Bitte gib einen internen Namen ein.')) : send())} />
            </Card>
          ) : null}
          {id && !isTemplate ? (
            <Button
              title={tr('E-Mail löschen')}
              kind="danger"
              icon="trash-outline"
              onPress={() =>
                Alert.alert(tr('Diese E-Mail löschen?'), undefined, [
                  { text: tr('Abbrechen'), style: 'cancel' },
                  { text: tr('Löschen'), style: 'destructive', onPress: () => void run('delete', async () => { if (parkId) await deleteEmailCampaign(parkId, id); navigation.goBack(); }) },
                ])
              }
            />
          ) : null}
        </View>
      ) : null}

      <PickerSheet open={picker === 'lang'} title={tr('Sprache der Empfänger')} value={draft.language ?? ''} options={[{ value: '', label: tr('Alle Sprachen') }, ...LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))]} onPick={(v) => patch({ language: v || null })} onClose={() => setPicker(null)} />
      <PickerSheet open={picker === 'segment'} title={tr('Nur Segment')} value={draft.segment.segment_id ?? ''} options={[{ value: '', label: tr('Kein Segment') }, ...segments.map((s) => ({ value: s.id, label: s.name, sub: tr('{0} Kontakte', s.member_count) }))]} onPick={(v) => patch({ segment: { ...draft.segment, segment_id: v || undefined } })} onClose={() => setPicker(null)} />
      <PickerSheet open={picker === 'block'} title={tr('Block hinzufügen')} options={(Object.keys(BLOCK_LABEL) as EmailBlock['type'][]).map((t) => ({ value: t, label: BLOCK_LABEL[t] }))} onPick={(t) => patch({ body_json: [...draft.body_json, emptyBlock(t)] })} onClose={() => setPicker(null)} />
    </Screen>
  );
}

function tomorrowAt(h: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
}

const styles = StyleSheet.create({
  hint: { ...font.caption, color: colors.ink3, fontWeight: '400' },
});
