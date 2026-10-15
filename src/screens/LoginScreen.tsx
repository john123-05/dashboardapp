import { useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field } from '../components/Field';
import { Button, ErrorNote } from '../components/ui';
import { successHaptic } from '../components/haptics';
import { useAuth } from '../contexts/AuthContext';
import { colors, font, radius, space } from '../theme';

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'E-Mail oder Passwort stimmt nicht.';
  if (m.includes('email not confirmed')) return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
  if (m.includes('network') || m.includes('fetch')) return 'Keine Verbindung. Bitte Internet prüfen.';
  return message;
}

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pw = useRef<TextInput>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Bitte E-Mail und Passwort eingeben.');
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
      {/* Wie die Anmeldeseite im Web: Foto aus dem Park im Hintergrund, dunkel abgetönt. */}
      <ExpoImage source={{ uri: BG }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.55)' }]} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>Liftbase</Text>
          <Text style={styles.sub}>Dein Park. Immer dabei.</Text>
        </View>
        <BlurView intensity={60} tint="systemThickMaterial" style={styles.form}>
          <Text style={{ ...font.headline, color: colors.ink }}>Anmelden</Text>
          <Field label="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="username" returnKeyType="next" onSubmitEditing={() => pw.current?.focus()} placeholder="name@firma.de" />
          <Field ref={pw} label="Passwort" value={password} onChangeText={setPassword} secure autoCapitalize="none" autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} placeholder="Passwort" />
          {error ? <ErrorNote text={error} /> : null}
          <Button title="Anmelden" onPress={submit} loading={busy} />
          <Pressable onPress={() => void Linking.openURL('https://dashboard-liftpictures.com/login')} hitSlop={8} style={{ alignSelf: 'center', minHeight: 36, justifyContent: 'center' }}>
            <Text style={{ ...font.footnote, color: colors.ink2 }}>Passwort vergessen?</Text>
          </Pressable>
        </BlurView>
        <Pressable onPress={() => void Linking.openURL('https://dashboard-liftpictures.com/login')} style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ ...font.callout, color: '#fff' }}>
            Noch kein Zugang? <Text style={{ fontWeight: '700' }}>Demo anfragen</Text>
          </Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const BG = 'https://xcrxltiiovpoladpaewd.supabase.co/storage/v1/object/public/test/Copy%20of%20Copy%20of%20Photo-%20und%20Videosystems%20since%202006.jpg';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { paddingHorizontal: space.xl, gap: space.xxl },
  head: { alignItems: 'center', gap: 8 },
  logo: { width: 72, height: 72, borderRadius: 18 },
  title: { ...font.largeTitle, color: '#fff' },
  sub: { ...font.subhead, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  form: { gap: space.lg, borderRadius: 24, padding: space.xl, overflow: 'hidden' },
  scrollMax: {},
});
