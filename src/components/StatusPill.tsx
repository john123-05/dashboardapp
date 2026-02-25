import { StyleSheet, Text, View } from 'react-native';

interface StatusPillProps {
  value: string;
}

function palette(value: string) {
  const lowered = value.toLowerCase();

  if (['completed', 'active', 'resolved', 'operational'].includes(lowered)) {
    return { bg: '#DCFCE7', text: '#166534' };
  }

  if (
    ['pending', 'open', 'maintenance', 'warning', 'degraded', 'in_progress'].includes(lowered)
  ) {
    return { bg: '#FEF3C7', text: '#92400E' };
  }

  if (['critical', 'error', 'down', 'expired'].includes(lowered)) {
    return { bg: '#FEE2E2', text: '#991B1B' };
  }

  return { bg: '#E5E7EB', text: '#374151' };
}

export function StatusPill({ value }: StatusPillProps) {
  const colors = palette(value);

  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}> 
      <Text style={[styles.text, { color: colors.text }]}>{value.replace('_', ' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
