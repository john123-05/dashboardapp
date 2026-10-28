import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TabStrip } from '../components/controls';
import { successHaptic } from '../components/haptics';
import { useWide } from '../components/layout';
import { Screen } from '../components/Screen';
import { Button, Card, ErrorNote, Pill, Section, Skeleton } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import {
  BUILT_IN_GROUPS,
  bullets,
  catalogGroup,
  compareRows,
  FALLBACK_ADDONS,
  FALLBACK_PLANS,
  fillText,
  groupName,
  groupSub,
  money,
  pkgText,
  priceLine,
  requestPackage,
  useCatalog,
  type CatalogPackage,
} from '../lib/catalog';
import { hasGuestActivity, PLAN_LABEL, useEntitlements, type PlanKey } from '../lib/entitlements';
import { colors, font, radius, space } from '../theme';
import { CoachTarget } from '../components/coach/Coach';
import { tr, getLanguage, localeTag } from '../i18n';

const PLAN_ORDER: PlanKey[] = ['basis', 'marketing_starter', 'marketing_pro'];

// Preise & Pakete wie im Web (/plaene). Alles, was im Liftpictures-CRM unter „Pakete & Preise“ gepflegt
// ist (Karten, Preise, Kundenpreise, Aktionen, eigene Kategorien), erscheint hier ohne neue App-Version.
export function PlansScreen({ navigation, route }: { navigation: { goBack: () => void }; route: { params?: { group?: string } } }) {
  const nav = useNavigation<any>();
  const wide = useWide();
  const { parkId } = usePark();
  const { isOwner } = useAuth();
  const ent = useEntitlements(parkId);
  const catalog = useCatalog(parkId);
  const c = catalog.data ?? null;
  const [filter, setFilter] = useState<string>(route.params?.group ?? 'all');
  useEffect(() => {
    if (route.params?.group) setFilter(route.params.group);
  }, [route.params?.group]);
  const [busy, setBusy] = useState<string | null>(null);
  const [requested, setRequested] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Nach der Buchung im Browser: beim Zurückkehren Freischaltung und Katalog neu laden.
  useFocusEffect(
    useCallback(() => {
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active') {
          ent.reload();
          catalog.reload();
        }
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const hardware = hasGuestActivity(parkId);
  const groups = (c?.groups?.length ? c.groups.map((g) => ({ key: g.key, name: groupName(g) ?? BUILT_IN_GROUPS.find((b) => b.key === g.key)?.name ?? g.key, sub: groupSub(g) })) : BUILT_IN_GROUPS.map((g) => ({ ...g, sub: undefined as string | undefined })))
    .filter((g) => g.key === 'plan' || (c ? catalogGroup(c, g.key).length > 0 : ['shop', 'speed', 'system'].includes(g.key)))
    // Parks mit Speedmessungs-Hardware sehen nur die Software-Pakete.
    .filter((g) => !(hardware && g.key === 'speed'));
  const tabs = [{ value: 'all', label: tr('Alle') }, ...groups.map((g) => ({ value: g.key, label: g.key === 'plan' ? tr('Marketing') : g.name }))];
  const shown = tabs.some((t) => t.value === filter) ? filter : 'all';
  const visibleGroups = groups.filter((g) => shown === 'all' || g.key === shown);

  // App Store 3.1.1: in der App keine Buchung über Stripe – nur unverbindlich anfragen (gebucht wird im Web-Dashboard).
  async function book(plan: 'marketing_starter' | 'marketing_pro', pkg: CatalogPackage | undefined) {
    const fb = FALLBACK_PLANS.find((p) => p.plan === plan)!;
    await ask(plan, pkg ?? { key: plan, name: fb.name, price: tr('{0} €/Monat', fb.cents / 100) });
  }

  async function ask(key: string, target: Parameters<typeof requestPackage>[1]) {
    if (!parkId) return;
    setBusy(key);
    setError(null);
    try {
      await requestPackage(parkId, target);
      successHaptic();
      setRequested((r) => [...r, key]);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('Anfrage fehlgeschlagen.'));
    }
    setBusy(null);
  }

  const cols = wide ? 3 : 1;
  const planCards = () => {
    const fromCatalog = c ? catalogGroup(c, 'plan') : [];
    const items = fromCatalog.length
      ? fromCatalog.map((p) => ({ plan: p.key as PlanKey, pkg: p as CatalogPackage | undefined, name: pkgText(p, 'name') ?? PLAN_LABEL[p.key as PlanKey] ?? p.key, note: pkgText(p, 'tagline'), points: bullets(p, true), excluded: bullets(p, false), highlight: p.highlight, badge: pkgText(p, 'badge'), price: priceLine(p) }))
      : FALLBACK_PLANS.map((p) => ({ plan: p.plan, pkg: undefined as CatalogPackage | undefined, name: p.name, note: p.note, points: p.points, excluded: [] as string[], highlight: !!p.highlight, badge: p.highlight ? tr('Empfohlen') : undefined, price: p.cents ? { value: money(p.cents), suffix: tr('/ Monat') } : { value: tr('Kostenlos') } }));
    return (
      <Grid cols={cols}>
        {items.map((it) => {
          const current = ent.plan === it.plan;
          const lower = PLAN_ORDER.indexOf(it.plan) < PLAN_ORDER.indexOf(ent.plan);
          const bookable = it.plan === 'marketing_starter' || it.plan === 'marketing_pro';
          return (
            <PackageCard
              key={it.plan}
              name={it.name}
              badge={it.badge}
              highlight={it.highlight}
              pkg={it.pkg}
              price={it.price}
              note={it.note}
              points={it.points}
              excluded={it.excluded}
              action={
                current ? (
                  <Pill tone="ok" icon="checkmark-circle" text={tr('Dein aktueller Plan')} />
                ) : lower || !bookable ? null : requested.includes(it.plan) ? (
                  <Pill tone="ok" icon="checkmark" text={tr('Angefragt – wir melden uns')} />
                ) : isOwner ? (
                  <Button title={busy === it.plan ? tr('Wird gesendet…') : tr('Anfragen')} kind={it.highlight ? 'primary' : 'plain'} loading={busy === it.plan} onPress={() => void book(it.plan as 'marketing_starter' | 'marketing_pro', it.pkg)} />
                ) : (
                  <Text style={styles.hint}>{tr('Buchen kann der Inhaber des Kontos.')}</Text>
                )
              }
            />
          );
        })}
      </Grid>
    );
  };

  const groupCards = (grp: string) => {
    const list = c ? catalogGroup(c, grp) : [];
    if (!list.length) return null;
    return (
      <Grid cols={wide ? Math.min(3, list.length) : 1}>
        {list.map((p) => {
          const notes = [pkgText(p, 'tagline'), p.setup_cents ? tr('+ {0} Einrichtung', money(p.setup_cents)) : null, p.term_months ? tr('{0} Monate Laufzeit', p.term_months) : null, p.free_months > 0 ? (p.free_months === 1 ? tr('1 Monat geschenkt') : tr('{0} Monate geschenkt', p.free_months)) : null].filter(Boolean);
          const badge = pkgText(p, 'badge');
          return (
            <PackageCard
              key={p.key}
              name={pkgText(p, 'name') ?? p.key}
              badge={badge ? fillText(badge, { months: p.free_months }) : undefined}
              highlight={p.highlight}
              pkg={p}
              price={priceLine(p)}
              note={notes.join(' · ') || undefined}
              points={bullets(p, true)}
              excluded={bullets(p, false)}
              action={
                requested.includes(p.key) ? (
                  <Pill tone="ok" icon="checkmark" text={tr('Angefragt – wir melden uns')} />
                ) : (
                  <Button title={busy === p.key ? tr('Wird gesendet…') : tr('Anfragen')} kind={p.highlight ? 'primary' : 'plain'} loading={busy === p.key} onPress={() => void ask(p.key, p)} />
                )
              }
            />
          );
        })}
      </Grid>
    );
  };

  const addons = FALLBACK_ADDONS.filter((a) => (shown === 'all' ? true : a.group === shown && a.group !== 'shop' && a.group !== 'speed')).filter((a) => !c || catalogGroup(c, 'addon').length === 0 || c.packages.some((p) => p.key === `addon_${a.key}`));

  return (
    <Screen page="plans"
      title={tr('Preise & Pakete')}
      subtitle={tr('Monatlich kündbar, alle Preise zzgl. MwSt.')}
      onBack={navigation.goBack}
      refreshing={catalog.refreshing}
      onRefresh={() => {
        catalog.reload();
        ent.reload();
      }}
      right={<Pill tone="info" text={PLAN_LABEL[ent.plan]} />}
    >
      {(c?.promotions ?? []).map((p) => (
        <View key={p.id} style={styles.promo}>
          <Pill tone="ok" icon="gift-outline" text={(p.texts?.[getLanguage()] ?? p.texts?.de)?.title || tr('Aktion')} />
          <Text style={{ ...font.footnote, color: colors.ink, flex: 1 }}>{(p.texts?.[getLanguage()] ?? p.texts?.de)?.banner || tr('Aktion: {0}', p.name)}</Text>
          {p.ends_on ? <Text style={{ ...font.caption, color: colors.ink2 }}>{tr('bis ')}{new Date(`${p.ends_on}T00:00:00`).toLocaleDateString(localeTag())}</Text> : null}
        </View>
      ))}
      {error ? <ErrorNote text={error} /> : null}

      <CoachTarget id="plans.tabs">
        <TabStrip tabs={tabs} value={shown} onChange={setFilter} />
      </CoachTarget>
      {ent.plan !== 'basis' && isOwner ? <Text style={styles.hint}>{tr('Abo und Rechnungen verwaltest du im Web-Dashboard.')}</Text> : null}

      {catalog.loading && !catalog.data ? <Skeleton height={300} radius={radius.lg} /> : null}

      {visibleGroups.map((g) => {
        const rows = compareRows(c, g.key);
        const columns = c ? catalogGroup(c, g.key).map((p) => pkgText(p, 'name') ?? p.key) : [];
        const body = g.key === 'plan' ? planCards() : groupCards(g.key);
        if (!body) return null;
        return (
          <Section key={g.key} title={g.key === 'plan' ? tr('Pläne') : g.name}>
            {g.sub || g.key === 'plan' ? <Text style={styles.sub}>{g.sub ?? tr('Ein Plan je Park. Höhere Pläne enthalten alles aus den niedrigeren.')}</Text> : null}
            {body}
            {rows.length ? <CompareTable title={tr('{0} im Vergleich', g.key === 'plan' ? tr('Die Pläne') : g.name)} columns={columns} rows={rows} /> : null}
          </Section>
        );
      })}

      {addons.length ? (
        <Section title={tr('Zusätzlich buchbar')}>
          <Text style={styles.sub}>{tr('Unabhängig vom Plan.')}</Text>
          <Grid cols={wide ? 2 : 1}>
            {addons.map((a) => {
              const pkg = c?.packages.find((p) => p.key === `addon_${a.key}`);
              const active = a.feature ? ent.hasBooked(a.feature) : false;
              const action =
                a.key === 'shop' ? () => (shown === 'all' && groups.some((g) => g.key === 'shop') ? setFilter('shop') : nav.navigate('Shop'))
                : a.key === 'speed' ? () => nav.navigate('Speed')
                : a.key === 'hardware' ? () => nav.navigate('Configuration')
                : () => void ask('addon_mail', pkg ?? { key: 'addon_mail', name: 'Zusatz-E-Mails', price: tr('auf Anfrage') });
              return (
                <Card key={a.key} style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                    <View style={styles.addonIcon}>
                      <Ionicons name={a.icon as any} size={20} color={colors.ink2} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ ...font.headline, color: colors.ink }}>{pkgText(pkg, 'name') ?? a.title}</Text>
                        {active ? <Pill tone="ok" text={tr('Aktiv')} /> : null}
                      </View>
                      <Text style={{ ...font.footnote, color: colors.ink2 }}>{pkgText(pkg, 'tagline') ?? a.text}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <Text style={{ ...font.footnote, color: colors.ink, fontWeight: '600' }}>{pkgText(pkg, 'price_note') ?? a.price}</Text>
                  {requested.includes(`addon_${a.key}`) ? (
                    <Pill tone="ok" icon="checkmark" text={tr('Angefragt – wir melden uns')} />
                  ) : (
                    <Button
                      title={a.key === 'mail' ? (busy === 'addon_mail' ? tr('Wird gesendet…') : tr('Anfragen')) : a.key === 'hardware' ? tr('Zur Konfiguration') : tr('Einzelheiten ansehen')}
                      kind="plain"
                      loading={busy === 'addon_mail' && a.key === 'mail'}
                      onPress={action}
                    />
                  )}
                </Card>
              );
            })}
          </Grid>
        </Section>
      ) : null}

      <Text style={styles.hint}>{tr('Alle Preise zzgl. MwSt. Anfragen sind unverbindlich – wir melden uns persönlich.')}</Text>
    </Screen>
  );
}

