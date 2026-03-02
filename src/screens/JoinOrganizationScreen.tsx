import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/LanguageContext';
import { colors } from '../theme/colors';

export function JoinOrganizationScreen() {
  const { joinDemoOrg } = useAuth();
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoinDemo() {
    setError(null);
    setSubmitting(true);

    try {
      await joinDemoOrg();
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : t('join_demo_error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>{t('join_welcome_title')}</Text>
        <Text style={styles.body}>{t('join_welcome_body')}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          disabled={submitting}
          onPress={handleJoinDemo}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{t('join_demo_button')}</Text>
          )}
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
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
