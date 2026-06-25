import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import type { DashboardDrawerParamList } from './types';
import { colors } from '../theme/colors';

interface DrawerItemConfig {
  route: keyof DashboardDrawerParamList;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const drawerItems: DrawerItemConfig[] = [
  { route: 'Dashboard', label: 'Overview', icon: 'grid-outline' },
  { route: 'Revenue', label: 'Revenue', icon: 'cash-outline' },
  { route: 'Purchases', label: 'Purchases', icon: 'cart-outline' },
  { route: 'Users', label: 'Users', icon: 'people-outline' },
  { route: 'Photos', label: 'Photos', icon: 'camera-outline' },
  { route: 'Leads', label: 'Leads', icon: 'mail-outline' },
  { route: 'Personalization', label: 'Personalization', icon: 'color-palette-outline' },
  { route: 'Support', label: 'Support', icon: 'help-buoy-outline' },
  { route: 'SystemHealth', label: 'System Health', icon: 'pulse-outline' },
  { route: 'Settings', label: 'Settings', icon: 'settings-outline' },
];

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { profile, currentOrg, signOut } = useAuth();
  const { parkName, setPark } = usePark();
  const [signingOut, setSigningOut] = useState(false);

  const activeRoute = props.state.routeNames[props.state.index] as keyof DashboardDrawerParamList;

  async function handleSignOut() {
    setSigningOut(true);
    await setPark(null, null);
    await signOut();
    setSigningOut(false);
  }

  return (
    <View style={styles.container}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandWrap}>
          <View style={styles.logoBubble}>
            <Text style={styles.logoText}>LP</Text>
          </View>
          <View style={styles.brandTextWrap}>
            <Text style={styles.brandTitle}>Liftpictures</Text>
            <Text style={styles.brandSub}>{parkName || currentOrg?.name || 'Dashboard'}</Text>
          </View>
        </View>

        <View style={styles.menuWrap}>
          {drawerItems.map((item) => {
            const focused = activeRoute === item.route;

            return (
              <Pressable
                key={item.route}
                style={[styles.itemButton, focused && styles.itemButtonFocused]}
                onPress={() => props.navigation.navigate(item.route)}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={focused ? colors.navTextActive : colors.navText}
                />
                <Text style={[styles.itemLabel, focused && styles.itemLabelFocused]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <Text style={styles.userName}>{profile?.full_name || 'Operator'}</Text>
        <Text style={styles.userSub}>{profile?.email || ''}</Text>

        <Pressable
          style={[styles.signOutButton, signingOut && styles.signOutButtonDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navBg,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 18,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  logoBubble: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#1F2937',
    fontWeight: '800',
    fontSize: 12,
  },
  brandTextWrap: {
    flex: 1,
    gap: 1,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  brandSub: {
    color: colors.navText,
    fontSize: 12,
  },
  menuWrap: {
    gap: 6,
  },
  itemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  itemButtonFocused: {
    backgroundColor: colors.navCard,
  },
  itemLabel: {
    color: colors.navText,
    fontSize: 15,
    fontWeight: '500',
  },
  itemLabelFocused: {
    color: colors.navTextActive,
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#40506A',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 4,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  userSub: {
    color: colors.navText,
    fontSize: 12,
    marginBottom: 8,
  },
  signOutButton: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  signOutButtonDisabled: {
    opacity: 0.7,
  },
  signOutText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
