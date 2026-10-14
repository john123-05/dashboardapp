import { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>Liftpictures</Text>
          <Text style={styles.sub}>Melde dich mit deinem Dashboard-Konto an.</Text>
        </View>
        <View style={styles.form}>
          <Field label="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="username" returnKeyType="next" onSubmitEditing={() => pw.current?.focus()} placeholder="name@firma.de" />
          <Field ref={pw} label="Passwort" value={password} onChangeText={setPassword} secure autoCapitalize="none" autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} placeholder="Passwort" />
          {error ? <ErrorNote text={error} /> : null}
          <Button title="Anmelden" onPress={submit} loading={busy} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.xl, gap: space.xxl },
  head: { alignItems: 'center', gap: 8 },
  logo: { width: 76, height: 76, borderRadius: 18 },
  title: { ...font.largeTitle, color: colors.ink },
  sub: { ...font.subhead, color: colors.ink2, textAlign: 'center' },
  form: { gap: space.lg, backgroundColor: colors.white, borderRadius: radius.lg, padding: space.lg },
});
