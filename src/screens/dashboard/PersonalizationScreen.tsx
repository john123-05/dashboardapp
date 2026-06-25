import { StyleSheet, Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';

export function PersonalizationScreen() {
  return (
    <Screen title="Personalization" subtitle="Campaign overlays and media customization">
      <Card>
        <Text style={styles.title}>Mobile Personalization Module</Text>
        <Text style={styles.body}>
          The web personalization page is advanced and relies on drag/drop canvas controls. This mobile repo is prepared for that module, but UI parity is intentionally staged.
        </Text>
      </Card>

      <Card>
        <Text style={styles.title}>What is already wired</Text>
        <Text style={styles.item}>- Expo + React Native app architecture</Text>
        <Text style={styles.item}>- Auth, organization, and park access flow</Text>
        <Text style={styles.item}>- Shared Supabase client and edge function invocation</Text>
      </Card>

      <Card>
        <Text style={styles.title}>Next step for this screen</Text>
        <Text style={styles.body}>
          Port `overlay_assets`, `overlay_campaigns`, and `resolve-overlays` into native upload and preview flows.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  item: {
    color: colors.text,
    fontSize: 14,
  },
});
