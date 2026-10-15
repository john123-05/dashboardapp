import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card, EmptyState, ErrorNote, ListCard, Row, Skeleton } from '../components/ui';
import { successHaptic } from '../components/haptics';
import { useNotifications, type FeedItem } from '../contexts/NotificationsContext';
import { timeAgo } from '../lib/format';
import { colors, font, TAP } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const KIND: Record<FeedItem['kind'], IconName> = {
  support: 'chatbubble-ellipses-outline',
  fault: 'alert-circle-outline',
  offline: 'cloud-offline-outline',
  paper: 'print-outline',
  code: 'qr-code-outline',
  coins: 'logo-euro',
};
const TONE = {
  error: [colors.errSoft, colors.err],
  warning: [colors.warnSoft, colors.warn],
  info: [colors.infoSoft, colors.info],
} as const;

export function AlertsScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { items, unread, isRead, markAllRead, loading, refreshing, error, reload } = useNotifications();
  return (
    <Screen
      title="Meldungen"
      onBack={navigation.goBack}
      subtitle={unread > 0 ? `${unread} neu` : 'Alles gelesen'}
      refreshing={refreshing}
      onRefresh={reload}
      right={
        unread > 0 ? (
          <Pressable
            onPress={() => {
              successHaptic();
              markAllRead();
            }}
            hitSlop={8}
            style={{ minHeight: TAP, justifyContent: 'center' }}
            accessibilityRole="button"
          >
            <Text style={{ ...font.callout, color: colors.brand }}>Alle gelesen</Text>
          </Pressable>
        ) : null
      }
    >
      {error && items.length === 0 ? <ErrorNote text={error} onRetry={reload} /> : null}
      {loading && items.length === 0 ? (
        <Card>
          <Skeleton height={18} width="70%" />
          <Skeleton height={14} width="90%" style={{ marginTop: 10 }} />
        </Card>
      ) : null}
      {items.length > 0 ? (
        <ListCard>
          {items.map((it, i) => {
            const [bg, fg] = TONE[it.severity];
            return (
              <Row
                key={it.id}
                icon={KIND[it.kind]}
                iconBg={bg}
                iconColor={fg}
                title={it.title}
                titleLines={2}
                subtitle={`${timeAgo(it.createdAt)} · ${it.text}`}
                subtitleLines={3}
                right={!isRead(it.id) ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand }} /> : null}
                last={i === items.length - 1}
              />
            );
          })}
        </ListCard>
      ) : !loading ? (
        <Card>
          <EmptyState icon="checkmark-circle-outline" title="Alles in Ordnung" text="Keine Störungen, kein Papiermangel, keine offenen Antworten." />
        </Card>
      ) : null}
    </Screen>
  );
}
