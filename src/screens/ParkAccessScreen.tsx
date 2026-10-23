import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field } from '../components/Field';
import { Button, Card, ErrorNote, ListCard, Row, Section, Skeleton } from '../components/ui';
import { successHaptic } from '../components/haptics';
import { Screen } from '../components/Screen';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import { invokeEdgeFunction } from '../lib/edgeFunctions';
import { isSuperAdminEmail } from '../lib/pages';
import { supabase } from '../lib/supabase';
import { colors, font, radius, space } from '../theme';
import { tr } from '../i18n';

type Park = { id: string; name: string };
const LAST_PARK_KEY = 'lp-last-park';

// Park wählen, wie auf der Anmeldeseite des Web-Dashboards: ein paar Buchstaben tippen, die Funktion
// park-lookup nennt den Park, danach das Park-Passwort. Super-Admins wechseln ohne Passwort.
export function ParkAccessScreen({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const { email, allowedParkIds, signOut } = useAuth();
  const { setPark, parkId } = usePark();
  const superAdmin = isSuperAdminEmail(email);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Park | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'short' | 'none' | 'many' | 'one'>('idle');
  const [match, setMatch] = useState<Park | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<Park[] | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LAST_PARK_KEY)
      .then((raw) => {
        if (!raw || superAdmin) return;
        const p = JSON.parse(raw) as Park;
        if (p?.id && p?.name) setSelected(p);
      })
      .catch(() => undefined);
  }, [superAdmin]);

  useEffect(() => {
    if (!superAdmin) return;
    let active = true;
    (async () => {
      const [listed, accessible] = await Promise.all([invokeEdgeFunction<{ parks: Park[] }>('external-parks'), supabase.from('parks').select('id')]);
      if (!active) return;
      if (listed.error || !listed.data) {
        setError(listed.error || tr('Parks konnten nicht geladen werden'));
        setList([]);
        return;
      }
      const ok = new Set((accessible.data ?? []).map((r: any) => String(r.id)));
      setList(listed.data.parks.filter((p) => ok.has(p.id) && (allowedParkIds.length === 0 || allowedParkIds.includes(p.id))));
    })();
    return () => {
      active = false;
    };
  }, [superAdmin, allowedParkIds]);

  useEffect(() => {
    if (superAdmin) return;
    const q = query.trim();
    setMatch(null);
    if (selected || q.length === 0) return setState('idle');
    if (q.length < 2) return setState('short');
    setState('loading');
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error: err } = await invokeEdgeFunction<{ park: Park | null; state: 'short' | 'none' | 'many' | 'one' }>('park-lookup', { query: { q } });
      if (cancelled) return;
      if (err || !data) return setState('none');
      setMatch(data.park);
      setState(data.park ? 'one' : data.state);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, selected, superAdmin]);

  async function pick(p: Park) {
    await setPark(p.id, p.name);
    successHaptic();
    onClose?.();
  }

  async function submit() {
    if (!selected) return setError(tr('Bitte zuerst einen Park wählen.'));
    if (!password) return setError(tr('Bitte das Park-Passwort eingeben.'));
    setError(null);
    setBusy(true);
    const { data: ok, error: err } = await supabase.rpc('verify_park_access', { p_park_id: selected.id, p_password: password });
    setBusy(false);
    if (err || !ok) return setError(tr('Das Park-Passwort stimmt nicht.'));
    await AsyncStorage.setItem(LAST_PARK_KEY, JSON.stringify(selected)).catch(() => undefined);
    await pick(selected);
  }

  if (superAdmin) {
    return (
      <Screen title={tr('Park wählen')} onBack={onClose}>
        {error ? <ErrorNote text={error} /> : null}
        {list === null ? (
          <Card>
            <Skeleton height={20} width="60%" />
          </Card>
        ) : (
          <ListCard>
            {list.map((p, i) => (
              <Row key={p.id} icon="location-outline" title={p.name} right={p.id === parkId ? <Text style={{ ...font.callout, color: colors.brand }}>{tr('Aktiv')}</Text> : null} onPress={() => pick(p)} last={i === list.length - 1} />
            ))}
          </ListCard>
        )}
      </Screen>
    );
  }

  const hint =
    state === 'short' ? tr('Mindestens 2 Buchstaben eingeben.') : state === 'none' ? tr('Kein Park gefunden.') : state === 'many' ? tr('Mehrere Parks passen, bitte genauer tippen.') : state === 'loading' ? tr('Suche…') : null;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + (onClose ? 56 : 48), paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ gap: 6 }}>
          <Text style={styles.title}>{tr('Park wählen')}</Text>
          <Text style={styles.sub}>{tr('Tippe die ersten Buchstaben deines Parks und gib das Park-Passwort ein.')}</Text>
        </View>
        <View style={styles.form}>
          {selected ? (
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>{tr('Park')}</Text>
              <Row title={selected.name} icon="location-outline" right={<Text style={{ ...font.callout, color: colors.brand }}>{tr('Ändern')}</Text>} onPress={() => { setSelected(null); setPassword(''); }} last />
            </View>
          ) : (
            <>
              <Field label={tr('Park')} value={query} onChangeText={setQuery} autoCapitalize="none" placeholder={tr('z. B. Wingst')} returnKeyType="search" />
              {hint ? <Text style={styles.hint}>{hint}</Text> : null}
              {match ? <Row icon="location-outline" title={match.name} chevron onPress={() => { setSelected(match); setQuery(''); }} last /> : null}
            </>
          )}
          {selected ? <Field label={tr('Park-Passwort')} value={password} onChangeText={setPassword} secure autoCapitalize="none" returnKeyType="go" onSubmitEditing={submit} placeholder={tr('Park-Passwort')} /> : null}
          {error ? <ErrorNote text={error} /> : null}
          <Button title={tr('Weiter')} onPress={submit} loading={busy} />
          {onClose ? <Button title={tr('Abbrechen')} kind="plain" onPress={onClose} /> : <Button title={tr('Abmelden')} kind="plain" onPress={() => void signOut()} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  // Auf iPad und Mac schmal und mittig wie die Anmeldung.
  scroll: { paddingHorizontal: space.xl, gap: space.xl, width: '100%', maxWidth: 520, alignSelf: 'center' },
  title: { ...font.largeTitle, color: colors.ink },
  sub: { ...font.subhead, color: colors.ink2 },
  form: { gap: space.lg, backgroundColor: colors.white, borderRadius: radius.lg, padding: space.lg },
  label: { ...font.footnote, color: colors.ink2, fontWeight: '600', marginLeft: 2 },
  hint: { ...font.footnote, color: colors.ink2 },
});

export { Section };
