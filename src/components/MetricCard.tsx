import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { useAppTheme } from '../contexts/ThemeContext';

interface MetricCardProps {
  label: string;
  value: string;
  tone?: 'data' | 'neutral';
  footnote?: string;
}

export function MetricCard({ label, value, tone = 'data', footnote }: MetricCardProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const isData = tone === 'data';

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.dot, isData ? styles.dotData : styles.dotNeutral]} />
      </View>

      <Text style={[styles.value, isData ? styles.valueData : styles.valueNeutral]}>{value}</Text>

      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </Card>
  );
}

const createStyles = (colors: { muted: string; dataBlue: string; text: string }) =>
  StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 150,
      gap: 6,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    label: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: '500',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 999,
    },
    dotData: {
      backgroundColor: colors.dataBlue,
    },
    dotNeutral: {
      backgroundColor: '#CBD5E1',
    },
    value: {
      fontSize: 24,
      fontWeight: '700',
    },
    valueData: {
      color: colors.text,
    },
    valueNeutral: {
      color: colors.text,
    },
    footnote: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '500',
    },
  });
