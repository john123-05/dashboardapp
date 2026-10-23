import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { BarChart } from '../../components/BarChart';
import { Bars, Choice, Input, LocalizedInput, Notice, SwitchRow, TabStrip } from '../../components/controls';
import { successHaptic, tapHaptic } from '../../components/haptics';
import { Button, Card, EmptyState, ErrorNote, Kpi, KpiGrid, KpiSkeleton, ListCard, Pill, Row, Section, Segmented, Skeleton } from '../../components/ui';
import { fetchCampaigns, fetchSocialResults, saveSocialSettings, type CampaignStatus, type FieldLevel, type SocialPlatform, type SocialSettings, type SurveyConfig } from '../../lib/crm';
import { PLAN_LABEL, useEntitlements } from '../../lib/entitlements';
import { formatDay, formatNumber } from '../../lib/format';
import { useData } from '../../lib/useData';
import { colors, font, radius, space } from '../../theme';
import { tr, localeTag } from '../../i18n';

const PLATFORMS: { value: SocialPlatform; label: string; icon: string }[] = [
  { value: 'instagram', get label() { return tr('Instagram'); }, icon: 'logo-instagram' },
  { value: 'facebook', get label() { return tr('Facebook'); }, icon: 'logo-facebook' },
  { value: 'tiktok', get label() { return tr('TikTok'); }, icon: 'logo-tiktok' },
  { value: 'x', get label() { return tr('X'); }, icon: 'logo-twitter' },
  { value: 'youtube', get label() { return tr('YouTube'); }, icon: 'logo-youtube' },
  { value: 'whatsapp', get label() { return tr('WhatsApp'); }, icon: 'logo-whatsapp' },
];
const PERIODS = [
  { value: '7', get label() { return tr('7 Tage'); } },
  { value: '30', get label() { return tr('30 Tage'); } },
  { value: '90', get label() { return tr('90 Tage'); } },
  { value: '365', get label() { return tr('12 Monate'); } },
];
export const CAMPAIGN_STATUS: Record<CampaignStatus, { text: string; tone: 'ok' | 'neutral' }> = { draft: { get text() { return tr('Entwurf'); }, tone: 'neutral' }, active: { get text() { return tr('Aktiv'); }, tone: 'ok' }, ended: { get text() { return tr('Beendet'); }, tone: 'neutral' } };
export const CAMPAIGN_TYPE = {
  get share_unlock() { return tr('Teilen & freischalten'); },
  get giveaway() { return tr('Gewinnspiel'); },
  get record() { return tr('Rekord-Challenge'); },
};

// Social Media wie im Web (/leads/social): Ergebnisse, Kampagnen mit Teilnehmern und Ziehung, Einstellungen.
export function SocialTab({ parkId, config, onSaved }: { parkId: string; config: SurveyConfig | null; onSaved: () => void }) {
  const [view, setView] = useState<'results' | 'campaigns' | 'settings'>('results');
  return (
    <>
      <Segmented value={view} onChange={setView} options={[{ value: 'results', label: tr('Ergebnisse') }, { value: 'campaigns', label: tr('Kampagnen') }, { value: 'settings', label: tr('Einstellungen') }]} />
      {view === 'results' ? <Results parkId={parkId} /> : view === 'campaigns' ? <Campaigns parkId={parkId} /> : config ? <Settings parkId={parkId} initial={config.settings.social ?? {}} onSaved={onSaved} /> : <Skeleton height={200} radius={radius.lg} />}
    </>
  );
}

