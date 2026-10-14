import { Ionicons } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../contexts/NotificationsContext';
import { colors, font } from '../theme';
import { tapHaptic } from './haptics';
import { TAB_BAR_HEIGHT } from './Screen';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const TAB_META: Record<string, { label: string; icon: IconName; iconOn: IconName }> = {
  Overview: { label: 'Übersicht', icon: 'home-outline', iconOn: 'home' },
  Revenue: { label: 'Umsatz', icon: 'stats-chart-outline', iconOn: 'stats-chart' },
  Machines: { label: 'Anlagen', icon: 'hardware-chip-outline', iconOn: 'hardware-chip' },
  Alerts: { label: 'Meldungen', icon: 'notifications-outline', iconOn: 'notifications' },
  More: { label: 'Mehr', icon: 'ellipsis-horizontal-circle-outline', iconOn: 'ellipsis-horizontal-circle' },
};

// Durchsichtige Tab-Leiste unten: Inhalt scheint unscharf durch, sitzt über dem Home-Balken.
export function TabBar({ state, navigation }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const { unread } = useNotifications();
  return (
    <View style={[styles.wrap, { height: TAB_BAR_HEIGHT + insets.bottom }]}>
      <BlurView intensity={80} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
      <View style={styles.hairline} />
      <View style={[styles.row, { paddingBottom: insets.bottom }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TAB_META[route.name] ?? { label: route.name, icon: 'ellipse-outline' as IconName, iconOn: 'ellipse' as IconName };
          const badge = route.name === 'Alerts' && unread > 0 ? (unread > 9 ? '9+' : String(unread)) : null;
          return (
            <Pressable
              key={route.key}
              style={styles.item}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  tapHaptic();
                  navigation.navigate(route.name as never);
                }
              }}
            >
              <View>
                <Ionicons name={focused ? meta.iconOn : meta.icon} size={25} color={focused ? colors.brand : colors.ink3} />
                {badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, { color: focused ? colors.brand : colors.ink3 }]} numberOfLines={1}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  hairline: { position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  row: { flex: 1, flexDirection: 'row' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 49 },
  label: { ...font.caption, fontSize: 10.5, fontWeight: '600' },
  badge: { position: 'absolute', top: -4, right: -10, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.err, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: colors.white },
  badgeText: { color: colors.white, fontSize: 10.5, fontWeight: '800' },
});
