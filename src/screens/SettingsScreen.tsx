import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Card, ErrorNote, ListCard, Pill, Row, Section, Skeleton } from '../components/ui';
import { successHaptic, tapHaptic } from '../components/haptics';
import { usePark } from '../contexts/ParkContext';
import { isDeviceRegistered, registerDevice, sendTestPush, unregisterDevice } from '../lib/push';
import { DEFAULT_SETTINGS, loadNotificationSettings, saveNotificationSettings, type NotificationSettings } from '../lib/notificationSettings';
import { formatCents } from '../lib/format';
import { normalizeOpeningHoursConfig } from '../lib/kioskSales';
import { colors, font, space, TAP } from '../theme';

const TAGE: [string, string][] = [['mon', 'Montag'], ['tue', 'Dienstag'], ['wed', 'Mittwoch'], ['thu', 'Donnerstag'], ['fri', 'Freitag'], ['sat', 'Samstag'], ['sun', 'Sonntag']];

function Stepper({ value, onChange, min, max, step, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number; suffix: string }) {
  const btn = (d: number, label: string) => (
    <Pressable
      onPress={() => {
        tapHaptic();
        onChange(Math.min(max, Math.max(min, value + d)));
      }}
      style={styles.step}
      accessibilityLabel={label}
    >
      <Text style={{ fontSize: 20, color: colors.ink }}>{d < 0 ? '–' : '+'}</Text>
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn(-step, 'Weniger')}
      <Text style={{ ...font.callout, color: colors.ink, minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {value} {suffix}
      </Text>
      {btn(step, 'Mehr')}
    </View>
  );
}

export function SettingsScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const nav = useNavigation<any>();
  const { parkId, parkName, priceCents, openingHours, openingHoursConfig } = usePark();
  const [s, setS] = useState<NotificationSettings | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [device, setDevice] = useState(false);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [pushNote, setPushNote] = useState<string | null>(null);

  useEffect(() => {
    if (parkId) void isDeviceRegistered(parkId).then(setDevice);
  }, [parkId]);

  // "Dieses Gerät": App für Push anmelden oder abmelden, wie der Schalter im Web.
  async function geraetUmschalten(on: boolean) {
    if (!parkId) return;
    setDeviceBusy(true);
    setPushNote(null);
    try {
      if (on) {
        await registerDevice(parkId);
        // Ohne Park-Schalter kommt nichts an: beim ersten Anmelden mit einschalten.
        if (s && !s.push_enabled) setS(await saveNotificationSettings(parkId, { ...s, push_enabled: true }));
      } else await unregisterDevice(parkId);
      setDevice(on);
      successHaptic();
    } catch (e) {
      setPushNote(e instanceof Error ? e.message : 'Fehlgeschlagen');
    }
    setDeviceBusy(false);
  }

  async function testSenden() {
    if (!parkId) return;
    setPushNote(null);
    try {
      await sendTestPush(parkId);
      setPushNote('Test-Benachrichtigung gesendet. Sie kommt in wenigen Sekunden an.');
    } catch (e) {
      setPushNote(e instanceof Error ? e.message : 'Senden fehlgeschlagen');
    }
  }

  useEffect(() => {
    if (!parkId) return;
    loadNotificationSettings(parkId).then(setS).catch((e) => {
      setErr(e instanceof Error ? e.message : 'Laden fehlgeschlagen');
      setS(DEFAULT_SETTINGS);
    });
  }, [parkId]);

  const set = (patch: Partial<NotificationSettings>) => {
    setSaved(false);
    setS((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  async function speichern() {
    if (!s || !parkId) return;
    setSaving(true);
    setErr(null);
    try {
      setS(await saveNotificationSettings(parkId, s));
      successHaptic();
      setSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    }
    setSaving(false);
  }

  const cfg = normalizeOpeningHoursConfig(openingHoursConfig, openingHours);

  return (
    <Screen page="settings" title="Einstellungen" subtitle={parkName} onBack={navigation.goBack}>
      <Section title="Benachrichtigungen">
        {err ? <ErrorNote text={err} /> : null}
        {!s ? (
          <Card>
            <Skeleton height={18} width="60%" />
          </Card>
        ) : (
          <Card padded={false}>
            <Toggle title="Dieses Gerät" sub={deviceBusy ? 'Wird angemeldet…' : device ? 'Aktiv: Mitteilungen kommen auf dieses iPhone' : 'Mitteilungen auf diesem Gerät empfangen'} value={device} onChange={(v) => void geraetUmschalten(v)} />
            <Toggle title="Benachrichtigungen für diesen Park" sub="Nur wenn dies aktiv ist, werden die Kategorien unten an dieses Konto gesendet." value={s.push_enabled} onChange={(v) => set({ push_enabled: v })} />
            <Toggle title="Keine Fotos mehr" sub="Wenn während der Öffnungszeit keine Fotos ankommen" value={s.photo_inactivity_enabled} onChange={(v) => set({ photo_inactivity_enabled: v })}>
              {s.photo_inactivity_enabled ? <Stepper value={s.photo_inactivity_minutes} onChange={(v) => set({ photo_inactivity_minutes: v })} min={5} max={240} step={5} suffix="Min." /> : null}
            </Toggle>
            <Toggle title="Papier wird knapp" sub="Wenn nur noch wenige Drucke übrig sind" value={s.paper_low_enabled} onChange={(v) => set({ paper_low_enabled: v })}>
              {s.paper_low_enabled ? <Stepper value={s.paper_low_threshold} onChange={(v) => set({ paper_low_threshold: v })} min={1} max={500} step={5} suffix="Drucke" /> : null}
            </Toggle>
            <Toggle title="Antworten vom Support" value={s.support_enabled} onChange={(v) => set({ support_enabled: v })} />
            <Toggle title="Störungen am Automaten" sub="Programm oder Gerät fällt aus" value={s.system_health_enabled} onChange={(v) => set({ system_health_enabled: v })} last />
          </Card>
        )}
        {pushNote ? <Pill tone="info" icon="information-circle" text={pushNote} /> : null}
        {s ? <Button title={saved ? 'Gespeichert' : 'Benachrichtigungen speichern'} icon={saved ? 'checkmark' : 'notifications-outline'} onPress={speichern} loading={saving} /> : null}
        {device ? <Button title="Test-Benachrichtigung senden" kind="plain" icon="phone-portrait-outline" onPress={() => void testSenden()} /> : null}
      </Section>

      <Section title="Öffnungszeiten" action="Bearbeiten" onAction={() => nav.navigate('Web', { path: '/settings', title: 'Öffnungszeiten' })}>
        <ListCard>
          {TAGE.map(([k, name], i) => {
            const d = cfg.weekdays[k as keyof typeof cfg.weekdays];
            return <Row key={k} title={name} right={<Text style={{ ...font.callout, color: d?.enabled ? colors.ink : colors.ink3, fontVariant: ['tabular-nums'] }}>{d?.enabled ? `${d.open} bis ${d.close}` : 'geschlossen'}</Text>} last={i === TAGE.length - 1} />;
          })}
        </ListCard>
        {cfg.season_start || cfg.season_end ? <Pill tone="neutral" icon="calendar-outline" text={`Saison ${cfg.season_start ?? '…'} bis ${cfg.season_end ?? '…'}${cfg.exceptions.length ? ` · ${cfg.exceptions.length} Ausnahmen` : ''}`} /> : null}
      </Section>

      {priceCents !== null ? (
        <Section title="Automat">
          <ListCard>
            <Row title="Preis pro Foto" right={<Text style={{ ...font.callout, color: colors.ink }}>{formatCents(priceCents)}</Text>} last />
          </ListCard>
        </Section>
      ) : null}
    </Screen>
  );
}

function Toggle({ title, sub, value, onChange, last, children }: { title: string; sub?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean; children?: React.ReactNode }) {
  return (
    <View style={[styles.toggle, !last && styles.line]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...font.body, color: colors.ink }}>{title}</Text>
          {sub ? <Text style={{ ...font.footnote, color: colors.ink2 }}>{sub}</Text> : null}
        </View>
        <Switch value={value} onValueChange={(v) => { tapHaptic(); onChange(v); }} trackColor={{ true: colors.brand }} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { paddingHorizontal: space.lg, paddingVertical: 12, gap: 10, minHeight: 60, justifyContent: 'center' },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineStrong },
  stepper: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.fill, borderRadius: 12 },
  step: { width: TAP, height: 40, alignItems: 'center', justifyContent: 'center' },
});
