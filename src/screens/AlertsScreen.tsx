import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { routeForUrl } from '../lib/push';
import { tapHaptic } from '../components/haptics';
import { useWide } from '../components/layout';
import { Screen } from '../components/Screen';
import { Card, EmptyState, ErrorNote, ListCard, Row, Skeleton } from '../components/ui';
import { successHaptic } from '../components/haptics';
import { useNotifications, type FeedItem } from '../contexts/NotificationsContext';
import { timeAgo } from '../lib/format';
import { colors, font, TAP } from '../theme';
import { tr } from '../i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];
const KIND: Record<FeedItem['kind'], IconName> = {
  support: 'chatbubble-ellipses-outline',
  fault: 'alert-circle-outline',
  offline: 'cloud-offline-outline',
  paper: 'print-outline',
  code: 'qr-code-outline',
  coins: 'logo-euro',
  crm: 'megaphone-outline',
  revenue: 'trending-up-outline',
  contacts: 'mail-outline',
  recovered: 'checkmark-circle-outline',
  update: 'cloud-download-outline',
};
const TONE = {
  error: [colors.errSoft, colors.err],
  warning: [colors.warnSoft, colors.warn],
  info: [colors.infoSoft, colors.info],
  ok: [colors.okSoft, colors.ok],
} as const;

export function AlertsScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { items, unread, isRead, markAllRead, hide, loading, refreshing, error, reload } = useNotifications();
  const nav = useNavigation<any>();
  const wide = useWide();
  const open = (link: string) => {
    if (!link.startsWith('/')) return void Linking.openURL(link);
    const r = routeForUrl(link);
    if (wide) nav.navigate('Main', { screen: r.name, params: r.params });
    else if (['Overview', 'Revenue', 'Health', 'Photos'].includes(r.name)) nav.navigate('Tabs', { screen: r.name });
    else nav.navigate(r.name, r.params);
  };
  return (
    <Screen
      title={tr('Meldungen')}
      onBack={navigation.goBack}
      subtitle={unread > 0 ? tr('{0} neu', unread) : tr('Alles gelesen')}
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
            <Text style={{ ...font.callout, color: colors.brand }}>{tr('Alle gelesen')}</Text>
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
                icon={(it.icon as IconName | undefined) ?? KIND[it.kind]}
                iconBg={bg}
                iconColor={fg}
                title={it.title}
                titleLines={2}
                subtitle={`${timeAgo(it.createdAt)} · ${it.text}`}
                subtitleLines={3}
                onPress={it.link ? () => open(it.link!) : undefined}
                right={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {!isRead(it.id) ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand }} /> : null}
                    <Pressable
                      onPress={() => {
                        tapHaptic();
                        hide(it.id);
                      }}
                      hitSlop={10}
                      accessibilityLabel={tr('Meldung entfernen')}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.ink3} />
                    </Pressable>
                  </View>
                }
                last={i === items.length - 1}
              />
            );
          })}
        </ListCard>
      ) : !loading ? (
        <Card>
          <EmptyState icon="checkmark-circle-outline" title={tr('Alles in Ordnung')} text={tr('Keine Störungen, kein Papiermangel, keine offenen Antworten. Behobene Störungen verschwinden von selbst.')} />
        </Card>
      ) : null}
    </Screen>
  );
}