function Results({ parkId }: { parkId: string }) {
  const [days, setDays] = useState('30');
  const q = useData(`socialres:${parkId}:${days}`, () => fetchSocialResults(parkId, Number(days)), [parkId, days], 300000);
  const d = q.data;
  const quote = d && d.unlocked > 0 ? Math.round((d.posted / d.unlocked) * 100) : 0;
  return (
    <>
      <TabStrip tabs={PERIODS} value={days} onChange={setDays} />
      {q.error && !d ? <ErrorNote text={q.error} onRetry={q.reload} /> : null}
      {q.loading && !d ? <KpiSkeleton /> : null}
      {d && d.unlocked === 0 ? (
        <Card>
          <EmptyState icon="share-social-outline" title={tr('Noch keine Freischaltungen')} text={tr('Im gewählten Zeitraum hat noch kein Gast per Social Media freigeschaltet.')} />
        </Card>
      ) : null}
      {d && d.unlocked > 0 ? (
        <>
          <KpiGrid>
            <Kpi icon="lock-open-outline" label={tr('Freischaltungen')} value={formatNumber(d.unlocked)} />
            <Kpi icon="paper-plane-outline" label={tr('Beitrag gemeldet')} value={formatNumber(d.posted)} sub={tr('{0} % der Freischaltungen', quote)} />
            <Kpi icon="link-outline" label={tr('Mit Link')} value={formatNumber(d.with_link)} />
            <Kpi icon="gift-outline" label={tr('Gewinnspiel')} value={formatNumber(d.giveaway)} sub={tr('Teilnehmer')} />
          </KpiGrid>
          {d.timeline.length > 1 ? (
            <Section title={tr('Pro Tag')}>
              <Card>
                <BarChart data={d.timeline.map((t) => ({ label: t.day.slice(8, 10), value: t.unlocked, caption: tr('{0} · {1} mit Beitrag', formatDay(t.day), t.posted) }))} height={120} format={(v) => `${v} Freischaltungen`} />
              </Card>
            </Section>
          ) : null}
          <Section title={tr('Kanäle')}>
            <Card>{d.platforms.length ? <Bars items={d.platforms.map((p) => ({ label: PLATFORMS.find((x) => x.value === p.platform)?.label ?? p.platform, count: p.count }))} /> : <Text style={styles.hint}>{tr('Noch kein Beitrag gemeldet.')}</Text>}</Card>
          </Section>
          <Section title={tr('Einträge · {0}', d.entries.length)}>
            <ListCard>
              {d.entries.slice(0, 100).map((e, i, arr) => (
                <Row
                  key={e.id}
                  icon={(PLATFORMS.find((p) => p.value === e.platform)?.icon as any) ?? 'person-outline'}
                  title={e.name || e.handle || e.email || tr('Gast')}
                  subtitle={[new Date(e.created_at).toLocaleDateString(localeTag()), e.handle, e.email || e.phone, e.giveaway_opt_in ? tr('Gewinnspiel') : null].filter(Boolean).join(' · ')}
                  subtitleLines={2}
                  right={e.post_url ? <Pill tone="info" icon="open-outline" text={tr('Beitrag')} /> : e.posted_at ? <Pill text={tr('gemeldet')} /> : null}
                  onPress={e.post_url ? () => void Linking.openURL(e.post_url!) : undefined}
                  last={i === arr.length - 1}
                />
              ))}
            </ListCard>
          </Section>
          {d.truncated ? <Text style={styles.hint}>{tr('Es werden die neuesten 3.000 Einträge ausgewertet.')}</Text> : null}
        </>
      ) : null}
    </>
  );
}

