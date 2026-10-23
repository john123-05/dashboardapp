import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Input, LocalizedInput, MiniButton, Notice, PickerSheet, SaveBar, SelectRow, SwitchRow } from '../../components/controls';
import { successHaptic } from '../../components/haptics';
import { Screen } from '../../components/Screen';
import { Button, Card, ErrorNote, Pill, Section, Skeleton } from '../../components/ui';
import { usePark } from '../../contexts/ParkContext';
import { defaultQuestions, fetchSurveyConfig, saveSurveyConfig, type Localized, type QuestionType, type SurveyConfig, type SurveyQuestion } from '../../lib/crm';
import { PLAN_LABEL, useEntitlements } from '../../lib/entitlements';
import { colors, font, radius, space } from '../../theme';
import { tr } from '../../i18n';

const TYPE_LABEL: Record<QuestionType, string> = { get nps() { return tr('Weiterempfehlung (0–10)'); }, get stars() { return tr('Sterne (1–5)'); }, get yesno() { return tr('Ja / Nein'); }, get choice() { return tr('Auswahl'); }, get text() { return tr('Freitext'); } };
const MAX = 12;

// Umfrage bearbeiten wie SurveyManager im Web: Fragen (Deutsch/Englisch), Pflicht, Reihenfolge,
// Score-Frage, Vorlagen, Google-Bewertung. Speichern gilt sofort auf der Freischaltseite.
export function SurveyEditScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const nav = useNavigation<any>();
  const { parkId } = usePark();
  const ent = useEntitlements(parkId);
  const [config, setConfig] = useState<SurveyConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [typePicker, setTypePicker] = useState<number | null>(null);
  const [scorePicker, setScorePicker] = useState(false);

  useEffect(() => {
    if (!parkId) return;
    fetchSurveyConfig(parkId).then(setConfig).catch((e) => setLoadError(e instanceof Error ? e.message : tr('Laden fehlgeschlagen.')));
  }, [parkId]);

  const change = (next: SurveyConfig) => {
    setConfig(next);
    setDirty(true);
    setSaved(false);
  };
  if (!config) {
    return (
      <Screen title={tr('Umfrage bearbeiten')} onBack={navigation.goBack} backLabel={tr('CRM')}>
        {loadError ? <ErrorNote text={loadError} /> : <Skeleton height={260} radius={radius.lg} />}
      </Screen>
    );
  }

  const patchSettings = (p: Partial<SurveyConfig['settings']>) => change({ ...config, settings: { ...config.settings, ...p } });
  const patchQ = (i: number, p: Partial<SurveyQuestion>) => change({ ...config, questions: config.questions.map((q, k) => (k === i ? { ...q, ...p } : q)) });
  const move = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= config.questions.length) return;
    const list = [...config.questions];
    [list[i], list[t]] = [list[t], list[i]];
    change({ ...config, questions: list });
  };
  const add = (q: SurveyQuestion) => config.questions.length < MAX && change({ ...config, questions: [...config.questions, q] });
  const hasScore = config.questions.some((q) => q.is_score_question);
  const addType = (type: QuestionType) =>
    add({ type, prompt: {}, options: type === 'choice' ? [{ de: '', en: '' }, { de: '', en: '' }] : [], required: type !== 'text', is_score_question: !hasScore && (type === 'nps' || type === 'stars') });
  const addTemplate = (key: 'satisfaction' | 'source' | 'improve') => {
    const base = { required: false, is_score_question: false, options: [] as Localized[] };
    if (key === 'satisfaction') add({ ...base, type: 'stars', prompt: { de: 'Wie zufrieden warst du?', en: 'How satisfied were you?' }, required: true, is_score_question: !hasScore });
    else if (key === 'source')
      add({ ...base, type: 'choice', prompt: { de: 'Wie hast du von uns erfahren?', en: 'How did you hear about us?' }, options: [{ de: 'Empfehlung', en: 'Recommendation' }, { de: 'Social Media', en: 'Social media' }, { de: 'Internet', en: 'Internet' }, { de: 'Vor Ort', en: 'On site' }] });
    else add({ ...base, type: 'text', prompt: { de: 'Was können wir besser machen?', en: 'What can we do better?' } });
  };

  async function save() {
    if (!parkId || !config) return;
    setSaving(true);
    setError(null);
    try {
      setConfig(await saveSurveyConfig(parkId, config));
      setDirty(false);
      setSaved(true);
      successHaptic();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('Speichern fehlgeschlagen.'));
    }
    setSaving(false);
  }

  // Bestandsschutz wie im Web: Parks mit eingetragenem Bewertungslink behalten die Einstellung.
  const reviewUnlocked = ent.loading || ent.has('review_routing') || Boolean(config.settings.review_url?.trim());
  const scoreQ = config.questions.find((q) => q.is_score_question);

  return (
    <View style={{ flex: 1 }}>
      <Screen title={tr('Umfrage bearbeiten')} subtitle={tr('Gilt sofort nach dem Speichern')} onBack={navigation.goBack} backLabel={tr('CRM')}>
        {error ? <ErrorNote text={error} /> : null}
        {saved && !dirty ? <Notice text={tr('Gespeichert – gilt sofort auf der Freischaltseite.')} /> : null}

        <Section title={tr('Einleitung')}>
          <Card>
            <LocalizedInput label={tr('Text über den Fragen (optional)')} value={config.settings.intro ?? {}} onChange={(intro) => patchSettings({ intro })} multiline />
          </Card>
        </Section>

        <Section title={tr('Fragen · {0} von {1}', config.questions.length, MAX)}>
          {config.questions.length === 0 ? (
            <Card style={{ gap: space.md }}>
              <Text style={{ ...font.subhead, color: colors.ink2 }}>{tr('Noch keine Fragen. Starte mit der Vorlage: Weiterempfehlung und eine offene Frage.')}</Text>
              <Button title={tr('Vorlage laden')} icon="sparkles-outline" onPress={() => change({ ...config, questions: defaultQuestions() })} />
            </Card>
          ) : null}
          {config.questions.map((q, i) => (
            <Card key={q.id ?? `new-${i}`} style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ ...font.footnote, color: colors.ink3, fontWeight: '700', flex: 1 }}>{tr('FRAGE ')}{i + 1}</Text>
                {q.is_score_question ? <Pill tone="ok" text={tr('Score-Frage')} /> : null}
                <MiniButton icon="arrow-up" onPress={() => move(i, -1)} disabled={i === 0} />
                <MiniButton icon="arrow-down" onPress={() => move(i, 1)} disabled={i === config.questions.length - 1} />
                <MiniButton
                  icon="trash-outline"
                  tone="danger"
                  onPress={() =>
                    Alert.alert(tr('Frage entfernen?'), tr('Bisherige Antworten bleiben in der Auswertung erhalten.'), [
                      { text: tr('Abbrechen'), style: 'cancel' },
                      { text: tr('Entfernen'), style: 'destructive', onPress: () => change({ ...config, questions: config.questions.filter((_, k) => k !== i) }) },
                    ])
                  }
                />
              </View>
              <SelectRow label={tr('Art der Frage')} value={TYPE_LABEL[q.type]} onPress={() => setTypePicker(i)} />
              <LocalizedInput label={tr('Fragetext')} value={q.prompt} onChange={(prompt) => patchQ(i, { prompt })} />
              {q.type === 'choice' ? (
                <View style={{ gap: 10 }}>
                  {q.options.map((o, k) => (
                    <View key={k} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <LocalizedInput label={tr('Antwort {0}', k + 1)} value={o} onChange={(v) => patchQ(i, { options: q.options.map((x, j) => (j === k ? v : x)) })} />
                      </View>
                      <View style={{ paddingBottom: 8 }}>
                        <MiniButton icon="close" onPress={() => patchQ(i, { options: q.options.filter((_, j) => j !== k) })} disabled={q.options.length <= 2} />
                      </View>
                    </View>
                  ))}
                  <MiniButton title={tr('Antwort hinzufügen')} icon="add" onPress={() => patchQ(i, { options: [...q.options, { de: '', en: '' }] })} />
                </View>
              ) : null}
              <View style={styles.inset}>
                <SwitchRow title={tr('Pflicht')} value={q.required} onChange={(required) => patchQ(i, { required })} last={!(q.type === 'nps' || q.type === 'stars')} />
                {q.type === 'nps' || q.type === 'stars' ? (
                  <SwitchRow
                    title={tr('Entscheidet über den Bewertungs-Link')}
                    value={q.is_score_question}
                    onChange={(v) => change({ ...config, questions: config.questions.map((x, k) => ({ ...x, is_score_question: v ? k === i : k === i ? false : x.is_score_question })) })}
                    last
                  />
                ) : null}
              </View>
            </Card>
          ))}
          <Card style={{ gap: space.md }}>
            <Text style={styles.label}>{tr('Vorlage hinzufügen')}</Text>
            <View style={styles.wrap}>
              <MiniButton title={tr('Zufriedenheit (Sterne)')} icon="star-outline" onPress={() => addTemplate('satisfaction')} disabled={config.questions.length >= MAX} />
              <MiniButton title={tr('Wie erfahren?')} icon="list-outline" onPress={() => addTemplate('source')} disabled={config.questions.length >= MAX} />
              <MiniButton title={tr('Was besser machen?')} icon="chatbox-outline" onPress={() => addTemplate('improve')} disabled={config.questions.length >= MAX} />
            </View>
            <Text style={styles.label}>{tr('Leere Frage')}</Text>
            <View style={styles.wrap}>
              {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => (
                <MiniButton key={t} title={TYPE_LABEL[t]} icon="add" onPress={() => addType(t)} disabled={config.questions.length >= MAX} />
              ))}
            </View>
          </Card>
        </Section>

        <Section title={tr('Bewertung bei Google')}>
          {reviewUnlocked ? (
            <Card style={{ gap: space.md }}>
              <Input label={tr('Link zur Bewertungsseite')} value={config.settings.review_url ?? ''} onChangeText={(review_url) => patchSettings({ review_url })} placeholder="https://g.page/r/…/review" autoCapitalize="none" keyboardType="url" />
              <SelectRow label={tr('Link anzeigen ab Wert')} value={config.settings.review_min_score === 0 ? tr('0 – allen Antwortenden') : tr('ab {0}', config.settings.review_min_score)} onPress={() => setScorePicker(true)} />
              {!scoreQ ? <Text style={styles.hint}>{tr('Keine Score-Frage gewählt – dann sehen alle den Link.')}</Text> : null}
              <LocalizedInput label={tr('Text neben dem Link')} value={config.settings.review_text ?? {}} onChange={(review_text) => patchSettings({ review_text })} multiline />
              <LocalizedInput label={tr('Dankestext (wenn kein Link erscheint)')} value={config.settings.thanks_text ?? {}} onChange={(thanks_text) => patchSettings({ thanks_text })} multiline />
            </Card>
          ) : (
            <Card style={{ gap: space.md }}>
              <Pill tone="warn" icon="lock-closed" text={PLAN_LABEL.marketing_pro} />
              <Text style={{ ...font.subhead, color: colors.ink2 }}>{tr('Mit {0} leitest du zufriedene Gäste direkt zur Google-Bewertung weiter.', PLAN_LABEL.marketing_pro)}</Text>
              <Button title={tr('Preise und Pakete ansehen')} kind="plain" onPress={() => nav.navigate('Plans', { group: 'plan' })} />
            </Card>
          )}
        </Section>
        {dirty ? <View style={{ height: 70 }} /> : null}
      </Screen>
      <SaveBar visible={dirty} text={tr('Nicht gespeicherte Änderungen')} busy={saving} onSave={() => void save()} />
      <PickerSheet
        open={typePicker !== null}
        title={tr('Art der Frage')}
        value={typePicker !== null ? config.questions[typePicker]?.type : null}
        options={(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
        onPick={(type) => {
          if (typePicker === null) return;
          const q = config.questions[typePicker];
          patchQ(typePicker, { type, options: type === 'choice' && q.options.length < 2 ? [{ de: '', en: '' }, { de: '', en: '' }] : q.options, is_score_question: type === 'nps' || type === 'stars' ? q.is_score_question : false });
        }}
        onClose={() => setTypePicker(null)}
      />
      <PickerSheet
        open={scorePicker}
        title={tr('Link anzeigen ab Wert')}
        value={String(config.settings.review_min_score)}
        options={Array.from({ length: 11 }, (_, n) => ({ value: String(n), label: n === 0 ? tr('0 – allen Antwortenden') : tr('ab {0}', n) }))}
        onPick={(v) => patchSettings({ review_min_score: Number(v) })}
        onClose={() => setScorePicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...font.footnote, color: colors.ink2, fontWeight: '600' },
  hint: { ...font.caption, color: colors.ink3, fontWeight: '400' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inset: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, marginHorizontal: -4 },
});
