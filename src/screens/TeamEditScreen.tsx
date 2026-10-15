import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { Button, Card, ErrorNote, Section } from '../components/ui';
import { successHaptic, tapHaptic } from '../components/haptics';
import { ASSIGNABLE_PAGES, ROLE_PRESETS, STAFF_DEFAULT_PAGES, type PageKey } from '../lib/permissions';
import { PAGES } from '../lib/pages';
import { createStaff, deleteStaff, setStaffActive, updateStaff, type StaffMember } from '../lib/team';
import { colors, font, space } from '../theme';

const PRESET_LABEL: Record<string, string> = { operations: 'Betriebsleitung', accounting: 'Buchhaltung', marketing: 'Marketing', tech: 'Technik', crew: 'Team' };
const titleOf = (k: PageKey) => PAGES.find((p) => p.key === k)?.title ?? k;

export function TeamEditScreen({ route, navigation }: { route: { params: { member: StaffMember | null } }; navigation: { goBack: () => void } }) {
  const m = route.params.member;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(m?.role_label ?? 'Team');
  const [pages, setPages] = useState<string[]>(m?.allowed_pages ?? STAFF_DEFAULT_PAGES);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (k: string) => {
    tapHaptic();
    setPages((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  };

  async function speichern() {
    setErr(null);
    if (!m && (!name.trim() || !email.trim() || password.length < 8)) return setErr('Bitte Name, E-Mail und ein Passwort mit mindestens 8 Zeichen eingeben.');
    setBusy(true);
    try {
      if (m) await updateStaff(m.user_id, { role_label: role, allowed_pages: pages });
      else await createStaff({ full_name: name.trim(), email: email.trim(), password, role_label: role, allowed_pages: pages });
      successHaptic();
      navigation.goBack();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    }
    setBusy(false);
  }

  return (
    <Screen sheet title={m ? (m.full_name || m.email || 'Zugang') : 'Mitarbeiter einladen'} subtitle={m?.email} onBack={navigation.goBack} backLabel="Abbrechen">
      {!m ? (
        <Card style={{ gap: space.lg }}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Vor- und Nachname" textContentType="name" />
          <Field label="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="name@firma.de" />
          <Field label="Passwort (mindestens 8 Zeichen)" value={password} onChangeText={setPassword} secure autoCapitalize="none" textContentType="newPassword" placeholder="Passwort für die Person" />
        </Card>
      ) : null}

      <Section title="Rolle als Vorlage">
        <View style={styles.chips}>
          {ROLE_PRESETS.map((r) => {
            const on = role === PRESET_LABEL[r.id];
            return (
              <Pressable
                key={r.id}
                onPress={() => {
                  tapHaptic();
                  setRole(PRESET_LABEL[r.id]);
                  setPages(r.pages);
                }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{PRESET_LABEL[r.id]}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Welche Seiten darf die Person sehen?">
        <Card padded={false}>
          {ASSIGNABLE_PAGES.map((p, i) => {
            const on = pages.includes(p.key);
            return (
              <Pressable key={p.key} onPress={() => toggle(p.key)} style={[styles.check, i > 0 && styles.line]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <Text style={{ ...font.body, color: colors.ink, flex: 1 }}>{titleOf(p.key)}</Text>
                <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? colors.brand : colors.ink3} />
              </Pressable>
            );
          })}
        </Card>
      </Section>

      {err ? <ErrorNote text={err} /> : null}
      <Button title={m ? 'Speichern' : 'Zugang anlegen'} onPress={speichern} loading={busy} />

      {m ? (
        <View style={{ gap: space.sm }}>
          <Button
            title={m.disabled_at ? 'Aktivieren' : 'Deaktivieren'}
            kind="plain"
            icon="power-outline"
            onPress={async () => {
              await setStaffActive(m.user_id, Boolean(m.disabled_at)).catch((e) => Alert.alert('Fehler', String(e?.message ?? e)));
              navigation.goBack();
            }}
          />
          <Button
            title="Zugang entfernen"
            kind="danger"
            icon="trash-outline"
            onPress={() =>
              Alert.alert('Zugang entfernen?', `${m.full_name || m.email} kann sich danach nicht mehr anmelden. Das lässt sich nicht rückgängig machen.`, [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Entfernen', style: 'destructive', onPress: async () => { await deleteStaff(m.user_id).catch(() => undefined); navigation.goBack(); } },
              ])
            }
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, minHeight: 38, justifyContent: 'center', borderRadius: 19, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineStrong },
  chipOn: { backgroundColor: '#2b2b2b', borderColor: '#2b2b2b' },
  chipText: { ...font.footnote, fontWeight: '600', color: colors.ink },
  check: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: 52 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineStrong },
});
