import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../contexts/LanguageContext';
import { colors } from '../theme/colors';

interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({ label = 'Loading dashboard...' }: LoadingScreenProps) {
  const { t } = useI18n();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.label}>{label === 'Loading dashboard...' ? t('common_loading_dashboard') : label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 10,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
  },
});
