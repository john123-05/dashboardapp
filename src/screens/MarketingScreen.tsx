import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Locked } from '../components/Locked';
import { Screen } from '../components/Screen';
import { Card, EmptyState, ErrorNote, Kpi, KpiGrid, KpiSkeleton, ListCard, Pill, Row, Section, Segmented, Skeleton } from '../components/ui';
import { usePark } from '../contexts/ParkContext';
import { loadKioskSales } from '../lib/data';
import { PLAN_LABEL, useEntitlements } from '../lib/entitlements';
import { formatDayLong, formatNumber, formatPercent, timeAgo } from '../lib/format';
import { aggregateByDate, sumDays } from '../lib/kioskSales';
import { loadLeads, loadSurveyResults, pick, type Lead } from '../lib/marketing';
import { useData } from '../lib/useData';
import { colors, font, radius, space } from '../theme';

type Tab = 'start' | 'kontakte' | 'umfrage' | 'mehr';
const flag = (cc?: string | null) => (cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : '');

// Marketing-CRM wie im Web (/leads): Start mit Kennzahlen und "Vom Foto zum Kontakt", Kontakte, Umfrage.
// E-Mail, Social Media und Pixel öffnen die Web-Seiten in der App.
export function MarketingScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const nav = useNavigation<any>();
  const { parkId } = usePark();
  const ent = useEntitlements(parkId);
  const [tab, setTab] = useState<Tab>('start');
  const leads = useData(parkId ? `leads:${parkId}` : null, () => loadLeads(parkId!), [parkId], 120000);
  const survey = useData(parkId ? `survey:${parkId}` : null, () => loadSurveyResults(parkId!, 30), [parkId], 300000);
  const sales = useData(parkId ? `sales:${parkId}` : null, () => loadKioskSales(parkId!), [parkId], 300000);

  const all = leads.data ?? [];
  const since = Date.now() - 30 * 86400000;
  const recent = all.filter((l) => new Date(l.created_at).getTime() >= since);
  const optIn = recent.length ? recent.filter((l) => l.opted_in).length / recent.length : null;
  const sold30 = useMemo(() => (sales.data ? sumDays(aggregateByDate(sales.data.days, 0).slice(0, 30)).sold : null), [sales.data]);

  const gate = (feature: 'crm_contacts' | 'crm_survey') =>
    !ent.loading && !ent.has(feature) ? (
      <Locked title={`Diese Funktion ist Teil von ${PLAN_LABEL.marketing_starter}`} intro={`Mit ${PLAN_LABEL.marketing_starter} schaltest du sie für deinen Park frei. Alles, was du heute schon nutzt, bleibt dabei unverändert.`} />
    ) : null;

  return (
    <Screen title="Marketing-CRM" subtitle="Aus Fotokäufern werden Kontakte" onBack={navigation.goBack} refreshing={leads.refreshing} onRefresh={() => { leads.reload(); survey.reload(); }}>
      <Segmented<Tab> value={tab} onChange={setTab} options={[{ value: 'start', label: 'Start' }, { value: 'kontakte', label: 'Kontakte' }, { value: 'umfrage', label: 'Umfrage' }, { value: 'mehr', label: 'Mehr' }]} />
      {leads.error && !leads.data ? <ErrorNote text={leads.error} onRetry={leads.reload} /> : null}

      {tab === 'start' ? (
        <>
          {leads.loading && !leads.data ? (
            <KpiSkeleton />
          ) : (
            <KpiGrid>
              <Kpi icon="person-add-outline" label="Neue Kontakte (30 Tage)" value={formatNumber(recent.length)} />
              <Kpi icon="checkmark-done-outline" label="Opt-in-Quote" value={formatPercent(optIn)} />
              <Kpi icon="happy-outline" label="NPS" value={survey.data?.nps !== null && survey.data?.nps !== undefined ? String(survey.data.nps) : '–'} sub="Weiterempfehlung" />
              <Kpi icon="clipboard-outline" label="Umfrage-Antworten" value={formatNumber(survey.data?.total ?? 0)} sub="30 Tage" />
            </KpiGrid>
          )}
          <Section title="Vom Foto zum Kontakt">
            <Card style={{ gap: space.md }}>
              <Funnel label="Verkaufte Fotos" value={sold30} max={sold30} color={colors.brand} />
              <Funnel label="Kontakte" value={recent.length} max={sold30} color="#F59E5B" />
              <Funnel label="Mit Einwilligung" value={recent.filter((l) => l.opted_in).length} max={sold30} color="#FBC59A" />
              <Text style={{ ...font.caption, color: colors.ink3 }}>Letzte 30 Tage</Text>
            </Card>
          </Section>
          <Section title="Neueste Kontakte" action="Alle" onAction={() => setTab('kontakte')}>
            <LeadList leads={all.slice(0, 5)} loading={leads.loading && !leads.data} />
          </Section>
        </>
      ) : null}

      {tab === 'kontakte' ? gate('crm_contacts') ?? <Contacts leads={all} loading={leads.loading && !leads.data} /> : null}

      {tab === 'umfrage'
        ? gate('crm_survey') ?? (
            survey.loading && !survey.data ? (
              <KpiSkeleton />
            ) : survey.data ? (
              <>
                <KpiGrid>
                  <Kpi label="NPS" value={survey.data.nps !== null ? String(survey.data.nps) : '–'} sub={`${survey.data.promoters} Fans · ${survey.data.detractors} Kritiker`} />
                  <Kpi label="Durchschnitt" value={survey.data.average_score !== null ? survey.data.average_score.toFixed(1).replace('.', ',') : '–'} sub="von 10" />
                  <Kpi label="Antworten" value={formatNumber(survey.data.total)} sub="30 Tage" />
                  <Kpi label="Bewertungs-Link" value={formatNumber(survey.data.review_link_shown)} sub="mal gezeigt" />
                </KpiGrid>
                <Section title="Verteilung der Bewertungen">
                  <Card style={{ gap: 6 }}>
                    {survey.data.distribution.slice().reverse().map((d) => (
                      <Funnel key={d.score} label={`${d.score}`} value={d.count} max={Math.max(1, ...survey.data!.distribution.map((x) => x.count))} color={d.score >= 9 ? colors.ok : d.score >= 7 ? colors.warn : colors.err} />
                    ))}
                  </Card>
                </Section>
                {survey.data.questions.filter((q) => q.answered > 0).map((q) => (
                  <Card key={q.id} style={{ gap: 6 }}>
                    <Text style={{ ...font.callout, color: colors.ink, fontWeight: '600' }}>{pick(q.prompt)}</Text>
                    <Text style={{ ...font.footnote, color: colors.ink2 }}>
                      {q.answered} Antworten
                      {typeof q.yes === 'number' ? ` · ${q.yes} Ja, ${q.no ?? 0} Nein` : ''}
                      {typeof q.average === 'number' ? ` · Schnitt ${q.average.toFixed(1).replace('.', ',')}` : ''}
                    </Text>
                  </Card>
                ))}
              </>
            ) : (
              <Card>
                <EmptyState icon="clipboard-outline" title="Noch keine Umfrage" text="Lege die Umfrage im Dashboard an. Antworten erscheinen dann hier." />
              </Card>
            )
          )
        : null}

      {tab === 'mehr' ? (
        <ListCard>
          {[
            { t: 'E-Mail-Kampagnen', p: '/leads/email', i: 'mail-outline' },
            { t: 'Social Media', p: '/leads/social', i: 'logo-instagram' },
            { t: 'Umfrage bearbeiten', p: '/leads/umfrage', i: 'create-outline' },
            { t: 'Pixel installieren', p: '/leads/pixel', i: 'code-slash-outline' },
          ].map((x, k, arr) => (
            <Row key={x.p} icon={x.i as any} title={x.t} chevron onPress={() => nav.navigate('Web', { path: x.p, title: x.t })} last={k === arr.length - 1} />
          ))}
        </ListCard>
      ) : null}
    </Screen>
  );
}