function Campaigns({ parkId }: { parkId: string }) {
  const nav = useNavigation<any>();
  const ent = useEntitlements(parkId);
  const q = useData(`campaigns:${parkId}`, () => fetchCampaigns(parkId), [parkId], 0);
  useFocusEffect(
    useCallback(() => {
      q.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
  const list = q.data;
  return (
    <>
      {!ent.loading && !ent.has('social_campaigns') ? <Notice tone="info" text={tr('Gewinnspiel und Rekord-Challenge gehören zu {0}. „Teilen & freischalten“ geht schon jetzt.', PLAN_LABEL.marketing_pro)} /> : null}
      <Button title={tr('Neue Kampagne')} icon="add" onPress={() => nav.navigate('CampaignEdit', {})} />
      {q.error && !list ? <ErrorNote text={q.error} onRetry={q.reload} /> : null}
      {list?.migration_pending ? <Notice tone="warn" text={tr('Die Kampagnen sind noch nicht eingerichtet (Datenbank-Update steht aus).')} /> : null}
      {q.loading && !list ? <Skeleton height={120} radius={radius.lg} /> : null}
      {list && !list.migration_pending && list.campaigns.length === 0 ? (
        <Card>
          <EmptyState icon="megaphone-outline" title={tr('Noch keine Kampagne')} text={tr('Lege eine an, um ein Gewinnspiel oder eine Challenge zu starten.')} />
        </Card>
      ) : null}
      {list?.campaigns.length ? (
        <ListCard>
          {list.campaigns.map((c, i) => (
            <Row
              key={c.id}
              icon={c.type === 'giveaway' ? 'gift-outline' : c.type === 'record' ? 'trophy-outline' : 'share-social-outline'}
              title={c.name}
              subtitle={tr('{0} · {1} Einträge, {2} geprüft{3}', CAMPAIGN_TYPE[c.type], c.entries_total ?? 0, c.entries_verified ?? 0, c.ends_at ? tr(' · bis {0}', new Date(c.ends_at).toLocaleDateString(localeTag())) : '')}
              subtitleLines={2}
              right={<Pill tone={CAMPAIGN_STATUS[c.status].tone} text={CAMPAIGN_STATUS[c.status].text} />}
              chevron
              onPress={() => nav.navigate('CampaignDetail', { id: c.id })}
              last={i === list.campaigns.length - 1}
            />
          ))}
        </ListCard>
      ) : null}
    </>
  );
}

function Settings({ parkId, initial, onSaved }: { parkId: string; initial: SocialSettings; onSaved: () => void }) {
  const [s, setS] = useState<SocialSettings>(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setS(initial);
    setDirty(false);
  }, [initial]);
  const patch = (p: Partial<SocialSettings>) => {
    setS((c) => ({ ...c, ...p }));
    setDirty(true);
    setSaved(false);
  };
  const toggle = (p: SocialPlatform) => {
    const cur = s.platforms ?? [];
    patch({ platforms: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] });
  };
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await saveSocialSettings(parkId, s);
      setDirty(false);
      setSaved(true);
      successHaptic();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('Speichern fehlgeschlagen.'));
    }
    setBusy(false);
  }
  return (
    <>
      <Section title={tr('Kanäle und Markierung')}>
        <Card style={{ gap: space.md }}>
          <Text style={styles.label}>{tr('Wo sollen Gäste teilen?')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PLATFORMS.map((p) => {
              const on = (s.platforms ?? []).includes(p.value);
              return (
                <Pressable key={p.value} onPress={() => { tapHaptic(); toggle(p.value); }} style={[styles.platform, on && styles.platformOn]} accessibilityState={{ selected: on }}>
                  <Ionicons name={p.icon as any} size={16} color={on ? colors.brand : colors.ink2} />
                  <Text style={{ ...font.footnote, fontWeight: '600', color: on ? colors.brand : colors.ink2 }}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Input label={tr('Unser Profil zum Markieren')} value={s.handle ?? ''} onChangeText={(handle) => patch({ handle })} placeholder={tr('@euer_profil')} autoCapitalize="none" />
          <Input label={tr('Hashtag')} value={s.hashtag ?? ''} onChangeText={(hashtag) => patch({ hashtag })} placeholder={tr('#euerhashtag')} autoCapitalize="none" />
          <LocalizedInput label={tr('Anleitung für den Gast')} value={s.instructions ?? {}} onChange={(instructions) => patch({ instructions })} multiline />
          <LocalizedInput label={tr('Vorgeschlagener Text zum Foto (optional)')} value={s.share_text ?? {}} onChange={(share_text) => patch({ share_text })} multiline />
        </Card>
      </Section>
      <Section title={tr('Gewinnspiel und Beitrag')}>
        <ListCard>
          <SwitchRow title={tr('Gewinnspiel anbieten')} subtitle={tr('Gäste nehmen mit ihrem Beitrag teil.')} value={s.giveaway_enabled === true} onChange={(giveaway_enabled) => patch({ giveaway_enabled })} last />
        </ListCard>
        <Card style={{ gap: space.md }}>
          {s.giveaway_enabled ? <LocalizedInput label={tr('Gewinnspiel-Text')} value={s.giveaway_text ?? {}} onChange={(giveaway_text) => patch({ giveaway_text })} multiline /> : null}
          <Choice<FieldLevel>
            label={tr('Link zum Beitrag abfragen')}
            options={[{ value: 'required', label: tr('Pflicht') }, { value: 'optional', label: tr('Freiwillig') }, { value: 'off', label: tr('Aus') }]}
            value={s.post_link ?? 'optional'}
            onChange={(post_link) => patch({ post_link })}
          />
          <Text style={styles.hint}>{tr('Das Foto ist schon frei, der Link ist nur die Angabe des Gastes. Ob der Beitrag wirklich online ist, prüft das System nicht.')}</Text>
        </Card>
      </Section>
      {error ? <ErrorNote text={error} /> : null}
      {saved && !dirty ? <Notice text={tr('Gespeichert – gilt sofort auf der Freischaltseite.')} /> : null}
      <Button title={tr('Speichern')} loading={busy} kind={dirty ? 'primary' : 'plain'} onPress={() => (dirty ? void save() : undefined)} />
    </>
  );
}

const styles = StyleSheet.create({
  label: { ...font.footnote, color: colors.ink2, fontWeight: '600' },
  hint: { ...font.caption, color: colors.ink3, fontWeight: '400' },
  platform: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.white },
  platformOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
});
