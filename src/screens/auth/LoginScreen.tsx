import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import type { AuthStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>Liftpictures Dashboard</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholder="you@company.com"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            secureTextEntry
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          disabled={submitting}
          onPress={handleSignIn}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign In</Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Create a new operator account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.background,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  link: {
    color: colors.primary,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
});
