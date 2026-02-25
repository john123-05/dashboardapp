import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';

interface ScreenProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  scroll?: boolean;
  showMenu?: boolean;
}

export function Screen({
  title,
  subtitle,
  right,
  scroll = true,
  showMenu = true,
  children,
}: ScreenProps) {
  const navigation = useNavigation();

  const body = (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {showMenu ? (
            <Pressable
              style={styles.menuButton}
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            >
              <Ionicons name="menu" size={19} color={colors.text} />
            </Pressable>
          ) : null}

          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {right ? <View>{right}</View> : null}
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {scroll ? <ScrollView contentContainerStyle={styles.scrollContent}>{body}</ScrollView> : body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  content: {
    gap: 14,
    paddingHorizontal: 14,
  },
  header: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
  },
});
