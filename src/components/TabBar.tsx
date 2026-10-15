import { Ionicons } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PAGES } from '../lib/pages';
import { font } from '../theme';
import { tapHaptic } from './haptics';
import { TAB_BAR_HEIGHT } from './Screen';

export const BAR_GREY = '#2b2b2b';

// Schwebende Tab-Leiste in Dunkelgrau, wie die untere Leiste des Web-Dashboards am Handy.
// Der letzte Knopf "Mehr" öffnet das Blatt von unten statt einer Seite.
export function TabBar({ state, navigation, onMore, moreOpen }: MaterialTopTabBarProps & { onMore: () => void; moreOpen: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
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
            <View style={[styles.marker, focused && styles.markerOn]} />
            <View style={[styles.iconWrap, focused && styles.iconWrapOn]}>
              <Ionicons name={(focused ? icon.replace('-outline', '') : icon) as any} size={22} color={focused ? '#fff' : 'rgba(255,255,255,0.55)'} />
            </View>
            <Text style={[styles.label, { color: focused ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: focused ? '700' : '500' }]} numberOfLines={1}>
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
        <View style={[styles.marker, moreOpen && styles.markerOn]} />
        <View style={[styles.iconWrap, moreOpen && styles.iconWrapOn]}>
          <Ionicons name="grid-outline" size={21} color={moreOpen ? '#fff' : 'rgba(255,255,255,0.55)'} />
        </View>
        <Text style={[styles.label, { color: moreOpen ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: moreOpen ? '700' : '500' }]}>Mehr</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Bis an den unteren Rand: die Leiste füllt auch den Bereich unter dem Home-Balken.
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: BAR_GREY,
    flexDirection: 'row',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: 2 },
  // Kleiner oranger Strich oben über dem aktiven Tab.
  marker: { position: 'absolute', top: 0, width: 22, height: 3, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: 'transparent' },
  markerOn: { backgroundColor: '#E8722A' },
  iconWrap: { width: 48, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapOn: { backgroundColor: 'rgba(255,255,255,0.14)' },
  label: { ...font.caption, fontSize: 10.5, fontWeight: '600' },
});
