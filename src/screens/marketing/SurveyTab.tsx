import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { BarChart } from '../../components/BarChart';
import { Bars, CardHead, MiniButton, TabStrip } from '../../components/controls';
import { Card, EmptyState, ErrorNote, Kpi, KpiGrid, KpiSkeleton, ListCard, Row, Section } from '../../components/ui';
import { fetchSurveyResults, pickLocalized, type SurveyQuestionResult } from '../../lib/crm';
import { formatDay, formatNumber } from '../../lib/format';
import { useData } from '../../lib/useData';
import { colors, font, radius, space } from '../../theme';

const PERIODS = [
  { value: '7', label: '7 Tage' },
  { value: '30', label: '30 Tage' },
  { value: '90', label: '90 Tage' },
  { value: '365', label: '12 Monate' },
];
const scoreColor = (s: number) => (s >= 9 ? colors.ok : s >= 7 ? colors.warn : colors.err);
const comma = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

// Auswertung der Umfrage wie SurveyResultsView im Web: NPS, Verteilung, Antworten je Tag und jede
// Frage mit ihren Antworten – Freitexte vollständig und durchsuchbar.
export function SurveyTab({ parkId }: { parkId: string }) {
  const nav = useNavigation<any>();
  const [days, setDays] = useState('30');
  const [locale, setLocale] = useState('');
  const [country, setCountry] = useState('');
  const q = useData(`surveyres:${parkId}:${days}:${locale}:${country}`, () => fetchSurveyResults(parkId, Number(days), { locale, country }), [parkId, days, locale, country], 300000);
  const [options, setOptions] = useState<{ languages: string[]; countries: string[] }>({ languages: [], countries: [] });
  const data = q.data;
  useEffect(() => {
    // Auswahllisten nur aus der ungefilterten Abfrage, damit sie nicht schrumpfen.
    if (data && !locale && !country) setOptions({ languages: data.languages ?? [], countries: data.countries ?? [] });
  }, [data, locale, country]);
  const npsTotal = data ? data.promoters + data.passives + data.detractors : 0;

  const weekly = useMemo(() => {
    const weeks = new Map<string, { sum: number; weight: number }>();
    for (const d of data?.timeline ?? []) {
      if (d.avg_score === null) continue;
      const date = new Date(d.day);
      date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const key = date.toISOString().slice(0, 10);
      const e = weeks.get(key) ?? { sum: 0, weight: 0 };
      e.sum += d.avg_score * d.count;
      e.weight += d.count;
      weeks.set(key, e);
    }
    return [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([w, v]) => ({ label: w.slice(8, 10) + '.' + w.slice(5, 7), value: Math.round((v.sum / v.weight) * 10) / 10, caption: `Woche ab ${formatDay(w)}` }));
  }, [data]);

  function exportAnswers() {
    if (!data) return;
    const lines = ['Frage;Antwort;Anzahl;Wert;Datum'];
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    for (const qu of data.questions) {
      const question = pickLocalized(qu.prompt);
      if (qu.type === 'text') for (const t of qu.texts ?? []) lines.push([question, t.text, 1, t.score ?? '', t.at.slice(0, 10)].map(cell).join(';'));
      else if (qu.distribution) for (const d of qu.distribution) lines.push([question, d.value, d.count, '', ''].map(cell).join(';'));
      else if (qu.type === 'yesno') lines.push([question, 'Ja', qu.yes ?? 0, '', ''].map(cell).join(';'), [question, 'Nein', qu.no ?? 0, '', ''].map(cell).join(';'));
      else if (qu.counts) for (const c of qu.counts) lines.push([question, pickLocalized(qu.options[c.index]), c.count, '', ''].map(cell).join(';'));
    }
    void Share.share({ title: `umfrage-${days}-tage.csv`, message: lines.join('\n') });
  }

  return (
    <>
      <ListCard>
        <Row icon="create-outline" title="Fragen und Einstellungen" subtitle="Fragen, Google-Bewertung, Texte" chevron onPress={() => nav.navigate('SurveyEdit')} last />
      </ListCard>
      <TabStrip tabs={PERIODS} value={days} onChange={setDays} />
      {options.languages.length > 1 ? <TabStrip tabs={[{ value: '', label: 'Alle Sprachen' }, ...options.languages.map((l) => ({ value: l, label: l.toUpperCase() }))]} value={locale} onChange={setLocale} /> : null}
      {options.countries.length > 1 ? <TabStrip tabs={[{ value: '', label: 'Alle Länder' }, ...options.countries.map((c) => ({ value: c, label: c }))]} value={country} onChange={setCountry} /> : null}
      {q.error && !data ? <ErrorNote text={q.error} onRetry={q.reload} /> : null}
      {q.loading && !data ? <KpiSkeleton /> : null}

      {data && data.total === 0 ? (
        <Card>
          <EmptyState icon="clipboard-outline" title="Noch keine Antworten" text="Im gewählten Zeitraum gibt es noch keine Antworten. Sobald Gäste vor der Freischaltung antworten, erscheinen sie hier." />
        </Card>
      ) : null}

      {data && data.total > 0 ? (
        <>
          <Card style={{ gap: space.sm }}>
            <CardHead title="NPS" sub="Weiterempfehlung, −100 bis 100" right={<MiniButton title="Export" icon="share-outline" onPress={exportAnswers} />} />
            <Text style={{ fontSize: 52, lineHeight: 58, fontWeight: '300', color: colors.ink, letterSpacing: -1 }}>{data.nps === null ? '–' : String(data.nps)}</Text>
            {npsTotal > 0 ? (
              <>
                <View style={styles.stack}>
                  <View style={{ flex: data.promoters, backgroundColor: colors.ok }} />
                  <View style={{ flex: data.passives, backgroundColor: colors.warn }} />
                  <View style={{ flex: data.detractors, backgroundColor: colors.err }} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                  <Legend color={colors.ok} text={`Promoter ${data.promoters}`} />
                  <Legend color={colors.warn} text={`Neutral ${data.passives}`} />
                  <Legend color={colors.err} text={`Kritiker ${data.detractors}`} />
                </View>
              </>
            ) : null}
          </Card>
          <KpiGrid>
            <Kpi icon="chatbubbles-outline" label="Antworten" value={formatNumber(data.total)} sub={data.average_score === null ? null : `Ø Score ${comma(data.average_score)} von 10`} />
            <Kpi icon="logo-google" label="Bewertungs-Link gezeigt" value={formatNumber(data.review_link_shown)} sub={`ab Wert ${data.review_min_score}`} />
          </KpiGrid>

          {weekly.length > 1 ? (
            <Section title="Ø Score je Woche">
              <Card>
                <BarChart data={weekly} height={130} format={(v) => comma(v)} />
              </Card>
            </Section>
          ) : null}

          <Section title="Verteilung der Weiterempfehlung">
            <Card>
              <Bars labelWidth={28} items={data.distribution.slice().reverse().map((d) => ({ label: String(d.score), count: d.count, color: scoreColor(d.score) }))} />
            </Card>
          </Section>

          {data.timeline.length > 1 ? (
            <Section title="Antworten pro Tag">
              <Card>
                <BarChart data={data.timeline.map((d) => ({ label: d.day.slice(8, 10), value: d.count, caption: `${formatDay(d.day)}${d.avg_score !== null ? ` · Ø ${comma(d.avg_score)}` : ''}` }))} height={120} format={(v) => `${v} Antworten`} />
              </Card>
            </Section>
          ) : null}

          <Section title="Antworten je Frage">
            {data.questions
              .filter((qu) => qu.active || qu.answered > 0)
              .map((qu) => (
                <QuestionCard key={qu.id} q={qu} />
              ))}
          </Section>
          {data.truncated ? <Text style={styles.hint}>Es werden die neuesten 5.000 Antworten ausgewertet.</Text> : null}
        </>
      ) : null}
    </>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ ...font.footnote, color: colors.ink2 }}>{text}</Text>
    </View>
  );
}

