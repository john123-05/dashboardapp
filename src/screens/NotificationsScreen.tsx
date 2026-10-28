import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { CoachTarget } from '../components/coach/Coach';
import { Screen } from '../components/Screen';
import { Button, Card, ErrorNote, Pill, Section, Skeleton } from '../components/ui';
import { successHaptic, tapHaptic } from '../components/haptics';
import { usePark } from '../contexts/ParkContext';
import { DEFAULT_SETTINGS, loadNotificationSettings, saveNotificationSettings, type NotificationSettings } from '../lib/notificationSettings';
import { isDeviceRegistered, registerDevice, sendTestPush, unregisterDevice } from '../lib/push';
import { colors, font, space, TAP } from '../theme';
import { tr } from '../i18n';

type BoolKey = 'system_health_enabled' | 'paper_low_enabled' | 'photo_inactivity_enabled' | 'support_enabled' | 'updates_enabled' | 'news_enabled';

// Mitteilungsarten wie auf dem Server (dispatch-operator-notifications, CRM-Push mit Art update/info).
const KINDS: { key: BoolKey; icon: any; title: () => string; sub: () => string }[] = [
  { key: 'system_health_enabled', icon: 'pulse-outline', title: () => tr('Systemzustand'), sub: () => tr('Automat, Kamera oder Drucker fällt aus') },
  { key: 'paper_low_enabled', icon: 'print-outline', title: () => tr('Fotopapier'), sub: () => tr('Wenn nur noch wenige Drucke übrig sind') },
  { key: 'photo_inactivity_enabled', icon: 'images-outline', title: () => tr('Keine Fotos mehr'), sub: () => tr('Wenn während der Öffnungszeit keine Fotos ankommen') },
  { key: 'support_enabled', icon: 'chatbubbles-outline', title: () => tr('Support-Antworten'), sub: () => tr('Neue Nachricht zu deiner Anfrage') },
  { key: 'updates_enabled', icon: 'sparkles-outline', title: () => tr('Updates'), sub: () => tr('Neue Version verfügbar und wichtige Änderungen') },
  { key: 'news_enabled', icon: 'megaphone-outline', title: () => tr('Informationen'), sub: () => tr('Neue Produkte und Angebote von Liftpictures') },
];