function Funnel({ label, value, max, color }: { label: string; value: number | null; max: number | null; color: string }) {
  const ratio = value !== null && max ? Math.min(1, value / max) : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ ...font.footnote, color: colors.ink2, width: 118 }} numberOfLines={1}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.fill, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(ratio * 100, value ? 2 : 0)}%`, height: 10, borderRadius: 5, backgroundColor: color }} />
      </View>
      <Text style={{ ...font.footnote, color: colors.ink, fontWeight: '700', width: 42, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{value ?? '–'}</Text>
    </View>
  );
}

function LeadList({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  if (loading) return <Card><Skeleton height={18} width="60%" /></Card>;
  if (!leads.length) return <Card><EmptyState icon="people-outline" title="Noch keine Kontakte" text="Gäste, die ihr Foto mit E-Mail freischalten, erscheinen hier." /></Card>;
  return (
    <ListCard>
      {leads.map((l, i) => (
        <Row
          key={l.id}
          icon="person-outline"
          title={`${flag(l.country_code)} ${l.full_name || l.email || l.phone || 'Kontakt'}`.trim()}
          subtitle={`${l.email ?? l.phone ?? ''} · ${timeAgo(l.created_at)}`}
          right={<Pill tone={l.opted_in ? 'ok' : 'neutral'} text={l.opted_in ? 'Einwilligung' : 'ohne'} />}
          onPress={l.email ? () => void Linking.openURL(`mailto:${l.email}`) : l.phone ? () => void Linking.openURL(`tel:${l.phone}`) : undefined}
          last={i === leads.length - 1}
        />
      ))}
    </ListCard>
  );
}

function Contacts({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  const [q, setQ] = useState('');
  const [nurOptIn, setNurOptIn] = useState(false);
  const list = leads.filter((l) => (!nurOptIn || l.opted_in) && (!q.trim() || `${l.full_name} ${l.email} ${l.phone}`.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.ink3} />
        <TextInput value={q} onChangeText={setQ} placeholder="Name, E-Mail oder Telefon" placeholderTextColor={colors.ink3} style={styles.input} autoCapitalize="none" />
        <Pressable onPress={() => setNurOptIn(!nurOptIn)} style={[styles.chip, nurOptIn && { backgroundColor: colors.ok }]}>
          <Text style={{ ...font.caption, color: nurOptIn ? colors.onBrand : colors.ink2 }}>Nur Einwilligung</Text>
        </Pressable>
      </View>
      <Text style={{ ...font.footnote, color: colors.ink3 }}>{list.length} Kontakte{list.length ? ` · seit ${formatDayLong(list[list.length - 1].created_at.slice(0, 10))}` : ''}</Text>
      <LeadList leads={list.slice(0, 200)} loading={loading} />
    </>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, paddingLeft: space.md, paddingRight: 6, minHeight: 50, borderWidth: 1, borderColor: colors.lineStrong },
  input: { flex: 1, ...font.body, fontSize: 16, color: colors.ink },
  chip: { paddingHorizontal: 10, minHeight: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: colors.fill },
});
