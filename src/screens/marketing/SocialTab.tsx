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

const PLATFORMS: { value: SocialPlatform; label: string; icon: string }[] = [
  { value: 'instagram', label: 'Instagram', icon: 'logo-instagram' },
  { value: 'facebook', label: 'Facebook', icon: 'logo-facebook' },
  { value: 'tiktok', label: 'TikTok', icon: 'logo-tiktok' },
  { value: 'x', label: 'X', icon: 'logo-twitter' },
  { value: 'youtube', label: 'YouTube', icon: 'logo-youtube' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
];
const PERIODS = [
  { value: '7', label: '7 Tage' },
  { value: '30', label: '30 Tage' },
  { value: '90', label: '90 Tage' },
  { value: '365', label: '12 Monate' },
];
export const CAMPAIGN_STATUS: Record<CampaignStatus, { text: string; tone: 'ok' | 'neutral' }> = { draft: { text: 'Entwurf', tone: 'neutral' }, active: { text: 'Aktiv', tone: 'ok' }, ended: { text: 'Beendet', tone: 'neutral' } };
export const CAMPAIGN_TYPE = { share_unlock: 'Teilen & freischalten', giveaway: 'Gewinnspiel', record: 'Rekord-Challenge' } as const;

// Social Media wie im Web (/leads/social): Ergebnisse, Kampagnen mit Teilnehmern und Ziehung, Einstellungen.
export function SocialTab({ parkId, config, onSaved }: { parkId: string; config: SurveyConfig | null; onSaved: () => void }) {
  const [view, setView] = useState<'results' | 'campaigns' | 'settings'>('results');
  return (
    <>
      <Segmented value={view} onChange={setView} options={[{ value: 'results', label: 'Ergebnisse' }, { value: 'campaigns', label: 'Kampagnen' }, { value: 'settings', label: 'Einstellungen' }]} />
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
          <EmptyState icon="share-social-outline" title="Noch keine Freischaltungen" text="Im gewählten Zeitraum hat noch kein Gast per Social Media freigeschaltet." />
        </Card>
      ) : null}
      {d && d.unlocked > 0 ? (
        <>
          <KpiGrid>
            <Kpi icon="lock-open-outline" label="Freischaltungen" value={formatNumber(d.unlocked)} />
            <Kpi icon="paper-plane-outline" label="Beitrag gemeldet" value={formatNumber(d.posted)} sub={`${quote} % der Freischaltungen`} />
            <Kpi icon="link-outline" label="Mit Link" value={formatNumber(d.with_link)} />
            <Kpi icon="gift-outline" label="Gewinnspiel" value={formatNumber(d.giveaway)} sub="Teilnehmer" />
          </KpiGrid>
          {d.timeline.length > 1 ? (
            <Section title="Pro Tag">
              <Card>
                <BarChart data={d.timeline.map((t) => ({ label: t.day.slice(8, 10), value: t.unlocked, caption: `${formatDay(t.day)} · ${t.posted} mit Beitrag` }))} height={120} format={(v) => `${v} Freischaltungen`} />
              </Card>
            </Section>
          ) : null}
          <Section title="Kanäle">
            <Card>{d.platforms.length ? <Bars items={d.platforms.map((p) => ({ label: PLATFORMS.find((x) => x.value === p.platform)?.label ?? p.platform, count: p.count }))} /> : <Text style={styles.hint}>Noch kein Beitrag gemeldet.</Text>}</Card>
          </Section>
          <Section title={`Einträge · ${d.entries.length}`}>
            <ListCard>
              {d.entries.slice(0, 100).map((e, i, arr) => (
                <Row
                  key={e.id}
                  icon={(PLATFORMS.find((p) => p.value === e.platform)?.icon as any) ?? 'person-outline'}
                  title={e.name || e.handle || e.email || 'Gast'}
                  subtitle={[new Date(e.created_at).toLocaleDateString('de-DE'), e.handle, e.email || e.phone, e.giveaway_opt_in ? 'Gewinnspiel' : null].filter(Boolean).join(' · ')}
                  subtitleLines={2}
                  right={e.post_url ? <Pill tone="info" icon="open-outline" text="Beitrag" /> : e.posted_at ? <Pill text="gemeldet" /> : null}
                  onPress={e.post_url ? () => void Linking.openURL(e.post_url!) : undefined}
                  last={i === arr.length - 1}
                />
              ))}
            </ListCard>
          </Section>
          {d.truncated ? <Text style={styles.hint}>Es werden die neuesten 3.000 Einträge ausgewertet.</Text> : null}
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
      {!ent.loading && !ent.has('social_campaigns') ? <Notice tone="info" text={`Gewinnspiel und Rekord-Challenge gehören zu ${PLAN_LABEL.marketing_pro}. „Teilen & freischalten“ geht schon jetzt.`} /> : null}
      <Button title="Neue Kampagne" icon="add" onPress={() => nav.navigate('CampaignEdit', {})} />
      {q.error && !list ? <ErrorNote text={q.error} onRetry={q.reload} /> : null}
      {list?.migration_pending ? <Notice tone="warn" text="Die Kampagnen sind noch nicht eingerichtet (Datenbank-Update steht aus)." /> : null}
      {q.loading && !list ? <Skeleton height={120} radius={radius.lg} /> : null}
      {list && !list.migration_pending && list.campaigns.length === 0 ? (
        <Card>
          <EmptyState icon="megaphone-outline" title="Noch keine Kampagne" text="Lege eine an, um ein Gewinnspiel oder eine Challenge zu starten." />
        </Card>
      ) : null}
      {list?.campaigns.length ? (
        <ListCard>
          {list.campaigns.map((c, i) => (
            <Row
              key={c.id}
              icon={c.type === 'giveaway' ? 'gift-outline' : c.type === 'record' ? 'trophy-outline' : 'share-social-outline'}
              title={c.name}
              subtitle={`${CAMPAIGN_TYPE[c.type]} · ${c.entries_total ?? 0} Einträge, ${c.entries_verified ?? 0} geprüft${c.ends_at ? ` · bis ${new Date(c.ends_at).toLocaleDateString('de-DE')}` : ''}`}
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
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
    }
    setBusy(false);
  }
  return (
    <>
      <Section title="Kanäle und Markierung">
        <Card style={{ gap: space.md }}>
          <Text style={styles.label}>Wo sollen Gäste teilen?</Text>
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
          <Input label="Unser Profil zum Markieren" value={s.handle ?? ''} onChangeText={(handle) => patch({ handle })} placeholder="@euer_profil" autoCapitalize="none" />
          <Input label="Hashtag" value={s.hashtag ?? ''} onChangeText={(hashtag) => patch({ hashtag })} placeholder="#euerhashtag" autoCapitalize="none" />
          <LocalizedInput label="Anleitung für den Gast" value={s.instructions ?? {}} onChange={(instructions) => patch({ instructions })} multiline />
          <LocalizedInput label="Vorgeschlagener Text zum Foto (optional)" value={s.share_text ?? {}} onChange={(share_text) => patch({ share_text })} multiline />
        </Card>
      </Section>
      <Section title="Gewinnspiel und Beitrag">
        <ListCard>
          <SwitchRow title="Gewinnspiel anbieten" subtitle="Gäste nehmen mit ihrem Beitrag teil." value={s.giveaway_enabled === true} onChange={(giveaway_enabled) => patch({ giveaway_enabled })} last />
        </ListCard>
        <Card style={{ gap: space.md }}>
          {s.giveaway_enabled ? <LocalizedInput label="Gewinnspiel-Text" value={s.giveaway_text ?? {}} onChange={(giveaway_text) => patch({ giveaway_text })} multiline /> : null}
          <Choice<FieldLevel>
            label="Link zum Beitrag abfragen"
            options={[{ value: 'required', label: 'Pflicht' }, { value: 'optional', label: 'Freiwillig' }, { value: 'off', label: 'Aus' }]}
            value={s.post_link ?? 'optional'}
            onChange={(post_link) => patch({ post_link })}
          />
          <Text style={styles.hint}>Das Foto ist schon frei, der Link ist nur die Angabe des Gastes. Ob der Beitrag wirklich online ist, prüft das System nicht.</Text>
        </Card>
      </Section>
      {error ? <ErrorNote text={error} /> : null}
      {saved && !dirty ? <Notice text="Gespeichert – gilt sofort auf der Freischaltseite." /> : null}
      <Button title="Speichern" loading={busy} kind={dirty ? 'primary' : 'plain'} onPress={() => (dirty ? void save() : undefined)} />
    </>
  );
}

const styles = StyleSheet.create({
  label: { ...font.footnote, color: colors.ink2, fontWeight: '600' },
  hint: { ...font.caption, color: colors.ink3, fontWeight: '400' },
  platform: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.white },
  platformOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
});
