import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/LanguageContext';
import { useAppTheme } from '../contexts/ThemeContext';
import { useWalkthrough } from '../contexts/WalkthroughContext';

const STEP_KEYS = [
  {
    title: 'walkthrough_step_1_title',
    body: 'walkthrough_step_1_body',
  },
  {
    title: 'walkthrough_step_2_title',
    body: 'walkthrough_step_2_body',
  },
  {
    title: 'walkthrough_step_3_title',
    body: 'walkthrough_step_3_body',
  },
  {
    title: 'walkthrough_step_4_title',
    body: 'walkthrough_step_4_body',
  },
  {
    title: 'walkthrough_step_5_title',
    body: 'walkthrough_step_5_body',
  },
  {
    title: 'walkthrough_step_6_title',
    body: 'walkthrough_step_6_body',
  },
] as const;

export function WalkthroughOverlay() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const walkthrough = useWalkthrough();

  if (!walkthrough.visible) return null;

  const step = STEP_KEYS[walkthrough.stepIndex];
  const last = walkthrough.stepIndex === walkthrough.stepCount - 1;
  const firstName = profile?.full_name?.split(' ')[0] ?? t('common_operator');
  const title =
    walkthrough.stepIndex === 0 ? t('walkthrough_welcome_title', { name: firstName }) : t(step.title);
  const highlight = walkthrough.activeAnchorLayout
    ? {
        left: Math.max(walkthrough.activeAnchorLayout.x - 6, 8),
        top: Math.max(walkthrough.activeAnchorLayout.y - 6, 8),
        width: walkthrough.activeAnchorLayout.width + 12,
        height: walkthrough.activeAnchorLayout.height + 12,
      }
    : null;

  return (
    <Modal transparent animationType="fade" visible={walkthrough.visible}>
      <View style={styles.container}>
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={styles.scrim} />
        {highlight ? <View pointerEvents="none" style={[styles.spotlight, highlight]} /> : null}

        <View style={styles.card}>
          <Text style={styles.stepCounter}>
            {t('walkthrough_step_counter', {
              current: walkthrough.stepIndex + 1,
              total: walkthrough.stepCount,
            })}
          </Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{t(step.body)}</Text>

          <View style={styles.footer}>
            <Pressable style={styles.ghostButton} onPress={() => walkthrough.close(true)}>
              <Text style={styles.ghostButtonText}>{t('walkthrough_close')}</Text>
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.ghostButton, walkthrough.stepIndex === 0 && styles.disabledButton]}
                disabled={walkthrough.stepIndex === 0}
                onPress={walkthrough.back}
              >
                <Text style={styles.ghostButtonText}>{t('walkthrough_back')}</Text>
              </Pressable>

              <Pressable style={styles.primaryButton} onPress={walkthrough.next}>
                <Text style={styles.primaryButtonText}>
                  {last ? t('walkthrough_finish') : t('walkthrough_next')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(10, 14, 24, 0.45)',
    },
    card: {
      marginHorizontal: 14,
      marginBottom: 22,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      padding: 16,
      gap: 10,
    },
    spotlight: {
      position: 'absolute',
      borderRadius: 14,
      borderWidth: 2,
      borderColor: '#6CAEFF',
      backgroundColor: 'rgba(255,255,255,0.08)',
      shadowColor: '#79B4FF',
      shadowOpacity: 0.45,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
      elevation: 12,
    },
    stepCounter: {
      color: colors.dataBlue,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '800',
      lineHeight: 34,
    },
    body: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 22,
    },
    footer: {
      marginTop: 4,
      gap: 10,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'flex-end',
    },
    ghostButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    ghostButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    disabledButton: {
      opacity: 0.4,
    },
    primaryButton: {
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });
