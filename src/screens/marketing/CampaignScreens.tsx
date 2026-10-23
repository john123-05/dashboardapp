import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { CardHead, DateTimeInput, Input, LocalizedInput, MiniButton, Notice, SwitchRow } from '../../components/controls';
import { successHaptic, tapHaptic } from '../../components/haptics';
import { Screen } from '../../components/Screen';
import { Button, Card, EmptyState, ErrorNote, ListCard, Pill, Section, Skeleton } from '../../components/ui';
import { usePark } from '../../contexts/ParkContext';
import { approveEntry, drawWinner, fetchCampaign, saveCampaign, verifyEntry, type Campaign, type CampaignDraft, type CampaignType } from '../../lib/crm';
import { PLAN_LABEL, useEntitlements } from '../../lib/entitlements';
import { useData } from '../../lib/useData';
import { colors, font, radius, space } from '../../theme';
import { CAMPAIGN_STATUS, CAMPAIGN_TYPE } from './SocialTab';
import { tr, localeTag } from '../../i18n';

const TYPES: { type: CampaignType; desc: string; pro: boolean; icon: string }[] = [
  { type: 'share_unlock', get desc() { return tr('Gäste teilen ihr Foto und schalten es damit frei.'); }, pro: false, icon: 'share-social-outline' },
  { type: 'giveaway', get desc() { return tr('Teilnahme durch Teilen mit Hashtag, Ziehung hier in der App.'); }, pro: true, icon: 'gift-outline' },
  { type: 'record', get desc() { return tr('„Schlag den Tagesrekord und teile dein Foto.“'); }, pro: true, icon: 'trophy-outline' },
];

export const asDraft = (c: Campaign): CampaignDraft => ({ id: c.id, name: c.name, type: c.type, status: c.status, hashtag: c.hashtag, mention: c.mention, prize: c.prize, rules_text: c.rules_text ?? {}, starts_at: c.starts_at, ends_at: c.ends_at });