function Stepper({ value, onChange, min, max, step, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number; suffix: string }) {
  const btn = (d: number, label: string) => (
    <Pressable onPress={() => { tapHaptic(); onChange(Math.min(max, Math.max(min, value + d))); }} style={styles.step} accessibilityLabel={label}>
      <Text style={{ fontSize: 20, color: colors.ink }}>{d < 0 ? '–' : '+'}</Text>
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn(-step, tr('Weniger'))}
      <Text style={{ ...font.callout, color: colors.ink, minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{value} {suffix}</Text>
      {btn(step, tr('Mehr'))}
    </View>
  );
}

// Benachrichtigungen einstellen: oben „Mitteilungen erlauben“ (fragt iOS, meldet das Gerät an), darunter jede Art
// einzeln. Änderungen werden sofort gespeichert; am Anfang ist alles an.
export function NotificationsScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { parkId, parkName } = usePark();
  const [s, setS] = useState<NotificationSettings | null>(null);
  const [device, setDevice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!parkId) return;
    void isDeviceRegistered(parkId).then(setDevice);
    loadNotificationSettings(parkId).then(setS).catch((e) => {
      setErr(e instanceof Error ? e.message : tr('Laden fehlgeschlagen'));
      setS(DEFAULT_SETTINGS);
    });
  }, [parkId]);

  // Kurz sammeln (Stepper), dann speichern.
  function update(patch: Partial<NotificationSettings>) {
    if (!s || !parkId) return;
    const next = { ...s, ...patch };
    setS(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNotificationSettings(parkId, next).then(setS).catch((e) => setErr(e instanceof Error ? e.message : tr('Speichern fehlgeschlagen')));
    }, 600);
  }

  const allowed = device && !!s?.push_enabled;

  async function toggleAllowed(on: boolean) {
    if (!parkId || !s) return;
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      if (on) {
        await registerDevice(parkId);
        setS(await saveNotificationSettings(parkId, { ...s, push_enabled: true }));
        setDevice(true);
        successHaptic();
      } else {
        await unregisterDevice(parkId);
        setDevice(false);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : tr('Fehlgeschlagen'));
    }
    setBusy(false);
  }

  async function test() {
    if (!parkId) return;
    setNote(null);
    try {
      await sendTestPush(parkId);
      setNote(tr('Test-Benachrichtigung gesendet. Sie kommt in wenigen Sekunden an.'));
    } catch (e) {
      setNote(e instanceof Error ? e.message : tr('Senden fehlgeschlagen'));
    }
  }

  const chosen = s ? KINDS.filter((k) => s[k.key]).map((k) => k.title()) : [];

  return (
    <Screen page="settings" title={tr('Benachrichtigungen')} subtitle={parkName} onBack={navigation.goBack}>
      <View style={{ gap: 6 }}>
        <Text style={{ ...font.title, color: colors.ink }}>{tr('Sofort wissen, was im Park los ist')}</Text>
        <Text style={{ ...font.subhead, color: colors.ink2 }}>{tr('Wähle, worüber dich Liftpictures auf diesem Gerät benachrichtigt – auch wenn die App geschlossen ist.')}</Text>
      </View>
      {err ? <ErrorNote text={err} /> : null}
      {!s ? (
        <Card>
          <Skeleton height={18} width="60%" />
        </Card>
      ) : (
        <>
          <CoachTarget id="notifications.allow">
            <Card padded={false}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...font.headline, color: colors.ink }}>{tr('Mitteilungen erlauben')}</Text>
                  <Text style={{ ...font.footnote, color: colors.ink2 }}>{busy ? tr('Wird angemeldet…') : tr('Störungen, Papier, Support und Hinweise auf diesem Gerät.')}</Text>
                </View>
                <Switch value={allowed} disabled={busy} onValueChange={(v) => { tapHaptic(); void toggleAllowed(v); }} trackColor={{ true: colors.brand }} />
              </View>
            </Card>
          </CoachTarget>
          {allowed ? (
            <Text style={{ ...font.footnote, color: colors.ink2 }}>
              {chosen.length ? tr('Ausgewählt: {0}.', chosen.join(', ')) : tr('Keine Art ausgewählt – es kommen keine Mitteilungen.')}
            </Text>
          ) : null}

          <Section title={tr('Worüber benachrichtigen?')}>
            <Card padded={false}>
              {KINDS.map((k, i) => (
                <View key={k.key} style={[styles.kind, i < KINDS.length - 1 && styles.line, !allowed && { opacity: 0.5 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons name={k.icon} size={20} color={colors.ink2} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...font.body, color: colors.ink }}>{k.title()}</Text>
                      <Text style={{ ...font.footnote, color: colors.ink2 }}>{k.sub()}</Text>
                    </View>
                    <Switch value={s[k.key]} disabled={!allowed} onValueChange={(v) => { tapHaptic(); update({ [k.key]: v }); }} trackColor={{ true: colors.brand }} />
                  </View>
                  {allowed && k.key === 'paper_low_enabled' && s.paper_low_enabled ? (
                    <Stepper value={s.paper_low_threshold} onChange={(v) => update({ paper_low_threshold: v })} min={1} max={500} step={5} suffix={tr('Drucke')} />
                  ) : null}
                  {allowed && k.key === 'photo_inactivity_enabled' && s.photo_inactivity_enabled ? (
                    <Stepper value={s.photo_inactivity_minutes} onChange={(v) => update({ photo_inactivity_minutes: v })} min={5} max={240} step={5} suffix={tr('Min.')} />
                  ) : null}
                </View>
              ))}
            </Card>
          </Section>
          {note ? <Pill tone="info" icon="information-circle" text={note} /> : null}
          {allowed ? <Button title={tr('Test-Benachrichtigung senden')} kind="plain" icon="phone-portrait-outline" onPress={() => void test()} /> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg, paddingVertical: 14, minHeight: 64 },
  kind: { paddingHorizontal: space.lg, paddingVertical: 12, gap: 10, minHeight: 60, justifyContent: 'center' },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineStrong },
  stepper: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: 32, backgroundColor: colors.fill, borderRadius: 12 },
  step: { width: TAP, height: 40, alignItems: 'center', justifyContent: 'center' },
});
