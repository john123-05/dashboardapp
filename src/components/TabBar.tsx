import { Ionicons } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PAGES } from '../lib/pages';
import { font } from '../theme';
import { tapHaptic } from './haptics';
import { TAB_BAR_GAP, TAB_BAR_HEIGHT } from './Screen';

export const BAR_GREY = '#2b2b2b';

// Schwebende Tab-Leiste in Dunkelgrau, wie die untere Leiste des Web-Dashboards am Handy.
// Der letzte Knopf "Mehr" öffnet das Blatt von unten statt einer Seite.
export function TabBar({ state, navigation, onMore, moreOpen }: MaterialTopTabBarProps & { onMore: () => void; moreOpen: boolean }) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom - 10, 0) + TAB_BAR_GAP;
  return (
    <View style={[styles.bar, { bottom }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index && !moreOpen;
        const page = PAGES.find((p) => p.route === route.name);
        const label = page?.short ?? page?.title ?? route.name;
        const icon = (page?.icon ?? 'ellipse-outline') as string;
        return (
          <Pressable
            key={route.key}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (state.index !== index && !event.defaultPrevented) {
                tapHaptic();
                navigation.navigate(route.name as never);
              }
            }}
          >
            <View style={[styles.iconWrap, focused && styles.iconWrapOn]}>
              <Ionicons name={(focused ? icon.replace('-outline', '') : icon) as any} size={21} color={focused ? '#fff' : 'rgba(255,255,255,0.58)'} />
            </View>
            <Text style={[styles.label, { color: focused ? '#fff' : 'rgba(255,255,255,0.58)' }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        style={styles.item}
        accessibilityRole="button"
        accessibilityLabel="Mehr"
        accessibilityState={{ expanded: moreOpen }}
        onPress={() => {
          tapHaptic();
          onMore();
        }}
      >
        <View style={[styles.iconWrap, moreOpen && styles.iconWrapOn]}>
          <Ionicons name="menu" size={22} color={moreOpen ? '#fff' : 'rgba(255,255,255,0.58)'} />
        </View>
        <Text style={[styles.label, { color: moreOpen ? '#fff' : 'rgba(255,255,255,0.58)' }]}>Mehr</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: TAB_BAR_HEIGHT,
    borderRadius: 22,
    backgroundColor: BAR_GREY,
    flexDirection: 'row',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1 },
  iconWrap: { width: 44, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapOn: { backgroundColor: 'rgba(255,255,255,0.14)' },
  label: { ...font.caption, fontSize: 10.5, fontWeight: '600' },
});
