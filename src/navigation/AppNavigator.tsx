import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { DefaultTheme, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, Text, View } from 'react-native';
import { TabBar } from '../components/TabBar';
import { Button } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { NotificationsProvider } from '../contexts/NotificationsContext';
import { usePark } from '../contexts/ParkContext';
import { PREVIEW } from '../lib/preview';
import { canSee } from '../lib/permissions';
import { AlertsScreen } from '../screens/AlertsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MachinesScreen } from '../screens/MachinesScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { OverviewScreen } from '../screens/OverviewScreen';
import { ParkAccessScreen } from '../screens/ParkAccessScreen';
import { PurchasesScreen } from '../screens/PurchasesScreen';
import { RevenueScreen } from '../screens/RevenueScreen';
import { WebPageScreen } from '../screens/WebPageScreen';
import { colors, font } from '../theme';

const Root = createNativeStackNavigator();
const navRef = createNavigationContainerRef<any>();

// Nur Vorschau (EXPO_PUBLIC_PREVIEW=1 und EXPO_PUBLIC_PREVIEW_TOUR=1): wechselt von selbst durch alle Seiten,
// damit sie fotografiert werden können. In echten Builds nie aktiv.
function usePreviewTour() {
  useEffect(() => {
    if (!PREVIEW || process.env.EXPO_PUBLIC_PREVIEW_TOUR !== '1') return;
    const steps: Array<() => void> = [
      () => navRef.navigate('Tabs', { screen: 'Overview' }),
      () => navRef.navigate('Tabs', { screen: 'Revenue' }),
      () => navRef.navigate('Tabs', { screen: 'Machines' }),
      () => navRef.navigate('Tabs', { screen: 'Alerts' }),
      () => navRef.navigate('Tabs', { screen: 'More' }),
      () => navRef.navigate('Purchases'),
    ];
    let i = 0;
    const timer = setInterval(() => {
      if (i >= steps.length) return clearInterval(timer);
      steps[i++]();
    }, 9000);
    return () => clearInterval(timer);
  }, []);
}
const Tabs = createMaterialTopTabNavigator();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.brand } };

// Tab-Leiste: welche Tabs erscheinen, entscheidet die Seitenauswahl des Nutzers (aus dem CRM).
// Zwischen den Tabs lässt sich seitlich wischen.
function MainTabs() {
  const { isOwner, isStaff, allowedPages } = useAuth();
  const viewer = { isOwner, isStaff, allowedPages };
  return (
    <Tabs.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ swipeEnabled: true, lazy: true, lazyPreloadDistance: 1, animationEnabled: true }}
      style={{ backgroundColor: colors.bg }}
    >
      {canSee('overview', viewer) ? <Tabs.Screen name="Overview" component={OverviewScreen} /> : null}
      {canSee('revenue', viewer) ? <Tabs.Screen name="Revenue" component={RevenueScreen} /> : null}
      {canSee('health', viewer) ? <Tabs.Screen name="Machines" component={MachinesScreen} /> : null}
      {canSee('health', viewer) || canSee('tickets', viewer) ? <Tabs.Screen name="Alerts" component={AlertsScreen} /> : null}
      <Tabs.Screen name="More" component={MoreScreen} />
    </Tabs.Navigator>
  );
}

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

function NoAccess() {
  const { signOut, email } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 32, gap: 10 }}>
      <Text style={{ ...font.title, color: colors.ink, textAlign: 'center' }}>Kein Zugang</Text>
      <Text style={{ ...font.subhead, color: colors.ink2, textAlign: 'center' }}>
        Das Konto {email ?? ''} ist noch keiner Organisation zugeordnet. Bitte wende dich an Liftpictures.
      </Text>
      <View style={{ width: 220, marginTop: 8 }}>
        <Button title="Abmelden" kind="plain" onPress={() => void signOut()} />
      </View>
    </View>
  );
}

const linking: any = {
  prefixes: ['dashboardapp://'],
  config: {
    screens: {
      Tabs: { screens: { Overview: 'overview', Revenue: 'revenue', Machines: 'machines', Alerts: 'alerts', More: 'more' } },
      Purchases: 'purchases',
      Park: 'park',
    },
  },
};

export function AppNavigator() {
  usePreviewTour();
  const auth = useAuth();
  const park = usePark();

  if (!PREVIEW && (auth.loading || park.loading)) return <Splash />;
  if (!PREVIEW && !auth.user) return <LoginScreen />;
  if (!PREVIEW && !auth.hasOrg) return <NoAccess />;
  if (!PREVIEW && !park.parkId) return <ParkAccessScreen />;

  return (
    <NotificationsProvider>
      <NavigationContainer ref={navRef} theme={theme} linking={linking}>
        <Root.Navigator screenOptions={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true, contentStyle: { backgroundColor: colors.bg } }}>
          <Root.Screen name="Tabs" component={MainTabs} />
          <Root.Screen name="Purchases" component={PurchasesScreen as any} />
          <Root.Screen name="Web" component={WebPageScreen as any} />
          <Root.Screen name="Park" component={ParkSwitch} />
        </Root.Navigator>
      </NavigationContainer>
    </NotificationsProvider>
  );
}

function ParkSwitch({ navigation }: { navigation: { goBack: () => void } }) {
  return <ParkAccessScreen onClose={navigation.goBack} />;
}
