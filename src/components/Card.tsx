import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useAppTheme } from '../contexts/ThemeContext';

interface CardProps extends PropsWithChildren {
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return <View style={[styles.card, style]}>{children}</View>;
}

const createStyles = (colors: { card: string; border: string }) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
    },
  });
