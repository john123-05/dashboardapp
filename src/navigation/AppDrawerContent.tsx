import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/LanguageContext';
import { usePark } from '../contexts/ParkContext';
import { useAppTheme } from '../contexts/ThemeContext';
import type { DashboardDrawerParamList } from './types';

interface DrawerItemConfig {
  route: keyof DashboardDrawerParamList;
  labelKey:
    | 'nav_overview'
    | 'nav_revenue'
    | 'nav_purchases'
    | 'nav_users'
    | 'nav_photos'
    | 'nav_leads'
    | 'nav_personalization'
    | 'nav_support'
    | 'nav_system_health'
    | 'nav_settings';
  icon: keyof typeof Ionicons.glyphMap;
}

export const drawerItems: DrawerItemConfig[] = [
  { route: 'Dashboard', labelKey: 'nav_overview', icon: 'grid-outline' },
  { route: 'Revenue', labelKey: 'nav_revenue', icon: 'cash-outline' },
  { route: 'Purchases', labelKey: 'nav_purchases', icon: 'cart-outline' },
  { route: 'Users', labelKey: 'nav_users', icon: 'people-outline' },
  { route: 'Photos', labelKey: 'nav_photos', icon: 'camera-outline' },
  { route: 'Leads', labelKey: 'nav_leads', icon: 'mail-outline' },
  { route: 'Personalization', labelKey: 'nav_personalization', icon: 'color-palette-outline' },
  { route: 'Support', labelKey: 'nav_support', icon: 'help-buoy-outline' },
  { route: 'SystemHealth', labelKey: 'nav_system_health', icon: 'pulse-outline' },
  { route: 'Settings', labelKey: 'nav_settings', icon: 'settings-outline' },
];

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { profile, currentOrg, signOut } = useAuth();
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { parkName, setPark } = usePark();
  const insets = useSafeAreaInsets();
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 18 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandWrap}>
          <View style={styles.logoFrame}>
            <Image
              source={require('../../assets/liftpictureslogo-alt.jpg')}
              style={styles.logoImage}
            />
          </View>
          <View style={styles.brandTextWrap}>
            <Text style={styles.brandTitle}>Liftpictures</Text>
            <Text style={styles.brandSub}>{parkName || currentOrg?.name || t('nav_overview')}</Text>
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
                  color={focused ? colors.primary : colors.navText}
                />
                <Text style={[styles.itemLabel, focused && styles.itemLabelFocused]}>
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </DrawerContentScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 22 }]}>
        <Text style={styles.userName}>{profile?.full_name || t('common_operator')}</Text>
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
              <Text style={styles.signOutText}>{t('common_sign_out')}</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: {
  navBg: string;
  navText: string;
  navCard: string;
  navTextActive: string;
  danger: string;
  border: string;
}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.navBg,
    },
    scrollContent: {
      paddingTop: 8,
      paddingHorizontal: 8,
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
    logoFrame: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
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
      gap: 4,
    },
    itemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 12,
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
      borderTopColor: colors.border,
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
