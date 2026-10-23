import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Choice, Notice, TabStrip } from '../components/controls';
import { successHaptic } from '../components/haptics';
import { Locked } from '../components/Locked';
import { Screen } from '../components/Screen';
import { Button, Card, EmptyState, ErrorNote, Kpi, KpiGrid, KpiSkeleton, ListCard, Pill, Row, Section, Skeleton } from '../components/ui';
import { usePark } from '../contexts/ParkContext';
import { fetchSurveyConfig, saveContactSettings, setUnlockMode, type FieldLevel, type UnlockMode } from '../lib/crm';
import { loadKioskSales } from '../lib/data';
import { PLAN_LABEL, useEntitlements, type FeatureKey } from '../lib/entitlements';
import { formatDayLong, formatNumber, formatPercent, timeAgo } from '../lib/format';
import { aggregateByDate, sumDays } from '../lib/kioskSales';
import { loadLeads, loadSurveyResults, type Lead } from '../lib/marketing';
import { useData } from '../lib/useData';
import { colors, font, radius, space } from '../theme';
import { EmailTab } from './marketing/EmailTab';
import { PixelTab } from './marketing/PixelTab';
import { SocialTab } from './marketing/SocialTab';
import { SurveyTab } from './marketing/SurveyTab';
import { CoachTarget } from '../components/coach/Coach';
import { tr } from '../i18n';

export type MarketingTab = 'start' | 'kontakte' | 'email' | 'social' | 'umfrage' | 'pixel';
const flag = (cc?: string | null) => (cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : '');

const TABS: { value: MarketingTab; label: string; mode?: UnlockMode; feature?: FeatureKey }[] = [
  { value: 'start', get label() { return tr('Start'); } },
  { value: 'kontakte', get label() { return tr('Kontakte'); }, mode: 'email', feature: 'crm_contacts' },
  { value: 'email', get label() { return tr('E-Mail'); }, feature: 'email_marketing' },
  { value: 'social', get label() { return tr('Social Media'); }, mode: 'social', feature: 'crm_social' },
  { value: 'umfrage', get label() { return tr('Umfrage'); }, mode: 'survey', feature: 'crm_survey' },
  { value: 'pixel', get label() { return tr('Pixel'); }, feature: 'crm_pixel' },
];
const MODE_LABEL: Record<UnlockMode, string> = { get email() { return tr('Kontaktdaten (E-Mail)'); }, get survey() { return tr('Umfrage'); }, get social() { return tr('Social Media'); } };

