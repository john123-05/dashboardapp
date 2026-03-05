import { useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/LanguageContext';
import { usePark } from '../../contexts/ParkContext';
import { invokeEdgeFunction } from '../../lib/edgeFunctions';
import type { ParkSelection } from '../../lib/types';
import type { AuthStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const APP_REVIEW_EMAIL = '123@gmail.com';
const APP_REVIEW_PASSWORD = '123456';
const APP_REVIEW_PARK_NAME = 'adventure land';

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { setPark } = usePark();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function tryAutoSelectReviewPark(emailInput: string, passwordInput: string) {
    const normalizedEmail = emailInput.trim().toLowerCase();
    const isReviewLogin =
      normalizedEmail === APP_REVIEW_EMAIL && passwordInput === APP_REVIEW_PASSWORD;

    if (!isReviewLogin) return;

    const result = await invokeEdgeFunction<{ parks: ParkSelection[] }>('external-parks');
    if (result.error) return;

    const parks = result.data?.parks ?? [];
    if (parks.length === 0) return;

    const preferredPark =
      parks.find((park) => park.name.trim().toLowerCase() === APP_REVIEW_PARK_NAME) ?? parks[0];

    await setPark(preferredPark.id, preferredPark.name);
  }

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    const emailInput = email.trim();
    const result = await signIn(emailInput, password);

    if (!result.error) {
      await tryAutoSelectReviewPark(emailInput, password);
    }

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <ImageBackground
      source={{
        uri: 'https://xcrxltiiovpoladpaewd.supabase.co/storage/v1/object/public/test/liftpicturesattraction.jpg',
      }}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <View style={styles.container}>
        <BlurView intensity={40} tint="light" style={styles.panel}>
          <Text style={styles.title}>Liftpictures Dashboard</Text>
          <Text style={styles.subtitle}>{t('auth_login_subtitle')}</Text>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>{t('common_email')}</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholder="you@company.com"
              placeholderTextColor="#475569"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>{t('common_password')}</Text>
            <TextInput
              secureTextEntry
              style={styles.input}
              placeholder={t('common_password')}
              placeholderTextColor="#475569"
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
              <Text style={styles.primaryButtonText}>{t('auth_sign_in')}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>{t('auth_create_operator_account')}</Text>
          </Pressable>
        </BlurView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  panel: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderColor: 'rgba(255, 255, 255, 0.58)',
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
    marginBottom: 4,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
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