function QuestionCard({ q }: { q: SurveyQuestionResult }) {
  const [search, setSearch] = useState('');
  const [all, setAll] = useState(false);
  const texts = (q.texts ?? []).filter((t) => t.text.toLowerCase().includes(search.trim().toLowerCase()));
  const shown = all ? texts : texts.slice(0, 8);
  return (
    <Card style={{ gap: space.md }}>
      <View>
        <Text style={{ ...font.headline, color: colors.ink }}>{pickLocalized(q.prompt) || 'Frage'}</Text>
        <Text style={{ ...font.footnote, color: colors.ink2, marginTop: 2 }}>
          {q.answered} Antworten{!q.active ? ' · Frage entfernt' : ''}
          {typeof q.average === 'number' ? ` · Ø ${comma(q.average)}` : ''}
        </Text>
      </View>
      {q.type === 'nps' && q.distribution ? <Bars labelWidth={28} items={q.distribution.slice().reverse().map((d) => ({ label: String(d.value), count: d.count, color: scoreColor(d.value) }))} /> : null}
      {q.type === 'stars' && q.distribution ? <Bars labelWidth={40} items={q.distribution.slice().reverse().map((d) => ({ label: `${d.value} ★`, count: d.count, color: '#F5B301' }))} /> : null}
      {q.type === 'yesno' ? <Bars labelWidth={44} items={[{ label: 'Ja', count: q.yes ?? 0, color: colors.ok }, { label: 'Nein', count: q.no ?? 0, color: colors.err }]} /> : null}
      {q.type === 'choice' && q.counts ? <Bars labelWidth={110} items={q.counts.map((c) => ({ label: pickLocalized(q.options[c.index]) || `Antwort ${c.index + 1}`, count: c.count }))} /> : null}
      {q.type === 'text' ? (
        <View style={{ gap: 8 }}>
          {(q.texts ?? []).length > 4 ? (
            <View style={styles.search}>
              <Ionicons name="search" size={16} color={colors.ink3} />
              <TextInput value={search} onChangeText={setSearch} placeholder="In Antworten suchen" placeholderTextColor={colors.ink3} style={{ flex: 1, ...font.body, color: colors.ink }} />
            </View>
          ) : null}
          {texts.length === 0 ? <Text style={styles.hint}>{(q.texts ?? []).length ? 'Keine Antwort passt zur Suche.' : 'Noch keine Antworten.'}</Text> : null}
          {shown.map((t, i) => (
            <View key={`${t.at}-${i}`} style={styles.answer}>
              <Text style={{ ...font.subhead, color: colors.ink }}>{t.text}</Text>
              <Text style={{ ...font.caption, color: colors.ink3, fontWeight: '400', marginTop: 3 }}>
                {new Date(t.at).toLocaleDateString('de-DE')}
                {typeof t.score === 'number' ? ` · Wert ${t.score}` : ''}
              </Text>
            </View>
          ))}
          {texts.length > 8 ? <MiniButton title={all ? 'Weniger anzeigen' : `Alle ${texts.length} anzeigen`} onPress={() => setAll((v) => !v)} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hint: { ...font.caption, color: colors.ink3, fontWeight: '400' },
  stack: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.fill },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: space.md, minHeight: 42, backgroundColor: colors.white },
  answer: { backgroundColor: colors.subtle, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
});