// Marketing-CRM wie im Web (/leads/*): alle sechs Reiter nativ. Der grüne Punkt am Reiter zeigt, wie
// Gäste ihr Foto gerade freischalten; „Für Gäste aktivieren“ stellt das um.
export function MarketingScreen({ navigation, route }: { navigation: { goBack: () => void }; route?: { params?: { tab?: MarketingTab } } }) {
  const nav = useNavigation<any>();
  const { parkId } = usePark();
  const ent = useEntitlements(parkId);
  const [tab, setTab] = useState<MarketingTab>(route?.params?.tab ?? 'start');
  // Aus einer Mitteilung oder einem CRM-Hinweis direkt in einen Reiter springen.
  useEffect(() => {
    if (route?.params?.tab) setTab(route.params.tab);
  }, [route?.params?.tab]);
  const leads = useData(parkId ? `leads:${parkId}` : null, () => loadLeads(parkId!), [parkId], 120000);
  const survey = useData(parkId ? `survey:${parkId}` : null, () => loadSurveyResults(parkId!, 30), [parkId], 300000);
  const sales = useData(parkId ? `sales:${parkId}` : null, () => loadKioskSales(parkId!), [parkId], 300000);
  const config = useData(parkId ? `surveycfg:${parkId}` : null, () => fetchSurveyConfig(parkId!), [parkId], 0);
  const [switching, setSwitching] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const all = leads.data ?? [];
  const since = Date.now() - 30 * 86400000;
  const recent = all.filter((l) => new Date(l.created_at).getTime() >= since);
  const optIn = recent.length ? recent.filter((l) => l.opted_in).length / recent.length : null;
  const sold30 = useMemo(() => (sales.data ? sumDays(aggregateByDate(sales.data.days, 0).slice(0, 30)).sold : null), [sales.data]);
  const mode = config.data?.settings.mode ?? null;
  const current = TABS.find((t) => t.value === tab)!;
  const locked = !!current.feature && !ent.loading && !ent.has(current.feature);

  async function activate(m: UnlockMode) {
    if (!parkId) return;
    setSwitching(true);
    setModeError(null);
    try {
      await setUnlockMode(parkId, m);
      successHaptic();
      config.reload();
    } catch (e) {
      // z. B. Umfrage ohne Fragen: die Meldung sagt, was fehlt.
      setModeError(e instanceof Error ? e.message : tr('Umschalten fehlgeschlagen.'));
    }
    setSwitching(false);
  }

  const refresh = () => {
    leads.reload();
    survey.reload();
    config.reload();
    setRefreshKey((k) => k + 1);
  };

  return (
    <Screen page="marketing" title={tr('Marketing-CRM')} subtitle={tr('Aus Fotokäufern werden Kontakte')} onBack={navigation.goBack} refreshing={leads.refreshing} onRefresh={refresh}>
      <CoachTarget id="marketing.tabs">
        <TabStrip<MarketingTab> tabs={TABS.map((t) => ({ value: t.value, label: t.label, dot: !!t.mode && t.mode === mode }))} value={tab} onChange={setTab} />
      </CoachTarget>

      {current.mode && config.data && !locked ? (
        <View style={styles.mode}>
          <Ionicons name={mode === current.mode ? 'radio-button-on' : 'radio-button-off'} size={18} color={mode === current.mode ? colors.ok : colors.ink3} />
          <Text style={{ ...font.footnote, color: colors.ink, flex: 1 }}>
            {mode === current.mode ? tr('Für Gäste aktiv: so schalten Gäste gerade ihr Foto frei.') : tr('Gäste schalten gerade per {0} frei.', MODE_LABEL[mode!])}
          </Text>
          {mode !== current.mode ? (
            <Pressable onPress={() => void activate(current.mode!)} disabled={switching} style={styles.modeBtn} hitSlop={6}>
              <Text style={{ ...font.footnote, color: colors.onBrand, fontWeight: '700' }}>{switching ? '…' : tr('Für Gäste aktivieren')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {modeError ? <ErrorNote text={modeError} /> : null}

      {locked ? (
        <Locked title={tr('Diese Funktion ist Teil von {0}', PLAN_LABEL.marketing_starter)} intro={tr('Mit {0} schaltest du sie für deinen Park frei. Alles, was du heute schon nutzt, bleibt dabei unverändert.', PLAN_LABEL.marketing_starter)} />
      ) : tab === 'start' ? (
        <>
          {leads.error && !leads.data ? <ErrorNote text={leads.error} onRetry={leads.reload} /> : null}
          {leads.loading && !leads.data ? (
            <KpiSkeleton />
          ) : (
            <KpiGrid>
              <Kpi icon="person-add-outline" label={tr('Neue Kontakte (30 Tage)')} value={formatNumber(recent.length)} />
              <Kpi icon="checkmark-done-outline" label={tr('Opt-in-Quote')} value={formatPercent(optIn)} />
              <Kpi icon="happy-outline" label={tr('NPS')} value={survey.data?.nps !== null && survey.data?.nps !== undefined ? String(survey.data.nps) : '–'} sub={tr('Weiterempfehlung')} />
              <Kpi icon="clipboard-outline" label={tr('Umfrage-Antworten')} value={formatNumber(survey.data?.total ?? 0)} sub={tr('30 Tage')} />
            </KpiGrid>
          )}
          <Section title={tr('Vom Foto zum Kontakt')}>
            <Card style={{ gap: space.md }}>
              <Funnel label={tr('Verkaufte Fotos')} value={sold30} max={sold30} color={colors.brand} />
              <Funnel label={tr('Kontakte')} value={recent.length} max={sold30} color="#F59E5B" />
              <Funnel label={tr('Mit Einwilligung')} value={recent.filter((l) => l.opted_in).length} max={sold30} color="#FBC59A" />
              <Text style={{ ...font.caption, color: colors.ink3 }}>{tr('Letzte 30 Tage')}</Text>
            </Card>
          </Section>
          {mode ? (
            <Section title={tr('Freischalt-Weg')}>
              <ListCard>
                {(['email', 'survey', 'social'] as UnlockMode[]).map((m, i) => (
                  <Row
                    key={m}
                    icon={m === 'email' ? 'mail-outline' : m === 'survey' ? 'clipboard-outline' : 'share-social-outline'}
                    title={MODE_LABEL[m]}
                    subtitle={m === mode ? tr('Für Gäste aktiv') : tr('Antippen zum Öffnen')}
                    right={m === mode ? <Pill tone="ok" text={tr('Aktiv')} /> : null}
                    chevron
                    onPress={() => setTab(m === 'email' ? 'kontakte' : m === 'survey' ? 'umfrage' : 'social')}
                    last={i === 2}
                  />
                ))}
              </ListCard>
            </Section>
          ) : null}
          <Section title={tr('Neueste Kontakte')} action={tr('Alle')} onAction={() => setTab('kontakte')}>
            <LeadList leads={all.slice(0, 5)} loading={leads.loading && !leads.data} />
          </Section>
          <ListCard>
            <Row icon="pricetags-outline" title={tr('Preise und Pakete ansehen')} chevron onPress={() => nav.navigate('Plans', { group: 'plan' })} last />
          </ListCard>
        </>
      ) : tab === 'kontakte' ? (
        <>
          {config.data && parkId ? (
            <ContactSettings key={`cs-${refreshKey}`} parkId={parkId} email={config.data.settings.email_mode} phone={config.data.settings.phone_mode} address={config.data.settings.address_mode} onSaved={config.reload} />
          ) : null}
          <Contacts leads={all} loading={leads.loading && !leads.data} />
        </>
      ) : tab === 'email' && parkId ? (
        <EmailTab key={`em-${refreshKey}`} parkId={parkId} />
      ) : tab === 'social' && parkId ? (
        <SocialTab key={`so-${refreshKey}`} parkId={parkId} config={config.data ?? null} onSaved={config.reload} />
      ) : tab === 'umfrage' && parkId ? (
        <SurveyTab key={`su-${refreshKey}`} parkId={parkId} />
      ) : tab === 'pixel' && parkId ? (
        <PixelTab key={`px-${refreshKey}`} parkId={parkId} />
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
  if (!leads.length) return <Card><EmptyState icon="people-outline" title={tr('Noch keine Kontakte')} text={tr('Gäste, die ihr Foto mit E-Mail freischalten, erscheinen hier.')} /></Card>;
  return (
    <ListCard>
      {leads.map((l, i) => (
        <Row
          key={l.id}
          icon="person-outline"
          title={`${flag(l.country_code)} ${l.full_name || l.email || l.phone || tr('Kontakt')}`.trim()}
          subtitle={`${l.email ?? l.phone ?? ''} · ${timeAgo(l.created_at)}`}
          right={<Pill tone={l.opted_in ? 'ok' : 'neutral'} text={l.opted_in ? tr('Einwilligung') : tr('ohne')} />}
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
        <TextInput value={q} onChangeText={setQ} placeholder={tr('Name, E-Mail oder Telefon')} placeholderTextColor={colors.ink3} style={styles.input} autoCapitalize="none" />
        <Pressable onPress={() => setNurOptIn(!nurOptIn)} style={[styles.chip, nurOptIn && { backgroundColor: colors.ok }]}>
          <Text style={{ ...font.caption, color: nurOptIn ? colors.onBrand : colors.ink2 }}>{tr('Nur Einwilligung')}</Text>
        </Pressable>
      </View>
      <Text style={{ ...font.footnote, color: colors.ink3 }}>{list.length} {tr('Kontakte')}{list.length ? tr(' · seit {0}', formatDayLong(list[list.length - 1].created_at.slice(0, 10))) : ''}</Text>
      <LeadList leads={list.slice(0, 200)} loading={loading} />
    </>
  );
}

const LEVELS: { value: FieldLevel; label: string }[] = [
  { value: 'required', get label() { return tr('Pflicht'); } },
  { value: 'optional', get label() { return tr('Freiwillig'); } },
  { value: 'off', get label() { return tr('Aus'); } },
];

/** Welche Kontaktdaten Gäste beim Freischalten angeben (wie ContactSettings im Web). */
function ContactSettings({ parkId, email, phone, address, onSaved }: { parkId: string; email: FieldLevel; phone: FieldLevel; address: FieldLevel; onSaved: () => void }) {
  const [e, setE] = useState(email);
  const [p, setP] = useState(phone);
  const [a, setA] = useState(address);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = e !== email || p !== phone || a !== address;
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await saveContactSettings(parkId, e, p, a);
      successHaptic();
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Speichern fehlgeschlagen.'));
    }
    setBusy(false);
  }
  return (
    <Card style={{ gap: space.md }}>
      <Text style={{ ...font.headline, color: colors.ink }}>{tr('Abgefragte Kontaktdaten')}</Text>
      <Choice label={tr('E-Mail-Adresse')} options={LEVELS} value={e} onChange={(v) => { setE(v); setSaved(false); }} />
      <Choice label={tr('Telefonnummer')} options={LEVELS} value={p} onChange={(v) => { setP(v); setSaved(false); }} />
      <Choice label={tr('Hausadresse')} options={LEVELS} value={a} onChange={(v) => { setA(v); setSaved(false); }} />
      {error ? <ErrorNote text={error} /> : null}
      {saved && !dirty ? <Notice text={tr('Gespeichert – gilt sofort.')} /> : null}
      {dirty ? <Button title={tr('Speichern')} loading={busy} onPress={() => void save()} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, paddingLeft: space.md, paddingRight: 6, minHeight: 50, borderWidth: 1, borderColor: colors.lineStrong },
  input: { flex: 1, ...font.body, fontSize: 16, color: colors.ink },
  chip: { paddingHorizontal: 10, minHeight: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: colors.fill },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10, borderWidth: 1, borderColor: colors.line },
  modeBtn: { backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 12, minHeight: 34, justifyContent: 'center' },
});