function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  if (cols <= 1) return <View style={{ gap: space.md }}>{items}</View>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, alignItems: 'stretch' }}>
      {items.map((ch, i) => (
        <View key={i} style={{ flexBasis: `${Math.floor(100 / cols) - 2}%` as any, flexGrow: 1 }}>
          {ch}
        </View>
      ))}
    </View>
  );
}

function PackageCard({ name, badge, highlight, pkg, price, note, points, excluded, action }: { name: string; badge?: string; highlight?: boolean; pkg?: CatalogPackage; price: { value: string; suffix?: string }; note?: string; points: string[]; excluded?: string[]; action: React.ReactNode }) {
  const deal = pkg?.deal;
  const changed = deal && deal.list_price_cents != null && pkg?.price_cents != null && deal.list_price_cents !== pkg.price_cents;
  return (
    <Card style={[{ gap: 10, flex: 1 }, highlight && { borderWidth: 2, borderColor: colors.brand }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text style={{ ...font.title, color: colors.ink, flexShrink: 1 }}>{name}</Text>
        {badge ? <Pill tone="warn" text={badge} /> : null}
      </View>
      {deal ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Pill tone="ok" text={deal.source === 'override' ? tr('Dein Preis') : deal.name ?? tr('Aktion')} />
          {changed ? <Text style={{ ...font.footnote, color: colors.ink3, textDecorationLine: 'line-through' }}>{tr('statt ')}{money(deal.list_price_cents!)} {tr('/ Monat')}</Text> : null}
          {deal.extra_free_months > 0 ? <Text style={{ ...font.footnote, color: colors.ok, fontWeight: '600' }}>+{deal.extra_free_months} {deal.extra_free_months === 1 ? tr('Monat') : tr('Monate')} {tr('geschenkt')}</Text> : null}
          {deal.valid_until ? <Text style={{ ...font.caption, color: colors.ink3 }}>{tr('bis ')}{new Date(`${deal.valid_until}T00:00:00`).toLocaleDateString(localeTag())}</Text> : null}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: '300', color: colors.ink, letterSpacing: -0.6 }}>{price.value}</Text>
        {price.suffix ? <Text style={{ ...font.subhead, color: colors.ink2 }}>{price.suffix}</Text> : null}
      </View>
      {note ? <Text style={{ ...font.footnote, color: colors.ink2 }}>{note}</Text> : null}
      {points.length ? (
        <View style={{ gap: 6 }}>
          {points.map((p) => (
            <View key={p} style={{ flexDirection: 'row', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={18} color={colors.ok} style={{ marginTop: 1 }} />
              <Text style={{ ...font.subhead, color: colors.ink, flex: 1 }}>{p}</Text>
            </View>
          ))}
          {(excluded ?? []).map((p) => (
            <View key={p} style={{ flexDirection: 'row', gap: 8 }}>
              <Ionicons name="close-circle-outline" size={18} color={colors.ink3} style={{ marginTop: 1 }} />
              <Text style={{ ...font.subhead, color: colors.ink3, flex: 1 }}>{p}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ marginTop: 'auto', paddingTop: 4 }}>{action}</View>
    </Card>
  );
}

/** Vergleichstabelle, seitlich wischbar. */
function CompareTable({ title, columns, rows }: { title: string; columns: string[]; rows: { label: string; soon: boolean; cells: (string | boolean)[] }[] }) {
  const colW = 120;
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <Text style={{ ...font.headline, color: colors.ink, padding: space.lg, paddingBottom: space.sm }}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.trow, { borderTopWidth: 0 }]}>
            <View style={styles.tlabel} />
            {columns.map((cname) => (
              <Text key={cname} style={[styles.thead, { width: colW }]} numberOfLines={2}>{cname}</Text>
            ))}
          </View>
          {rows.map((r) => (
            <View key={r.label} style={styles.trow}>
              <Text style={[styles.tlabel, { ...font.footnote, color: colors.ink }]} numberOfLines={3}>
                {r.label}
                {r.soon ? <Text style={{ color: colors.ink3 }}> {tr('(in Entwicklung)')}</Text> : null}
              </Text>
              {r.cells.map((cell, i) => (
                <View key={i} style={{ width: colW, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                  {cell === true ? <Ionicons name="checkmark" size={18} color={colors.ok} /> : cell === false ? <Ionicons name="remove" size={18} color={colors.ink3} /> : <Text style={{ ...font.footnote, color: colors.ink, textAlign: 'center' }}>{cell}</Text>}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  sub: { ...font.subhead, color: colors.ink2, marginTop: -4 },
  hint: { ...font.caption, color: colors.ink3, fontWeight: '400' },
  promo: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, backgroundColor: colors.okSoft, borderRadius: radius.md, padding: space.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  addonIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  trow: { flexDirection: 'row', alignItems: 'stretch', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineStrong, minHeight: 46 },
  tlabel: { width: 170, paddingHorizontal: space.lg, paddingVertical: 10 },
  thead: { ...font.footnote, fontWeight: '700', color: colors.ink, textAlign: 'center', paddingVertical: 10, paddingHorizontal: 6 },
});
