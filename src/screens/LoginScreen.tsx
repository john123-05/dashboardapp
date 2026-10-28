import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field } from '../components/Field';
import { Button, ErrorNote, Row } from '../components/ui';
import { successHaptic } from '../components/haptics';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import { invokeEdgeFunction } from '../lib/edgeFunctions';
import { supabase } from '../lib/supabase';
import { colors, font, radius, space } from '../theme';
import { tr } from '../i18n';

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return tr('E-Mail oder Passwort stimmt nicht.');
  if (m.includes('email not confirmed')) return tr('Bitte bestätige zuerst deine E-Mail-Adresse.');
  if (m.includes('network') || m.includes('fetch')) return tr('Keine Verbindung. Bitte Internet prüfen.');
  if (m.includes('already registered') || m.includes('already exists')) return tr('Für diese E-Mail gibt es schon ein Konto. Bitte melde dich an.');
  return message;
}

type Park = { id: string; name: string };
const LAST_PARK_KEY = 'lp-last-park';

// Konto erstellen wie im Web: Name, E-Mail, Passwort und einmalig Park + Park-Passwort (link_park_access).
// Danach reicht die Anmeldung mit E-Mail und Passwort.
function RegisterForm({ onBack }: { onBack: () => void }) {
  const { refreshProfile } = useAuth();
  const { setPark } = usePark();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [park, setParkChoice] = useState<Park | null>(null);
  const [match, setMatch] = useState<Park | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'short' | 'none' | 'many' | 'one'>('idle');
  const [parkPassword, setParkPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    setMatch(null);
    if (park || q.length === 0) return setState('idle');
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
  }, [query, park]);

  async function submit() {
    if (!name.trim() || !email.trim() || !password) return setError(tr('Bitte Name, E-Mail und Passwort eingeben.'));
    if (password.length < 6) return setError(tr('Das Passwort braucht mindestens 6 Zeichen.'));
    if (!park) return setError(tr('Bitte zuerst einen Park wählen.'));
    if (!parkPassword) return setError(tr('Bitte das Park-Passwort eingeben.'));
    setError(null);
    setBusy(true);
    await AsyncStorage.setItem(LAST_PARK_KEY, JSON.stringify(park)).catch(() => undefined);
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } });
    if (err) {
      setBusy(false);
      return setError(friendly(err.message));
    }
    if (!data.session) {
      setBusy(false);
      return setInfo(tr('Fast geschafft: Bitte bestätige deine E-Mail-Adresse und melde dich dann an.'));
    }
    // Stimmt das Park-Passwort nicht, ist das Konto trotzdem angelegt: der Park-Bildschirm fragt dann erneut.
    const { data: ok } = await supabase.rpc('link_park_access', { p_park_id: park.id, p_password: parkPassword });
    if (ok) {
      await supabase.auth.refreshSession().catch(() => undefined);
      await setPark(park.id, park.name);
      await refreshProfile();
      successHaptic();
    }
  }

  const hint =
    state === 'short' ? tr('Mindestens 2 Buchstaben eingeben.') : state === 'none' ? tr('Kein Park gefunden.') : state === 'many' ? tr('Mehrere Parks passen, bitte genauer tippen.') : state === 'loading' ? tr('Suche…') : null;

  return (
    <>
      <Text style={{ ...font.headline, color: colors.ink }}>{tr('Konto erstellen')}</Text>
      <Field label={tr('Name')} value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder={tr('Vor- und Nachname')} />
      <Field label={tr('E-Mail')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="username" placeholder={tr('name@firma.de')} />
      <Field label={tr('Passwort')} value={password} onChangeText={setPassword} secure autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" placeholder={tr('Mindestens 6 Zeichen')} />
      <Text style={{ ...font.footnote, color: colors.ink2 }}>{tr('Dein Park: einmal mit dem Park-Passwort verbinden. Danach meldest du dich nur mit E-Mail und Passwort an.')}</Text>
      {park ? (
        <Row title={park.name} icon="location-outline" right={<Text style={{ ...font.callout, color: colors.brand }}>{tr('Ändern')}</Text>} onPress={() => setParkChoice(null)} last />
      ) : (
        <>
          <Field label={tr('Park')} value={query} onChangeText={setQuery} autoCapitalize="none" placeholder={tr('z. B. Wingst')} returnKeyType="search" />
          {hint ? <Text style={{ ...font.footnote, color: colors.ink2 }}>{hint}</Text> : null}
          {match ? <Row icon="location-outline" title={match.name} chevron onPress={() => { setParkChoice(match); setQuery(''); }} last /> : null}
        </>
      )}
      <Field label={tr('Park-Passwort')} value={parkPassword} onChangeText={setParkPassword} secure autoCapitalize="none" returnKeyType="go" onSubmitEditing={submit} placeholder={tr('Park-Passwort')} />
      {error ? <ErrorNote text={error} /> : null}
      {info ? <Text style={{ ...font.callout, color: colors.ink }}>{info}</Text> : null}
      <Button title={tr('Konto erstellen')} onPress={submit} loading={busy} />
      <Button title={tr('Ich habe schon ein Konto')} kind="plain" onPress={onBack} />
    </>
  );
}

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [register, setRegister] = useState(false);
  const { width: winW, height: winH } = useWindowDimensions();
  const portrait = winH > winW;
  const bgHeight = Math.round((winW * 1080) / 1920 * 1.35);
  const pw = useRef<TextInput>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError(tr('Bitte E-Mail und Passwort eingeben.'));
      return;
    }
    setError(null);
    setBusy(true);
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) setError(friendly(err));
    else successHaptic();
  }

  return (
    <View style={styles.root}>
      {/* Foto aus dem Park (Liftpic-Kamera und Achterbahn). Hochkant ganz zeigen statt beschneiden: oben in voller
          Breite, unten weich in den dunklen Hintergrund auslaufen lassen. Quer (iPad, Mac) füllt es die Fläche. */}
      {portrait ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: bgHeight + FADE }}>
          <ExpoImage source={{ uri: BG }} style={{ width: '100%', height: bgHeight }} contentFit="cover" transition={300} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.45)' }]} />
          {Array.from({ length: 8 }, (_, i) => (
            <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: bgHeight - FADE + (i * FADE * 2) / 8, height: (FADE * 2) / 8 + 1, backgroundColor: `rgba(15,23,42,${((i + 1) / 8).toFixed(2)})` }} />
          ))}
        </View>
      ) : (
        <>
          <ExpoImage source={{ uri: BG }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.55)' }]} />
        </>
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>{'Liftpictures'}</Text>
          <Text style={styles.sub}>{tr('Dein Fotosystem als Business-Tool.')}</Text>
        </View>
        <BlurView intensity={60} tint="systemThickMaterial" style={styles.form}>
          {register ? <RegisterForm onBack={() => setRegister(false)} /> : <>
          <Text style={{ ...font.headline, color: colors.ink }}>{tr('Anmelden')}</Text>
          <Field label={tr('E-Mail')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="username" returnKeyType="next" onSubmitEditing={() => pw.current?.focus()} placeholder={tr('name@firma.de')} />
          <Field ref={pw} label={tr('Passwort')} value={password} onChangeText={setPassword} secure autoCapitalize="none" autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} placeholder={tr('Passwort')} />
          {error ? <ErrorNote text={error} /> : null}
          <Button title={tr('Anmelden')} onPress={submit} loading={busy} />
          <Pressable onPress={() => void Linking.openURL('https://dashboard-liftpictures.com/login')} hitSlop={8} style={{ alignSelf: 'center', minHeight: 36, justifyContent: 'center' }}>
            <Text style={{ ...font.footnote, color: colors.ink2 }}>{tr('Passwort vergessen?')}</Text>
          </Pressable>
          </>}
        </BlurView>
        {!register ? (
          <Pressable onPress={() => setRegister(true)} style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ ...font.callout, color: '#fff' }}>
              {tr('Neuer Betreiber? ')}<Text style={{ fontWeight: '700' }}>{tr('Konto erstellen')}</Text>
            </Text>
          </Pressable>
        ) : null}
        {/* „Demo anfragen“ nur bei „Konto erstellen“ – auf der Anmeldung reicht der Weg für neue Betreiber. */}
        {register ? (
          <Pressable onPress={() => void Linking.openURL('https://dashboard-liftpictures.com/login')} style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ ...font.callout, color: '#fff' }}>
              {tr('Noch kein Zugang? ')}<Text style={{ fontWeight: '700' }}>{tr('Demo anfragen')}</Text>
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const FADE = 90;
const BG = 'https://xcrxltiiovpoladpaewd.supabase.co/storage/v1/object/public/test/Copy%20of%20Copy%20of%20Photo-%20und%20Videosystems%20since%202006.jpg';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { paddingHorizontal: space.xl, gap: space.xxl },
  head: { alignItems: 'center', gap: 8 },
  logo: { width: 72, height: 72, borderRadius: 18 },
  title: { ...font.largeTitle, color: '#fff' },
  sub: { ...font.subhead, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  // Auf iPad und Mac nicht über die ganze Breite: feste Höchstbreite, mittig.
  form: { gap: space.lg, borderRadius: 24, padding: space.xl, overflow: 'hidden', width: '100%', maxWidth: 440, alignSelf: 'center' },
  scrollMax: {},
});
