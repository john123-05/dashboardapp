import { StyleSheet, Text } from 'react-native';
import { Card } from './Card';
import { colors } from '../theme/colors';

interface MetricCardProps {
  label: string;
  value: string;
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 160,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  value: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
});