// Kampagne im Detail wie im Web: Ziehung, Rangliste (meiste Freunde), Teilnehmer prüfen und Fotos freigeben.
export function CampaignDetailScreen({ navigation, route }: { navigation: { goBack: () => void }; route: { params: { id: string } } }) {
  const nav = useNavigation<any>();
  const { parkId } = usePark();
  const ent = useEntitlements(parkId);
  const q = useData(parkId ? `campaign:${parkId}:${route.params.id}` : null, () => fetchCampaign(parkId!, route.params.id), [parkId, route.params.id], 60000);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weighted, setWeighted] = useState(false);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      q.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  }

  const d = q.data;
  if (!d) {
    return (
      <Screen title={tr('Kampagne')} onBack={navigation.goBack} backLabel={tr('CRM')}>
        {q.error ? <ErrorNote text={q.error} onRetry={q.reload} /> : <Skeleton height={220} radius={radius.lg} />}
      </Screen>
    );
  }
  const { campaign, entries, leaderboard } = d;
  const winner = entries.find((e) => e.id === campaign.winner_entry_id);
  const canDraw = campaign.type === 'giveaway' && (ent.loading || ent.has('social_campaigns'));
  const who = (e: (typeof entries)[number]) => e.name || e.handle || e.email_masked || '–';

  return (
    <Screen
      title={campaign.name}
      subtitle={`${CAMPAIGN_TYPE[campaign.type]}${campaign.ends_at ? tr(' · bis {0}', new Date(campaign.ends_at).toLocaleDateString(localeTag())) : ''}`}
      onBack={navigation.goBack}
      backLabel={tr('CRM')}
      refreshing={q.refreshing}
      onRefresh={q.reload}
      right={<Pill tone={CAMPAIGN_STATUS[campaign.status].tone} text={CAMPAIGN_STATUS[campaign.status].text} />}
    >
      {error ? <ErrorNote text={error} /> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title={tr('Bearbeiten')} icon="create-outline" kind="plain" onPress={() => nav.navigate('CampaignEdit', { draft: asDraft(campaign) })} />
        </View>
        {campaign.status === 'active' ? (
          <View style={{ flex: 1 }}>
            <Button
              title={tr('Beenden')}
              icon="stop-circle-outline"
              kind="danger"
              loading={busy === 'end'}
              onPress={() =>
                Alert.alert(tr('Kampagne beenden?'), tr('Gäste sehen sie danach nicht mehr auf der Abholseite.'), [
                  { text: tr('Abbrechen'), style: 'cancel' },
                  { text: tr('Beenden'), style: 'destructive', onPress: () => void run('end', () => saveCampaign(parkId!, { ...asDraft(campaign), status: 'ended' })) },
                ])
              }
            />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Button title={tr('Aktivieren')} icon="play-circle-outline" loading={busy === 'start'} onPress={() => void run('start', () => saveCampaign(parkId!, { ...asDraft(campaign), status: 'active' }))} />
          </View>
        )}
      </View>

      {canDraw ? (
        <Card style={{ gap: space.md }}>
          <CardHead title={winner ? tr('Gewinner: {0}', who(winner)) : tr('Gewinner ziehen')} sub={winner && campaign.drawn_at ? tr('Gezogen am {0}', new Date(campaign.drawn_at).toLocaleDateString(localeTag())) : tr('Zufällig unter geprüften Teilnehmern, die dem Gewinnspiel zugestimmt haben.')} right={<Ionicons name="trophy" size={24} color={colors.brand} />} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ ...font.subhead, color: colors.ink, flex: 1 }}>{tr('Nach Besuchern gewichten')}</Text>
            <Switch value={weighted} onValueChange={(v) => { tapHaptic(); setWeighted(v); }} trackColor={{ true: colors.ok, false: undefined }} />
          </View>
          <Button
            title={winner ? tr('Neu ziehen') : tr('Gewinner ziehen')}
            icon="shuffle"
            loading={busy === 'draw'}
            onPress={() =>
              run('draw', async () => {
                await drawWinner(parkId!, campaign.id, { redraw: Boolean(winner), weighted });
                successHaptic();
              })
            }
          />
        </Card>
      ) : null}

      {leaderboard.length > 0 ? (
        <Section title={tr('Rangliste: meiste Freunde')}>
          <ListCard>
            {leaderboard.slice(0, 10).map((e, i, arr) => (
              <View key={e.id} style={[styles.rank, i < arr.length - 1 && styles.line]}>
                <Text style={styles.rankNo}>{i + 1}</Text>
                <Text style={{ ...font.body, color: colors.ink, flex: 1 }} numberOfLines={1}>{who(e)}</Text>
                <Text style={{ ...font.callout, color: colors.ink2, fontVariant: ['tabular-nums'] }}>{e.visitors} {tr('Besucher')}</Text>
              </View>
            ))}
          </ListCard>
        </Section>
      ) : null}

      <Section title={tr('Teilnehmer · {0}', entries.length)}>
        {entries.length === 0 ? (
          <Card>
            <EmptyState icon="people-outline" title={tr('Noch keine Einträge')} />
          </Card>
        ) : (
          <ListCard>
            {entries.map((e, i) => (
              <View key={e.id} style={[styles.entry, i < entries.length - 1 && styles.line]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ ...font.body, color: colors.ink }} numberOfLines={1}>
                      {who(e)}
                      {e.handle && e.name ? <Text style={{ color: colors.ink3 }}> {e.handle}</Text> : null}
                    </Text>
                    <Text style={{ ...font.footnote, color: colors.ink2 }} numberOfLines={2}>
                      {[e.platform, e.email_masked, new Date(e.created_at).toLocaleDateString(localeTag()), e.giveaway_opt_in ? tr('Gewinnspiel: ja') : null, e.visitors > 0 ? tr('{0} Besucher', e.visitors) : null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {e.post_url ? <MiniButton icon="open-outline" onPress={() => void Linking.openURL(e.post_url!)} /> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <Pressable onPress={() => void run(`v:${e.id}`, () => verifyEntry(parkId!, e.id, !e.verified_at))} style={[styles.tag, e.verified_at && styles.tagOn]} disabled={busy !== null}>
                    <Ionicons name={e.verified_at ? 'checkbox' : 'square-outline'} size={16} color={e.verified_at ? colors.ok : colors.ink2} />
                    <Text style={[styles.tagText, e.verified_at && { color: colors.ok }]}>{tr('Geprüft')}</Text>
                  </Pressable>
                  {e.photo_rights ? (
                    <Pressable onPress={() => void run(`a:${e.id}`, () => approveEntry(parkId!, e.id, !e.approved_at))} style={[styles.tag, e.approved_at && styles.tagOn]} disabled={busy !== null}>
                      <Ionicons name={e.approved_at ? 'checkmark-circle' : 'image-outline'} size={16} color={e.approved_at ? colors.ok : colors.ink2} />
                      <Text style={[styles.tagText, e.approved_at && { color: colors.ok }]}>{e.approved_at ? tr('Foto freigegeben') : tr('Foto freigeben')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </ListCard>
        )}
      </Section>
    </Screen>
  );
}

const EMPTY: CampaignDraft = { name: '', type: 'share_unlock', status: 'draft', hashtag: '', mention: '', prize: '', rules_text: {}, starts_at: null, ends_at: null };

// Neue oder bestehende Kampagne in drei Schritten wie im Web: Typ, Details, Prüfen.
export function CampaignEditScreen({ navigation, route }: { navigation: { goBack: () => void }; route: { params?: { draft?: CampaignDraft } } }) {
  const { parkId } = usePark();
  const ent = useEntitlements(parkId);
  const pro = ent.loading || ent.has('social_campaigns');
  const initial = route.params?.draft ?? EMPTY;
  const [step, setStep] = useState<1 | 2 | 3>(initial.id ? 2 : 1);
  const [d, setD] = useState<CampaignDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patch = (p: Partial<CampaignDraft>) => setD((x) => ({ ...x, ...p }));
  const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

  async function save(status: CampaignDraft['status']) {
    if (!parkId) return;
    setBusy(true);
    setError(null);
    try {
      await saveCampaign(parkId, { ...d, status });
      successHaptic();
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  return (
    <Screen title={d.id ? tr('Kampagne bearbeiten') : tr('Neue Kampagne')} subtitle={[tr('1 · Typ'), tr('2 · Details'), tr('3 · Prüfen')][step - 1]} onBack={navigation.goBack} backLabel={tr('Zurück')}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[styles.progress, n <= step && { backgroundColor: colors.brand }]} />
        ))}
      </View>
      {error ? <ErrorNote text={error} /> : null}

      {step === 1 ? (
        <>
          {!pro ? <Notice tone="info" text={tr('Gewinnspiel und Rekord-Challenge gehören zu {0}.', PLAN_LABEL.marketing_pro)} /> : null}
          {TYPES.map((t) => {
            const locked = t.pro && !pro;
            const on = d.type === t.type;
            return (
              <Pressable key={t.type} disabled={locked} onPress={() => { tapHaptic(); patch({ type: t.type }); }} style={[styles.type, on && styles.typeOn, locked && { opacity: 0.45 }]}>
                <Ionicons name={t.icon as any} size={22} color={on ? colors.brand : colors.ink2} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...font.headline, color: colors.ink }}>{CAMPAIGN_TYPE[t.type]}</Text>
                  <Text style={{ ...font.footnote, color: colors.ink2 }}>{t.desc}</Text>
                </View>
                {locked ? <Ionicons name="lock-closed" size={16} color={colors.ink3} /> : on ? <Ionicons name="checkmark-circle" size={22} color={colors.brand} /> : null}
              </Pressable>
            );
          })}
          {!d.id ? (
            <MiniButton
              title={tr('Beispiel einfügen')}
              icon="sparkles-outline"
              onPress={() =>
                setD((x) => ({
                  ...x,
                  name: 'Herbst-Gewinnspiel',
                  type: pro ? 'giveaway' : 'share_unlock',
                  hashtag: '#meinpark',
                  mention: '@mein_park',
                  prize: 'Eine Freifahrt für die ganze Familie',
                  rules_text: { de: 'Teilnahme ab 18 Jahren. Unter allen geprüften Beiträgen verlosen wir eine Freifahrt für bis zu vier Personen. Der Rechtsweg ist ausgeschlossen.', en: 'Open to adults. Among all verified posts we raffle a free ride for up to four people. No recourse to legal action.' },
                  ends_at: inDays(30),
                }))
              }
            />
          ) : null}
        </>
      ) : null}

      {step === 2 ? (
        <Card style={{ gap: space.md }}>
          <Input label={tr('Name der Kampagne')} value={d.name} maxLength={120} onChangeText={(name) => patch({ name })} />
          <Input label={tr('Hashtag')} value={d.hashtag ?? ''} placeholder="#" autoCapitalize="none" onChangeText={(hashtag) => patch({ hashtag })} />
          <Input label={tr('Profil zum Erwähnen')} value={d.mention ?? ''} placeholder="@" autoCapitalize="none" onChangeText={(mention) => patch({ mention })} />
          {d.type === 'giveaway' ? <Input label={tr('Preis')} value={d.prize ?? ''} maxLength={200} onChangeText={(prize) => patch({ prize })} /> : null}
          <DateTimeInput label={tr('Beginn (leer = sofort)')} value={d.starts_at} onChange={(starts_at) => patch({ starts_at })} quick={[{ label: tr('Sofort'), iso: null }]} />
          <DateTimeInput label={tr('Ende')} value={d.ends_at} onChange={(ends_at) => patch({ ends_at })} quick={[{ label: tr('In 7 Tagen'), iso: inDays(7) }, { label: tr('In 14 Tagen'), iso: inDays(14) }, { label: tr('In 30 Tagen'), iso: inDays(30) }, { label: tr('Ohne Ende'), iso: null }]} />
          <LocalizedInput label={tr('Teilnahmebedingungen')} value={d.rules_text} onChange={(rules_text) => patch({ rules_text })} multiline />
        </Card>
      ) : null}

      {step === 3 ? (
        <Card style={{ gap: 6 }}>
          <Text style={{ ...font.title, color: colors.ink }}>{d.name || '–'}</Text>
          <Text style={{ ...font.subhead, color: colors.ink2 }}>{CAMPAIGN_TYPE[d.type]}</Text>
          {[d.mention, d.hashtag].filter(Boolean).length ? <Text style={{ ...font.subhead, color: colors.ink }}>{[d.mention, d.hashtag].filter(Boolean).join(' ')}</Text> : null}
          {d.prize ? <Text style={{ ...font.subhead, color: colors.ink }}>{tr('Preis: ')}{d.prize}</Text> : null}
          {d.ends_at ? <Text style={{ ...font.subhead, color: colors.ink2 }}>{tr('Ende: ')}{new Date(d.ends_at).toLocaleString(localeTag(), { dateStyle: 'medium', timeStyle: 'short' })}</Text> : null}
          <Text style={{ ...font.caption, color: colors.ink3, fontWeight: '400', marginTop: 6 }}>{tr('Pro Park läuft höchstens eine Kampagne. Eine neu aktivierte beendet die bisherige.')}</Text>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {step > 1 ? (
          <View style={{ flex: 1 }}>
            <Button title={tr('Zurück')} kind="plain" onPress={() => setStep((s) => (s - 1) as 1 | 2)} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          {step < 3 ? (
            <Button title={tr('Weiter')} onPress={() => (step === 2 && !d.name.trim() ? setError(tr('Bitte gib der Kampagne einen Namen.')) : (setError(null), setStep((s) => (s + 1) as 2 | 3)))} />
          ) : (
            <Button title={tr('Speichern und aktivieren')} loading={busy} onPress={() => void save('active')} />
          )}
        </View>
      </View>
      {step === 3 ? <Button title={tr('Als Entwurf speichern')} kind="plain" onPress={() => void save(d.status === 'ended' ? 'ended' : 'draft')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineStrong },
  rank: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg, minHeight: 50, backgroundColor: colors.card },
  rankNo: { width: 22, textAlign: 'right', ...font.callout, color: colors.ink3, fontVariant: ['tabular-nums'] },
  entry: { paddingHorizontal: space.lg, paddingVertical: 12, backgroundColor: colors.card },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.lineStrong },
  tagOn: { borderColor: colors.ok, backgroundColor: colors.okSoft },
  tagText: { ...font.footnote, fontWeight: '600', color: colors.ink2 },
  progress: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.fill },
  type: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: colors.line },
  typeOn: { borderColor: colors.brand, borderWidth: 2 },
});
